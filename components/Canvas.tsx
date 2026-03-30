"use client";

import Link from "next/link";
import {
  useReducer,
  useCallback,
  useRef,
  useEffect,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type {
  CanvasDocument,
  CanvasNode,
  Tool,
  NodeProps,
  ActiveStyle,
} from "@/lib/canvas/types";
import {
  canvasReducer,
  createInitialState,
  type CanvasAction,
} from "@/lib/canvas/reducer";
import {
  screenToWorld,
  pointInNode,
  clampZoom,
  getSelectionBounds,
  normalizeRect,
  aabbIntersects,
  getNodeBounds,
  hitTestResizeHandles,
  type ResizeHandle,
} from "@/lib/canvas/geometry";
import { useAutosave } from "@/lib/canvas/hooks";

import Background from "./canvas/Background";
import SelectionOverlay from "./canvas/SelectionOverlay";
import Toolbar from "./canvas/Toolbar";
import ZoomControls from "./canvas/ZoomControls";
import SaveIndicator from "./canvas/SaveIndicator";
import StylePanel from "./canvas/StylePanel";
import TextNode from "./canvas/nodes/TextNode";
import StickyNode from "./canvas/nodes/StickyNode";
import RectNode from "./canvas/nodes/RectNode";
import EllipseNode from "./canvas/nodes/EllipseNode";
import FreehandNode from "./canvas/nodes/FreehandNode";
import ArrowNode, { arrowheadPath } from "./canvas/nodes/ArrowNode";
import ImageNode from "./canvas/nodes/ImageNode";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CanvasProps {
  projectId: string;
  initialSnapshot: CanvasDocument | null;
}

// ---------------------------------------------------------------------------
// Interaction modes during pointer drag
// ---------------------------------------------------------------------------

type DragMode =
  | { kind: "none" }
  | { kind: "pan"; startX: number; startY: number; startCamX: number; startCamY: number }
  | { kind: "move"; startX: number; startY: number; nodeIds: string[] }
  | { kind: "marquee"; startWorldX: number; startWorldY: number }
  | { kind: "create-text"; worldX: number; worldY: number }
  | {
      kind: "resize";
      handle: ResizeHandle;
      nodeId: string;
      origX: number;
      origY: number;
      origW: number;
      origH: number;
      startWorldX: number;
      startWorldY: number;
    }
  | { kind: "draw"; nodeId: string }
  | { kind: "create-shape"; startWorldX: number; startWorldY: number; nodeId: string | null };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Canvas({ projectId, initialSnapshot }: CanvasProps) {
  const [state, dispatch] = useReducer(
    canvasReducer,
    initialSnapshot,
    (snap) => createInitialState(snap)
  );
  const [stylePreviewNonce, setStylePreviewNonce] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imageClickPosRef = useRef<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [spaceDown, setSpaceDown] = useState(false);
  const [arrowPreview, setArrowPreview] = useState<{
    x1: number; y1: number; x2: number; y2: number;
  } | null>(null);
  const spaceDownRef = useRef(false);
  // Mutable interaction state — grouped in a single object to avoid
  // react-hooks/immutability warnings on individual refs captured by callbacks.
  const interaction = useRef({
    dragMode: { kind: "none" } as DragMode,
    hasMoved: false,
    undoPushed: false,
  });
  const stateRef = useRef(state);

  // Keep refs in sync — must be in effect, not render
  useEffect(() => {
    stateRef.current = state;
  });
  useEffect(() => {
    spaceDownRef.current = spaceDown;
  }, [spaceDown]);

  // Autosave
  const saveStatus = useAutosave(projectId, state.document);

  // ---------------------------------------------------------------------------
  // Resize observer
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ width, height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ---------------------------------------------------------------------------
  // Zoom controls (declared before keyboard effect so they're in scope)
  // ---------------------------------------------------------------------------
  const handleZoomIn = useCallback(() => {
    const cam = stateRef.current.document.camera;
    const newZoom = clampZoom(cam.zoom * 1.25);
    const cx = size.width / 2;
    const cy = size.height / 2;
    const ratio = newZoom / cam.zoom;
    dispatch({
      type: "SET_CAMERA",
      camera: {
        x: cx - ratio * (cx - cam.x),
        y: cy - ratio * (cy - cam.y),
        zoom: newZoom,
      },
    });
  }, [size]);

  const handleZoomOut = useCallback(() => {
    const cam = stateRef.current.document.camera;
    const newZoom = clampZoom(cam.zoom / 1.25);
    const cx = size.width / 2;
    const cy = size.height / 2;
    const ratio = newZoom / cam.zoom;
    dispatch({
      type: "SET_CAMERA",
      camera: {
        x: cx - ratio * (cx - cam.x),
        y: cy - ratio * (cy - cam.y),
        zoom: newZoom,
      },
    });
  }, [size]);

  const handleFitContent = useCallback(() => {
    const s = stateRef.current;
    const allNodes = Object.values(s.document.nodes);
    if (allNodes.length === 0) {
      dispatch({
        type: "SET_CAMERA",
        camera: { x: size.width / 2, y: size.height / 2, zoom: 1 },
      });
      return;
    }
    const bounds = getSelectionBounds(allNodes);
    if (!bounds) return;

    const padding = 80;
    const bw = bounds.maxX - bounds.minX;
    const bh = bounds.maxY - bounds.minY;
    const zoom = clampZoom(
      Math.min(
        (size.width - padding * 2) / Math.max(bw, 1),
        (size.height - padding * 2) / Math.max(bh, 1)
      )
    );
    dispatch({
      type: "SET_CAMERA",
      camera: {
        x: size.width / 2 - (bounds.minX + bw / 2) * zoom,
        y: size.height / 2 - (bounds.minY + bh / 2) * zoom,
        zoom,
      },
    });
  }, [size]);

  // ---------------------------------------------------------------------------
  // Keyboard
  // ---------------------------------------------------------------------------
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === " ") {
        setSpaceDown(true);
        return;
      }

      // Don't capture keyboard shortcuts while editing text
      if (stateRef.current.editingNodeId) {
        if (e.key === "Escape") {
          dispatch({ type: "SET_EDITING", nodeId: null });
          e.preventDefault();
        }
        return;
      }

      const meta = e.metaKey || e.ctrlKey;

      if (e.key === "Escape") {
        dispatch({ type: "CLEAR_SELECTION" });
      } else if (e.key === "Delete" || e.key === "Backspace") {
        dispatch({ type: "DELETE_SELECTED" });
        e.preventDefault();
      } else if (meta && e.key === "a") {
        dispatch({ type: "SELECT_ALL" });
        e.preventDefault();
      } else if (meta && e.shiftKey && e.key === "z") {
        dispatch({ type: "REDO" });
        e.preventDefault();
      } else if (meta && e.key === "z") {
        dispatch({ type: "UNDO" });
        e.preventDefault();
      } else if (meta && e.key === "0") {
        handleFitContent();
        e.preventDefault();
      } else if (e.key === "v" || e.key === "V") {
        dispatch({ type: "SET_TOOL", tool: "select" });
      } else if (e.key === "t" || e.key === "T") {
        dispatch({ type: "SET_TOOL", tool: "text" });
      } else if (e.key === "s" || e.key === "S") {
        dispatch({ type: "SET_TOOL", tool: "sticky" });
      } else if (e.key === "r" || e.key === "R") {
        dispatch({ type: "SET_TOOL", tool: "rect" });
      } else if (e.key === "o" || e.key === "O") {
        dispatch({ type: "SET_TOOL", tool: "ellipse" });
      } else if (e.key === "d" || e.key === "D") {
        dispatch({ type: "SET_TOOL", tool: "freehand" });
      } else if (e.key === "a" || e.key === "A") {
        dispatch({ type: "SET_TOOL", tool: "arrow" });
      } else if (e.key === "i" || e.key === "I") {
        dispatch({ type: "SET_TOOL", tool: "image" });
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.key === " ") setSpaceDown(false);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [handleFitContent]);

  // ---------------------------------------------------------------------------
  // Wheel zoom
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const s = stateRef.current;
      const cam = s.document.camera;

      if (e.ctrlKey || e.metaKey) {
        // Pinch-to-zoom or ctrl+wheel
        const delta = -e.deltaY * 0.01;
        const newZoom = clampZoom(cam.zoom * (1 + delta));
        const ratio = newZoom / cam.zoom;
        const mx = e.clientX;
        const my = e.clientY;
        dispatch({
          type: "SET_CAMERA",
          camera: {
            x: mx - ratio * (mx - cam.x),
            y: my - ratio * (my - cam.y),
            zoom: newZoom,
          },
        });
      } else {
        // Pan
        dispatch({
          type: "SET_CAMERA",
          camera: {
            x: cam.x - e.deltaX,
            y: cam.y - e.deltaY,
            zoom: cam.zoom,
          },
        });
      }
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ---------------------------------------------------------------------------
  // Tool change
  // ---------------------------------------------------------------------------
  const handleToolChange = useCallback((tool: Tool) => {
    dispatch({ type: "SET_TOOL", tool });
  }, []);

  // ---------------------------------------------------------------------------
  // Pointer handlers
  // ---------------------------------------------------------------------------

  const hitTestNode = useCallback(
    (screenX: number, screenY: number): CanvasNode | null => {
      const s = stateRef.current;
      const world = screenToWorld(screenX, screenY, s.document.camera);
      // Iterate in reverse z-order (top node wins)
      for (let i = s.document.nodeOrder.length - 1; i >= 0; i--) {
        const id = s.document.nodeOrder[i];
        const node = s.document.nodes[id];
        if (node && pointInNode(world.x, world.y, node)) return node;
      }
      return null;
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const s = stateRef.current;
      const cam = s.document.camera;
      const world = screenToWorld(e.clientX, e.clientY, cam);

      // Pan mode: space+click or middle button
      if (spaceDownRef.current || e.button === 1) {
        interaction.current.dragMode = {
          kind: "pan",
          startX: e.clientX,
          startY: e.clientY,
          startCamX: cam.x,
          startCamY: cam.y,
        };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }

      // Right-click: ignore
      if (e.button !== 0) return;

      const tool = s.activeTool;

      if (tool === "image") {
        imageClickPosRef.current = { x: world.x, y: world.y };
        imageInputRef.current?.click();
        return;
      }

      if (tool === "text") {
        interaction.current.dragMode = {
          kind: "create-text",
          worldX: world.x,
          worldY: world.y,
        };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }

      if (tool === "freehand") {
        // Start freehand drawing
        const ast = s.activeStyle;
        const action: CanvasAction = {
          type: "CREATE_NODE",
          nodeType: "freehand",
          x: world.x,
          y: world.y,
          width: 0,
          height: 0,
          props: {
            type: "freehand",
            points: [[0, 0]],
            stroke: ast.color,
            strokeWidth: ast.strokeWidth,
            strokeStyle: ast.strokeStyle,
          },
        };
        dispatch(action);
        // After dispatch, the newest node ID is the last in nodeOrder
        // We'll grab it on the next move — store draw mode
        setTimeout(() => {
          const latest = stateRef.current;
          const lastId = latest.document.nodeOrder[latest.document.nodeOrder.length - 1];
          if (lastId) {
            interaction.current.dragMode = { kind: "draw", nodeId: lastId };
          }
        }, 0);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }

      if (tool !== "select") {
        // Shape/text/sticky creation tools — start drag to define size
        interaction.current.dragMode = {
          kind: "create-shape",
          startWorldX: world.x,
          startWorldY: world.y,
          nodeId: null,
        };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }

      // Select tool: check resize handles first (single selected node)
      if (s.selection.nodeIds.size === 1) {
        const selectedId = [...s.selection.nodeIds][0];
        const selectedNode = s.document.nodes[selectedId];
        if (selectedNode) {
          const handle = hitTestResizeHandles(
            e.clientX,
            e.clientY,
            selectedNode,
            cam
          );
          if (handle) {
            interaction.current.hasMoved = false;
            interaction.current.undoPushed = false;
            interaction.current.dragMode = {
              kind: "resize",
              handle,
              nodeId: selectedId,
              origX: selectedNode.x,
              origY: selectedNode.y,
              origW: selectedNode.width,
              origH: selectedNode.height,
              startWorldX: world.x,
              startWorldY: world.y,
            };
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            return;
          }
        }
      }

      // Check if clicking on a node
      const hitNode = hitTestNode(e.clientX, e.clientY);

      if (hitNode) {
        const isAlreadySelected = s.selection.nodeIds.has(hitNode.id);
        const metaKey = e.metaKey || e.ctrlKey;

        if (!isAlreadySelected && !metaKey) {
          dispatch({ type: "SELECT_NODES", nodeIds: [hitNode.id] });
        } else if (metaKey) {
          dispatch({
            type: "SELECT_NODES",
            nodeIds: [hitNode.id],
            append: true,
          });
        }

        // Start move drag
        interaction.current.hasMoved = false;
        interaction.current.undoPushed = false;
        interaction.current.dragMode = {
          kind: "move",
          startX: e.clientX,
          startY: e.clientY,
          nodeIds: isAlreadySelected
            ? [...s.selection.nodeIds]
            : [hitNode.id],
        };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }

      // Clicked empty area — start marquee select
      dispatch({ type: "CLEAR_SELECTION" });
      interaction.current.dragMode = {
        kind: "marquee",
        startWorldX: world.x,
        startWorldY: world.y,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [hitTestNode]
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const mode = interaction.current.dragMode;
      const s = stateRef.current;
      const cam = s.document.camera;

      if (mode.kind === "pan") {
        const dx = e.clientX - mode.startX;
        const dy = e.clientY - mode.startY;
        dispatch({
          type: "SET_CAMERA",
          camera: {
            x: mode.startCamX + dx,
            y: mode.startCamY + dy,
            zoom: cam.zoom,
          },
        });
        return;
      }

      if (mode.kind === "move") {
        const dx = (e.clientX - mode.startX) / cam.zoom;
        const dy = (e.clientY - mode.startY) / cam.zoom;
        if (!interaction.current.hasMoved && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) {
          interaction.current.hasMoved = true;
          // Push undo only on first actual movement
          if (!interaction.current.undoPushed) {
            // We can't push undo from here directly via reducer cleanly, so
            // we rely on the fact that MOVE_NODES doesn't push undo. We'll
            // push undo in pointerUp if the node was actually moved.
            interaction.current.undoPushed = true;
          }
        }
        dispatch({
          type: "MOVE_NODES",
          nodeIds: mode.nodeIds,
          dx: (e.clientX - mode.startX) / cam.zoom,
          dy: (e.clientY - mode.startY) / cam.zoom,
        });
        mode.startX = e.clientX;
        mode.startY = e.clientY;
        return;
      }

      if (mode.kind === "resize") {
        const world = screenToWorld(e.clientX, e.clientY, cam);
        const dx = world.x - mode.startWorldX;
        const dy = world.y - mode.startWorldY;

        let newX = mode.origX;
        let newY = mode.origY;
        let newW = mode.origW;
        let newH = mode.origH;

        if (mode.handle === "bottom-right") {
          newW = Math.max(20, mode.origW + dx);
          newH = Math.max(20, mode.origH + dy);
        } else if (mode.handle === "bottom-left") {
          newX = mode.origX + dx;
          newW = Math.max(20, mode.origW - dx);
          newH = Math.max(20, mode.origH + dy);
        } else if (mode.handle === "top-right") {
          newY = mode.origY + dy;
          newW = Math.max(20, mode.origW + dx);
          newH = Math.max(20, mode.origH - dy);
        } else if (mode.handle === "top-left") {
          newX = mode.origX + dx;
          newY = mode.origY + dy;
          newW = Math.max(20, mode.origW - dx);
          newH = Math.max(20, mode.origH - dy);
        }

        dispatch({
          type: "RESIZE_NODE",
          nodeId: mode.nodeId,
          x: newX,
          y: newY,
          width: newW,
          height: newH,
        });
        return;
      }

      if (mode.kind === "marquee") {
        const world = screenToWorld(e.clientX, e.clientY, cam);
        const marqueeWorld = {
          x: mode.startWorldX,
          y: mode.startWorldY,
          width: world.x - mode.startWorldX,
          height: world.y - mode.startWorldY,
        };
        dispatch({ type: "SET_MARQUEE", marquee: marqueeWorld });

        // Live-select nodes within marquee
        const marqueeBounds = normalizeRect(
          marqueeWorld.x,
          marqueeWorld.y,
          marqueeWorld.width,
          marqueeWorld.height
        );
        const hitIds = s.document.nodeOrder.filter((id) => {
          const node = s.document.nodes[id];
          return node && aabbIntersects(marqueeBounds, getNodeBounds(node));
        });
        dispatch({ type: "SELECT_NODES", nodeIds: hitIds });
        return;
      }

      if (mode.kind === "draw") {
        const node = s.document.nodes[mode.nodeId];
        if (!node || node.props.type !== "freehand") return;
        const world = screenToWorld(e.clientX, e.clientY, cam);
        const relX = world.x - node.x;
        const relY = world.y - node.y;
        const newPoints: [number, number][] = [
          ...node.props.points,
          [relX, relY],
        ];
        // Update bounding box
        let minX = 0, minY = 0, maxX = 0, maxY = 0;
        for (const [px, py] of newPoints) {
          if (px < minX) minX = px;
          if (py < minY) minY = py;
          if (px > maxX) maxX = px;
          if (py > maxY) maxY = py;
        }
        dispatch({
          type: "RESIZE_NODE",
          nodeId: mode.nodeId,
          x: node.x,
          y: node.y,
          width: maxX - minX || 1,
          height: maxY - minY || 1,
        });
        dispatch({
          type: "UPDATE_NODE_PROPS",
          nodeId: mode.nodeId,
          props: { points: newPoints } as Partial<NodeProps>,
        });
        return;
      }

      if (mode.kind === "create-shape") {
        if (s.activeTool === "arrow") {
          const world = screenToWorld(e.clientX, e.clientY, cam);
          setArrowPreview({
            x1: mode.startWorldX,
            y1: mode.startWorldY,
            x2: world.x,
            y2: world.y,
          });
        }
        return;
      }
    },
    []
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const mode = interaction.current.dragMode;
      const s = stateRef.current;
      const cam = s.document.camera;

      if (mode.kind === "marquee") {
        dispatch({ type: "SET_MARQUEE", marquee: null });
      }

      if (mode.kind === "create-text") {
        const { w, h } = defaultSizeForTool("text");
        const width = w / cam.zoom;
        const height = h / cam.zoom;

        dispatch({
          type: "CREATE_NODE",
          nodeType: "text",
          x: mode.worldX,
          y: mode.worldY - height / 2,
          width,
          height,
          props: defaultPropsForTool("text", s.activeStyle),
        });

        interaction.current.hasMoved = false;
        interaction.current.undoPushed = false;
        interaction.current.dragMode = { kind: "none" };
        return;
      }

      if (mode.kind === "create-shape") {
        const tool = s.activeTool;
        const ast = s.activeStyle;

        setArrowPreview(null);

        if (tool === "arrow") {
          const endWorld = screenToWorld(e.clientX, e.clientY, cam);
          const dx = endWorld.x - mode.startWorldX;
          const dy = endWorld.y - mode.startWorldY;
          const len = Math.hypot(dx, dy);
          if (len < 5) {
            // Click with no drag — create default horizontal arrow
            const defaultLen = 120 / cam.zoom;
            dispatch({
              type: "CREATE_NODE",
              nodeType: "arrow",
              x: mode.startWorldX,
              y: mode.startWorldY,
              width: defaultLen,
              height: 1,
              props: {
                type: "arrow",
                dx: defaultLen,
                dy: 0,
                stroke: ast.color,
                strokeWidth: ast.strokeWidth,
                strokeStyle: ast.strokeStyle,
              },
            });
          } else {
            dispatch({
              type: "CREATE_NODE",
              nodeType: "arrow",
              x: mode.startWorldX,
              y: mode.startWorldY,
              width: Math.abs(dx),
              height: Math.abs(dy),
              props: {
                type: "arrow",
                dx,
                dy,
                stroke: ast.color,
                strokeWidth: ast.strokeWidth,
                strokeStyle: ast.strokeStyle,
              },
            });
          }
          interaction.current.dragMode = { kind: "none" };
          // Switch back to select after placing arrow
          dispatch({ type: "SET_TOOL", tool: "select" });
          return;
        }

        // Get actual container dimensions using getBoundingClientRect
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const containerWidth = rect.width;
        const containerHeight = rect.height;

        // Center of screen in screen coordinates
        const screenCenterX = containerWidth / 2;
        const screenCenterY = containerHeight / 2;

        // Convert to world coordinates
        const centerWorld = screenToWorld(screenCenterX, screenCenterY, cam);

        // Calculate size based on screen dimensions and zoom level
        const visibleWorldWidth = containerWidth / cam.zoom;
        const visibleWorldHeight = containerHeight / cam.zoom;

        let w: number;
        let h: number;

        switch (tool) {
          case "text":
            w = visibleWorldWidth * 0.15;
            h = visibleWorldHeight * 0.05;
            break;
          case "sticky":
            w = visibleWorldWidth * 0.2;
            h = visibleWorldWidth * 0.2;
            break;
          case "rect":
            w = visibleWorldWidth * 0.15;
            h = visibleWorldHeight * 0.1;
            break;
          case "ellipse":
            w = visibleWorldWidth * 0.12;
            h = visibleWorldWidth * 0.12;
            break;
          default:
            w = visibleWorldWidth * 0.15;
            h = visibleWorldHeight * 0.1;
        }

        const minWorldSize = 20 / cam.zoom;
        w = Math.max(w, minWorldSize);
        h = Math.max(h, minWorldSize);

        const x = centerWorld.x - w / 2;
        const y = centerWorld.y - h / 2;

        dispatch({
          type: "CREATE_NODE",
          nodeType: tool === "select" ? "rect" : (tool as CanvasNode["type"]),
          x,
          y,
          width: w,
          height: h,
          props: defaultPropsForTool(tool, ast),
        });
      }

      if (mode.kind === "move") {
        // Double-click detection for text editing handled in onDoubleClick
      }

      interaction.current.hasMoved = false;
      interaction.current.undoPushed = false;
      interaction.current.dragMode = { kind: "none" };
    },
    []
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const hit = hitTestNode(e.clientX, e.clientY);
      if (hit && (hit.type === "text" || hit.type === "sticky")) {
        dispatch({ type: "SET_EDITING", nodeId: hit.id });
      }
    },
    [hitTestNode]
  );

  // ---------------------------------------------------------------------------
  // Text editing callbacks
  // ---------------------------------------------------------------------------
  const handleTextChange = useCallback((nodeId: string, text: string) => {
    dispatch({
      type: "UPDATE_NODE_TEXT",
      nodeId,
      text,
    });
  }, []);

  const handleNodeSizeChange = useCallback(
    (nodeId: string, width: number, height: number) => {
      const node = stateRef.current.document.nodes[nodeId];
      if (!node) return;
      if (Math.abs(node.width - width) <= 1 && Math.abs(node.height - height) <= 1) {
        return;
      }
      dispatch({ type: "UPDATE_NODE_SIZE", nodeId, width, height });
    },
    []
  );

  const handleTextBlur = useCallback((nodeId: string) => {
    const node = stateRef.current.document.nodes[nodeId];
    if (node?.type === "text") {
      dispatch({ type: "CLEAR_SELECTION" });
      return;
    }
    dispatch({ type: "SET_EDITING", nodeId: null });
  }, []);

  // ---------------------------------------------------------------------------
  // Image upload helper
  // ---------------------------------------------------------------------------
  const createImageNodeFromFile = useCallback(
    (file: File, worldX: number, worldY: number) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result as string;
        const img = new window.Image();
        img.onload = () => {
          const maxW = 400;
          const ratio = Math.min(maxW / img.width, 1);
          const w = img.width * ratio;
          const h = img.height * ratio;
          dispatch({
            type: "CREATE_NODE",
            nodeType: "image",
            x: worldX - w / 2,
            y: worldY - h / 2,
            width: w,
            height: h,
            props: { type: "image", src, alt: file.name },
          });
          dispatch({ type: "SET_TOOL", tool: "select" });
          imageClickPosRef.current = null;
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Image upload
  // ---------------------------------------------------------------------------
  const handleImageFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const pos = imageClickPosRef.current ?? { x: 0, y: 0 };
      createImageNodeFromFile(file, pos.x, pos.y);
      e.target.value = "";
    },
    [createImageNodeFromFile]
  );

  // ---------------------------------------------------------------------------
  // Paste handler
  // ---------------------------------------------------------------------------
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            // Get screen center and convert to world
            const container = containerRef.current;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const screenCenterX = rect.width / 2;
            const screenCenterY = rect.height / 2;
            const world = screenToWorld(screenCenterX, screenCenterY, stateRef.current.document.camera);
            createImageNodeFromFile(file, world.x, world.y);
          }
        }
      }
    },
    [createImageNodeFromFile]
  );

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  // ---------------------------------------------------------------------------
  // Drag-and-drop handler
  // ---------------------------------------------------------------------------
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    const hasImage = Array.from(e.dataTransfer.items || []).some((item) =>
      item.type.startsWith("image/")
    );
    if (hasImage) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      const files = e.dataTransfer.files;
      if (!files) return;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith("image/")) {
          e.preventDefault();
          // Get drop position in world coordinates
          const world = screenToWorld(e.clientX, e.clientY, stateRef.current.document.camera);
          createImageNodeFromFile(file, world.x, world.y);
        }
      }
    },
    [createImageNodeFromFile]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const { document: doc, selection, activeTool, editingNodeId } = state;
  const cam = doc.camera;

  const selectedNodes = doc.nodeOrder
    .filter((id) => selection.nodeIds.has(id))
    .map((id) => doc.nodes[id])
    .filter(Boolean) as CanvasNode[];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden"
      style={{ cursor: getCursorForTool(activeTool, spaceDown) }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Link
        href="/projects"
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: "20px",
          left: "24px",
          zIndex: 1000,
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          color: "var(--klad-ink)",
          textDecoration: "none",
          userSelect: "none",
          mixBlendMode: "multiply",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "999px",
            backgroundColor: "var(--klad-yellow)",
            border: "1.5px solid var(--klad-ink)",
            boxSizing: "border-box",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-ibm-plex-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: "20px",
            lineHeight: 1,
            fontWeight: 500,
            letterSpacing: "-0.02em",
          }}
        >
          klad
        </span>
      </Link>

      {/* Background */}
      <Background camera={cam} width={size.width} height={size.height} />

      {/* Main SVG scene */}
      <svg
        className="absolute inset-0"
        width={size.width}
        height={size.height}
        style={{ pointerEvents: "none" }}
      >
        <defs>
          <marker
            id="arrowhead-blue"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="5"
            orient="auto"
          >
            <polygon points="0 0, 10 5, 0 10" fill="#3b82f6" />
          </marker>
        </defs>
        <g
          transform={`translate(${cam.x}, ${cam.y}) scale(${cam.zoom})`}
          style={{ pointerEvents: "all" }}
        >
          {doc.nodeOrder.map((id) => {
            const node = doc.nodes[id];
            if (!node) return null;
            const isSelected = selection.nodeIds.has(id);
            const isEditing = editingNodeId === id;

            switch (node.type) {
              case "text":
                return (
                  <TextNode
                    key={id}
                    node={node}
                    isSelected={isSelected}
                    isEditing={isEditing}
                    onTextChange={(t) => handleTextChange(id, t)}
                    onSizeChange={(w, h) => handleNodeSizeChange(id, w, h)}
                    onBlur={() => handleTextBlur(id)}
                  />
                );
              case "sticky":
                return (
                  <StickyNode
                    key={id}
                    node={node}
                    isSelected={isSelected}
                    isEditing={isEditing}
                    onTextChange={(t) => handleTextChange(id, t)}
                    onBlur={() => handleTextBlur(id)}
                  />
                );
              case "rect":
                return (
                  <RectNode key={id} node={node} isSelected={isSelected} />
                );
              case "ellipse":
                return (
                  <EllipseNode key={id} node={node} isSelected={isSelected} />
                );
              case "freehand":
                return (
                  <FreehandNode
                    key={id}
                    node={node}
                    isSelected={isSelected}
                  />
                );
              case "arrow":
                return (
                  <ArrowNode key={id} node={node} isSelected={isSelected} />
                );
              case "image":
                return (
                  <ImageNode key={id} node={node} isSelected={isSelected} />
                );
              default:
                return null;
            }
          })}

          {/* Arrow preview during drag */}
          {arrowPreview && (
            <g>
              <line
                x1={arrowPreview.x1}
                y1={arrowPreview.y1}
                x2={arrowPreview.x2}
                y2={arrowPreview.y2}
                stroke={state.activeStyle.color}
                strokeWidth={state.activeStyle.strokeWidth}
                strokeOpacity={0.6}
                strokeLinecap="round"
              />
              <path
                d={arrowheadPath(arrowPreview.x1, arrowPreview.y1, arrowPreview.x2, arrowPreview.y2)}
                stroke={state.activeStyle.color}
                strokeWidth={state.activeStyle.strokeWidth}
                fill="none"
                strokeOpacity={0.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          )}

          {/* Selection overlay (handles, marquee) */}
          <SelectionOverlay
            selectedNodes={selectedNodes}
            marquee={selection.marquee}
            camera={cam}
            editingNodeId={editingNodeId}
            stylePreviewNonce={stylePreviewNonce}
          />
        </g>
      </svg>

      {/* UI overlays */}
      <Toolbar
        activeTool={activeTool}
        onToolChange={handleToolChange}
        onImageClick={() => {
          imageClickPosRef.current = screenToWorld(
            size.width / 2,
            size.height / 2,
            cam
          );
          imageInputRef.current?.click();
        }}
      />
      <ZoomControls
        zoom={cam.zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitContent={handleFitContent}
      />
      <SaveIndicator status={saveStatus} />
      <StylePanel
        activeStyle={state.activeStyle}
        hasSelection={selection.nodeIds.size > 0 && !editingNodeId}
        selectedNodeCount={selection.nodeIds.size}
        showTextSizes={selectedNodes.some((node) => node.type === "text")}
        onStyleChange={(partial) => {
          setStylePreviewNonce((value) => value + 1);
          dispatch({ type: "SET_ACTIVE_STYLE", style: partial });
        }}
        onAlign={(alignment) => {
          dispatch({
            type: "ALIGN_NODES",
            nodeIds: Array.from(selection.nodeIds),
            alignment,
          });
        }}
      />

      {/* Hidden image file input */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleImageFileChange}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCursorForTool(tool: Tool, spaceDown: boolean): string {
  if (spaceDown) return "grab";
  switch (tool) {
    case "select":
      return "default";
    case "text":
    case "sticky":
      return "text";
    case "rect":
    case "ellipse":
    case "freehand":
    case "arrow":
      return "crosshair";
    case "image":
      return "cell";
    default:
      return "default";
  }
}

function defaultSizeForTool(tool: Tool): { w: number; h: number } {
  switch (tool) {
    case "text":
      return { w: 200, h: 40 };
    case "sticky":
      return { w: 200, h: 200 };
    case "rect":
      return { w: 150, h: 100 };
    case "ellipse":
      return { w: 120, h: 120 };
    default:
      return { w: 150, h: 100 };
  }
}

function defaultPropsForTool(tool: Tool, style: ActiveStyle): NodeProps {
  switch (tool) {
    case "text":
      return { type: "text", text: "", fontSize: style.fontSize, color: style.color };
    case "sticky":
      return { type: "sticky", text: "", color: "yellow" };
    case "rect":
      return {
        type: "rect",
        fill: style.color,
        stroke: style.color,
        strokeWidth: style.strokeWidth,
        strokeStyle: style.strokeStyle,
        fillStyle: style.fillStyle,
      };
    case "ellipse":
      return {
        type: "ellipse",
        fill: style.color,
        stroke: style.color,
        strokeWidth: style.strokeWidth,
        strokeStyle: style.strokeStyle,
        fillStyle: style.fillStyle,
      };
    default:
      return { type: "rect", fill: "transparent", stroke: style.color, strokeWidth: style.strokeWidth };
  }
}
