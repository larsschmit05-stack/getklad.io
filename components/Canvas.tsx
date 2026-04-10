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
import { Crop, Download, ChevronLeft } from "lucide-react";
import type Html2Canvas from "html2canvas";
import type {
  CanvasDocument,
  CanvasNode,
  Tool,
  NodeProps,
  ActiveStyle,
  ImageProps,
  TextProps,
} from "@/lib/canvas/types";
import { cropImagePixels } from "@/lib/canvas/cropImage";
import {
  canvasReducer,
  createInitialState,
  type CanvasAction,
} from "@/lib/canvas/reducer";
import { generateId } from "@/lib/canvas/types";
import { serializeForChat } from "@/lib/ai/serialize-canvas";
import type { AiChatResponse } from "@/lib/ai/skills/chat/schema";
import {
  screenToWorld,
  pointInNode,
  clampZoom,
  getSelectionBounds,
  normalizeRect,
  aabbIntersects,
  getNodeBounds,
  hitTestResizeHandles,
  worldToScreen,
  getBBoxEdgePoint,
  getConnectedArrowEndpoints,
  type ResizeHandle,
} from "@/lib/canvas/geometry";
import { useAutosave } from "@/lib/canvas/hooks";
import { measureTextNodeSize } from "@/lib/canvas/text";
import { createClient } from "@/lib/supabase";

import Background from "./canvas/Background";
import SelectionOverlay from "./canvas/SelectionOverlay";
import ActionBar from "./canvas/ActionBar";
import Toolbar from "./canvas/Toolbar";
import ZoomControls from "./canvas/ZoomControls";
import SaveIndicator from "./canvas/SaveIndicator";
import StylePanel from "./canvas/StylePanel";
import ImageCropOverlay from "./canvas/ImageCropOverlay";
import CanvasMenu from "./canvas/CanvasMenu";
import FeedbackButton from "@/components/FeedbackButton";
import Toast from "./canvas/Toast";
import KladAiButton from "./canvas/KladAiButton";
import AiSidebar, { type ChatMessage, AI_SIDEBAR_WIDTH } from "./canvas/AiSidebar";
import AiUsageCounter from "./canvas/AiUsageCounter";
import CanvasContextMenu from "./canvas/ContextMenu";
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

import {
  placeGroups,
  placeTasks,
  placeSummary,
  placeQuestionsOrAnalysis,
  applyEdits,
  type PlacementResult,
} from "@/lib/ai/place-on-canvas";

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
  | { kind: "marquee"; startWorldX: number; startWorldY: number; metaKey: boolean }
  | { kind: "create-text"; worldX: number; worldY: number }
  | {
      kind: "resize";
      handle: ResizeHandle;
      nodeId: string;
      origX: number;
      origY: number;
      origW: number;
      origH: number;
      origTextFontSize?: number;
      startWorldX: number;
      startWorldY: number;
    }
  | { kind: "draw"; nodeId: string }
  | { kind: "create-shape"; startWorldX: number; startWorldY: number; nodeId: string | null }
  | { kind: "connect-arrow"; fromNodeId: string }
  | {
      kind: "multi-resize";
      handle: "top-left" | "top-right" | "bottom-left" | "bottom-right";
      origBbox: { minX: number; minY: number; maxX: number; maxY: number };
      origNodes: Array<{ id: string; x: number; y: number; w: number; h: number }>;
    };

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
  const svgRef = useRef<SVGSVGElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imageClickPosRef = useRef<{ x: number; y: number } | null>(null);
  const pendingUploadsRef = useRef(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [spaceDown, setSpaceDown] = useState(false);
  const [arrowPreview, setArrowPreview] = useState<{
    x1: number; y1: number; x2: number; y2: number;
  } | null>(null);
  const [shapePreview, setShapePreview] = useState<{
    x: number; y: number; width: number; height: number; type: string;
  } | null>(null);
  const [hoveredResizeHandle, setHoveredResizeHandle] = useState<ResizeHandle | null>(null);
  const [activeResizeHandle, setActiveResizeHandle] = useState<ResizeHandle | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  // Connection drag state (arrow tool connecting two nodes)
  const [connectionDrag, setConnectionDrag] = useState<{
    fromNodeId: string;
    cursorX: number;
    cursorY: number;
    targetNodeId: string | null;
  } | null>(null);
  const [arrowHoverNodeId, setArrowHoverNodeId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiChatLoading, setAiChatLoading] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState<ChatMessage[]>([]);
  const [fadeInNodeIds, setFadeInNodeIds] = useState<Set<string>>(new Set());
  const [usageRefreshKey, setUsageRefreshKey] = useState(0);
  const [canvasContextMenu, setCanvasContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string | null;
  } | null>(null);
  const [cropMode, setCropMode] = useState<{
    nodeId: string;
    cropBox: { x: number; y: number; width: number; height: number };
  } | null>(null);
  const cropModeRef = useRef(cropMode);
  cropModeRef.current = cropMode;
  const aiChatOpenRef = useRef(aiChatOpen);
  aiChatOpenRef.current = aiChatOpen;
  const spaceDownRef = useRef(false);
  const clipboardRef = useRef<CanvasNode[]>([]);
  const [hasClipboard, setHasClipboard] = useState(false);
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
  useEffect(() => {
    setHasClipboard(clipboardRef.current.length > 0);
  }, []);

  // Silent thumbnail capture — snapshots the current view (does NOT mutate
  // the camera) via html-to-image and returns a small JPEG data URL. Used by
  // the autosave hook so the projects list can show a real rasterized
  // preview of each board. Returns null when the canvas is empty or capture
  // fails so we don't overwrite an existing good thumbnail with garbage.
  //
  // We use html-to-image here (not html2canvas) because html2canvas can't
  // parse modern CSS color functions like `lab()` / `oklch()` which Tailwind
  // v4 and Base UI components emit. The existing PNG export avoids this by
  // hiding all overlays via `isExporting`, but the thumbnail path runs
  // silently with overlays still mounted.
  const captureThumbnail = useCallback(async (): Promise<string | null> => {
    const container = containerRef.current;
    if (!container) {
      return null;
    }

    const allNodes = Object.values(stateRef.current.document.nodes);
    if (allNodes.length === 0) {
      return null;
    }

    try {
      const { toJpeg } = await import("html-to-image");
      const dataUrl = await toJpeg(container, {
        quality: 0.6,
        pixelRatio: 0.5,
        backgroundColor: "#f7f4ef",
        cacheBust: true,
        filter: (node) => {
          // Skip any element flagged for export exclusion (toolbars, panels…)
          if (node instanceof HTMLElement) {
            return !node.hasAttribute("data-export-ignore");
          }
          return true;
        },
      });
      return dataUrl;
    } catch (err) {
      console.error("[thumbnail] capture failed", err);
      return null;
    }
  }, []);

  // Autosave
  const saveStatus = useAutosave(projectId, state.document, captureThumbnail, pendingUploadsRef);

  // Backfill thumbnail on mount — the autosave hook only captures on document
  // changes, so existing projects that haven't been edited since thumbnails
  // were introduced would show "Empty canvas" forever. On load, if the canvas
  // has content, capture one thumbnail and persist it.
  useEffect(() => {
    if (!initialSnapshot || Object.keys(initialSnapshot.nodes).length === 0) {
      return;
    }
    let cancelled = false;
    // Wait for layout + fonts + images to settle before capturing
    const timer = setTimeout(async () => {
      if (cancelled) return;
      const thumbnail = await captureThumbnail();
      if (cancelled || !thumbnail) return;
      try {
        await fetch(`/api/canvases/${projectId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            canvasData: stateRef.current.document,
            thumbnail,
          }),
        });
      } catch {
        // Non-fatal — will retry on next actual save
      }
    }, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // Intentionally runs only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Update active style when selection changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const selectedId = stateRef.current.selection.nodeIds.size === 1
      ? [...stateRef.current.selection.nodeIds][0]
      : null;
    const targetNodeId = stateRef.current.editingNodeId || selectedId;

    if (!targetNodeId) return;

    const targetNode = stateRef.current.document.nodes[targetNodeId];
    if (!targetNode) return;

    // Extract style from the node's props
    const newStyle: Partial<ActiveStyle> = {};
    const props = targetNode.props;

    // Text properties
    if ('fontSize' in props && typeof props.fontSize === 'number') {
      newStyle.fontSize = props.fontSize;
    }
    if ('fontFamily' in props && props.fontFamily) {
      newStyle.fontFamily = props.fontFamily;
    }
    if ('fontWeight' in props && props.fontWeight) {
      newStyle.fontWeight = props.fontWeight;
    }
    if ('fontStyle' in props && props.fontStyle) {
      newStyle.fontStyle = props.fontStyle;
    }
    if ('textDecoration' in props && props.textDecoration) {
      newStyle.textDecoration = props.textDecoration;
    }

    // Stroke/fill properties
    if ('stroke' in props && props.stroke) {
      newStyle.color = props.stroke;
    }
    if ('strokeWidth' in props && typeof props.strokeWidth === 'number') {
      newStyle.strokeWidth = props.strokeWidth;
    }
    if ('strokeStyle' in props && props.strokeStyle) {
      newStyle.strokeStyle = props.strokeStyle;
    }
    if ('fillStyle' in props && props.fillStyle) {
      newStyle.fillStyle = props.fillStyle;
    }

    // Only update the toolbar display — never propagate to node props from here
    if (Object.keys(newStyle).length > 0) {
      dispatch({ type: "SET_ACTIVE_STYLE", style: newStyle, displayOnly: true });
    }
  }, [state.selection.nodeIds, state.editingNodeId]);

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

    // Device-aware padding scaled to viewport size
    const padding = Math.max(60, Math.min(size.width, size.height) * 0.1);

    const bw = bounds.maxX - bounds.minX;
    const bh = bounds.maxY - bounds.minY;
    const zoom = clampZoom(
      Math.min(
        (size.width - padding * 2) / Math.max(bw, 1),
        (size.height - padding * 2) / Math.max(bh, 1)
      )
    );

    // Center the content bounding box on screen
    const contentCenterX = (bounds.minX + bounds.maxX) / 2;
    const contentCenterY = (bounds.minY + bounds.maxY) / 2;
    dispatch({
      type: "SET_CAMERA",
      camera: {
        x: size.width / 2 - contentCenterX * zoom,
        y: size.height / 2 - contentCenterY * zoom,
        zoom,
      },
    });
  }, [size]);

  // ---------------------------------------------------------------------------
  // Selection callbacks
  // ---------------------------------------------------------------------------
  const handleSelectAll = useCallback(() => {
    dispatch({ type: "SELECT_ALL" });
  }, []);

  const handleDeselect = useCallback(() => {
    dispatch({ type: "CLEAR_SELECTION" });
  }, []);

  const showToast = useCallback((msg: string) => setToastMessage(msg), []);

  // ---------------------------------------------------------------------------
  // Clipboard helpers (shared by keyboard + context menu)
  // ---------------------------------------------------------------------------
  const handleCopyToClipboard = useCallback(() => {
    const ids = [...stateRef.current.selection.nodeIds];
    if (ids.length === 0) return;
    const nodes = stateRef.current.document.nodes;
    clipboardRef.current = ids
      .map((id) => nodes[id])
      .filter(Boolean)
      .map((n) => JSON.parse(JSON.stringify(n)));
    showToast(`Copied ${ids.length} item${ids.length > 1 ? "s" : ""}`);
  }, [showToast]);

  const handlePasteFromClipboard = useCallback(() => {
    if (clipboardRef.current.length === 0) return;
    const cam = stateRef.current.document.camera;
    // Calculate viewport center in world coords
    const viewCenter = screenToWorld(
      window.innerWidth / 2,
      window.innerHeight / 2,
      cam
    );
    // Calculate clipboard bounding box center
    const items = clipboardRef.current;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of items) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    }
    const clipCenterX = (minX + maxX) / 2;
    const clipCenterY = (minY + maxY) / 2;
    // Offset to center in viewport + small jitter for consecutive pastes
    const offsetX = viewCenter.x - clipCenterX + 10;
    const offsetY = viewCenter.y - clipCenterY + 10;

    const newNodes = items.map((n) => {
      const clone: CanvasNode = JSON.parse(JSON.stringify(n));
      clone.id = generateId();
      clone.x += offsetX;
      clone.y += offsetY;
      return clone;
    });
    dispatch({ type: "PASTE_NODES", nodes: newNodes });
    // Update clipboard positions for cascading paste
    clipboardRef.current = newNodes.map((n) =>
      JSON.parse(JSON.stringify(n))
    );
    showToast("Pasted");
  }, [showToast]);

  const handleDeleteSelected = useCallback(() => {
    const ids = stateRef.current.selection.nodeIds;
    if (ids.size === 0) return;
    dispatch({ type: "DELETE_SELECTED" });
    showToast("Deleted \u2014 \u2318Z to undo");
  }, [showToast]);

  // ---------------------------------------------------------------------------
  // AI Chat handler — unified replacement for organize/questions/tasks
  // ---------------------------------------------------------------------------
  const handleAiChat = useCallback(async (instruction: string) => {
    const { selection, document } = stateRef.current;
    const selectedIds = selection.nodeIds;
    const totalNodes = Object.keys(document.nodes).length;

    if (totalNodes === 0) {
      setAiChatMessages((m) => [
        ...m,
        { role: "assistant", text: "Add some notes to the canvas first.", isError: true },
      ]);
      return;
    }
    if (selectedIds.size > 50) {
      setAiChatMessages((m) => [
        ...m,
        { role: "assistant", text: "Too many notes selected (max 50). Try selecting fewer.", isError: true },
      ]);
      return;
    }
    if (aiChatLoading) return;

    // Add user message to chat
    setAiChatMessages((m) => [...m, { role: "user", text: instruction }]);
    setAiChatLoading(true);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const payload = {
        ...serializeForChat(selectedIds, document),
        instruction,
      };

      const res = await fetch("/api/klad/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error || `Request failed (${res.status})`
        );
      }

      const data: AiChatResponse = await res.json();

      // Handle error responses from AI
      if (!data.success) {
        const errMsg = data.error || "I couldn't process that request.";
        const suggestion = data.suggestion ? `\n\nTry: "${data.suggestion}"` : "";
        setAiChatMessages((m) => [
          ...m,
          { role: "assistant", text: errMsg + suggestion, isError: true },
        ]);
        return;
      }

      // Place results on canvas based on type
      function panToOutput(b: { x: number; y: number; width: number; height: number }) {
        const startCam = stateRef.current.document.camera;

        // Compute zoom to fit output bounds (same math as handleFitContent)
        const padding = Math.max(60, Math.min(size.width, size.height) * 0.1);
        const targetZoom = clampZoom(
          Math.min(
            (size.width - padding * 2) / Math.max(b.width, 1),
            (size.height - padding * 2) / Math.max(b.height, 1)
          ) * 0.8
        );

        const centerX = b.x + b.width / 2;
        const centerY = b.y + b.height / 2;
        const targetX = size.width / 2 - centerX * targetZoom;
        const targetY = size.height / 2 - centerY * targetZoom;

        const DURATION = 350;
        const startTime = performance.now();
        const fromX = startCam.x;
        const fromY = startCam.y;
        const fromZoom = startCam.zoom;

        function easeOut(t: number) {
          return 1 - Math.pow(1 - t, 3);
        }

        function step() {
          const elapsed = performance.now() - startTime;
          const t = Math.min(elapsed / DURATION, 1);
          const e = easeOut(t);
          dispatch({
            type: "SET_CAMERA",
            camera: {
              x: fromX + (targetX - fromX) * e,
              y: fromY + (targetY - fromY) * e,
              zoom: fromZoom + (targetZoom - fromZoom) * e,
            },
          });
          if (t < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      }

      function applyPlacement(result: PlacementResult) {
        if (result.useOrganize) {
          dispatch({ type: "APPLY_ORGANIZE", updates: result.stickyUpdates, newNodes: result.newNodes });
        } else if (result.newNodes.length > 0) {
          dispatch({ type: "PASTE_NODES", nodes: result.newNodes });
        }
        if (result.newNodes.length > 0) {
          const newIds = new Set(result.newNodes.map((n) => n.id));
          setFadeInNodeIds(newIds);
          setTimeout(() => setFadeInNodeIds(new Set()), 400);
        }
        if (result.outputBounds) {
          panToOutput(result.outputBounds);
        }
      }

      if (data.type === "groups") {
        applyPlacement(placeGroups(data, document, selectedIds));
      } else if (data.type === "tasks") {
        applyPlacement(placeTasks(data, document, selectedIds));
      } else if (data.type === "summary") {
        applyPlacement(placeSummary(data, document, selectedIds));
      } else if (data.type === "edit") {
        const { edits } = applyEdits(data, document);
        for (const edit of edits) {
          dispatch({ type: "UPDATE_NODE_TEXT", nodeId: edit.nodeId, text: edit.newText });
        }
      } else {
        // questions, analysis
        applyPlacement(placeQuestionsOrAnalysis(data, document, selectedIds));
      }

      // Show chat message from AI
      const chatText = data.chatMessage || data.summary || `Done. ${data.items.length} items on canvas.`;
      setAiChatMessages((m) => [
        ...m,
        { role: "assistant", text: chatText, isSuccess: true },
      ]);
      setUsageRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setAiChatMessages((m) => [
          ...m,
          { role: "assistant", text: "Request timed out. Try again?", isError: true },
        ]);
      } else if (err instanceof Error) {
        setAiChatMessages((m) => [
          ...m,
          { role: "assistant", text: err.message, isError: true },
        ]);
      } else {
        setAiChatMessages((m) => [
          ...m,
          { role: "assistant", text: "Something went wrong", isError: true },
        ]);
      }
    } finally {
      clearTimeout(timeout);
      setAiChatLoading(false);
    }
  }, [showToast, aiChatLoading]);

  // ---------------------------------------------------------------------------
  // Export callbacks
  // ---------------------------------------------------------------------------
  // Build an export-ready SVG string that covers all canvas content, not just the viewport.
  // Computes a world-space bounding box, clones the SVG, applies a viewBox so all nodes
  // are visible, and resets the camera transform so nodes render at their world coordinates.
  const buildExportSvg = useCallback((): { svgStr: string; width: number; height: number } | null => {
    if (!svgRef.current) return null;
    const nodes = Object.values(stateRef.current.document.nodes);
    if (nodes.length === 0) return null;

    const PAD = 60;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of nodes) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    }
    minX -= PAD; minY -= PAD; maxX += PAD; maxY += PAD;
    const contentW = maxX - minX;
    const contentH = maxY - minY;

    const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("viewBox", `${minX} ${minY} ${contentW} ${contentH}`);
    clone.setAttribute("width", String(contentW));
    clone.setAttribute("height", String(contentH));

    // Add paper background rect at world coordinates
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("x", String(minX));
    bg.setAttribute("y", String(minY));
    bg.setAttribute("width", String(contentW));
    bg.setAttribute("height", String(contentH));
    bg.setAttribute("fill", "#f7f4ef");
    clone.insertBefore(bg, clone.firstChild);

    // Remove camera transform from the main content <g> so nodes render at
    // world coordinates, which the viewBox now handles correctly.
    const contentG = clone.querySelector("g[transform]");
    if (contentG) contentG.removeAttribute("transform");

    return {
      svgStr: new XMLSerializer().serializeToString(clone),
      width: contentW,
      height: contentH,
    };
  }, []);

  const handleExportSvg = useCallback(() => {
    if (Object.keys(stateRef.current.document.nodes).length === 0) {
      showToast("Nothing to export");
      return;
    }
    const result = buildExportSvg();
    if (!result) return;
    const blob = new Blob([result.svgStr], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "canvas.svg";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exported as SVG");
  }, [showToast, buildExportSvg]);

  // Capture the live canvas DOM via html2canvas (renders foreignObject text + images)
  const captureCanvasAsImage = useCallback(async (scale: number): Promise<HTMLCanvasElement | null> => {
    const container = containerRef.current;
    if (!container) return null;

    const allNodes = Object.values(stateRef.current.document.nodes);
    if (allNodes.length === 0) return null;

    // Save current camera
    const savedCamera = { ...stateRef.current.document.camera };

    // Compute zoom-to-fit camera (same logic as handleFitContent)
    const bounds = getSelectionBounds(allNodes);
    if (!bounds) return null;
    const padding = Math.max(60, Math.min(size.width, size.height) * 0.1);
    const bw = bounds.maxX - bounds.minX;
    const bh = bounds.maxY - bounds.minY;
    const zoom = clampZoom(
      Math.min(
        (size.width - padding * 2) / Math.max(bw, 1),
        (size.height - padding * 2) / Math.max(bh, 1)
      )
    );
    const contentCenterX = (bounds.minX + bounds.maxX) / 2;
    const contentCenterY = (bounds.minY + bounds.maxY) / 2;

    // Set export mode + zoom-to-fit camera
    setIsExporting(true);
    dispatch({
      type: "SET_CAMERA",
      camera: {
        x: size.width / 2 - contentCenterX * zoom,
        y: size.height / 2 - contentCenterY * zoom,
        zoom,
      },
    });

    // Wait for React re-render
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 150)));
    });

    try {
      const html2canvas: typeof Html2Canvas = (await import("html2canvas")).default;
      const captured = await html2canvas(container, {
        scale,
        useCORS: true,
        backgroundColor: "#f7f4ef",
        ignoreElements: (el) => {
          return el.hasAttribute("data-export-ignore");
        },
      });
      return captured;
    } catch {
      return null;
    } finally {
      // Restore original camera
      dispatch({ type: "SET_CAMERA", camera: savedCamera });
      setIsExporting(false);
    }
  }, [size]);

  const handleExportPng = useCallback(async () => {
    if (Object.keys(stateRef.current.document.nodes).length === 0) {
      showToast("Nothing to export");
      return;
    }
    const captured = await captureCanvasAsImage(2);
    if (!captured) {
      showToast("Failed to export as PNG");
      return;
    }
    const a = document.createElement("a");
    a.download = "canvas.png";
    a.href = captured.toDataURL("image/png");
    a.click();
    showToast("Exported as PNG");
  }, [showToast, captureCanvasAsImage]);

  const handleExportPdf = useCallback(async () => {
    if (Object.keys(stateRef.current.document.nodes).length === 0) {
      showToast("Nothing to export");
      return;
    }
    const captured = await captureCanvasAsImage(3);
    if (!captured) {
      showToast("Failed to export as PDF");
      return;
    }
    const imgData = captured.toDataURL("image/png");
    const pxToMm = 25.4 / 96;
    const wMm = (captured.width / 3) * pxToMm;
    const hMm = (captured.height / 3) * pxToMm;
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({
      orientation: wMm > hMm ? "landscape" : "portrait",
      unit: "mm",
      format: [wMm, hMm],
    });
    pdf.addImage(imgData, "PNG", 0, 0, wMm, hMm);
    pdf.save("canvas.pdf");
    showToast("Exported as PDF");
  }, [showToast, captureCanvasAsImage]);

  // ---------------------------------------------------------------------------
  // Keyboard
  // ---------------------------------------------------------------------------
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === " ") {
        setSpaceDown(true);
        return;
      }

      // Cmd+J toggles AI sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        setAiChatOpen((o) => {
          if (!o) setAiChatMessages([]);
          return !o;
        });
        return;
      }

      // When AI sidebar is open and user is typing in its input, block tool shortcuts
      // but allow Escape to close and meta-key combos (Cmd+Z undo etc.) through
      if (aiChatOpenRef.current) {
        if (e.key === "Escape") {
          setAiChatOpen(false);
          e.preventDefault();
          return;
        }
        // If focus is in a text input, block single-key shortcuts
        const tag = (document.activeElement?.tagName ?? "").toLowerCase();
        if (tag === "textarea" || tag === "input") return;
      }

      // Text formatting shortcuts (work while editing or selected)
      if (stateRef.current.editingNodeId) {
        const fmtMeta = e.metaKey || e.ctrlKey;
        if (fmtMeta && (e.key === "b" || e.key === "B")) {
          const current = stateRef.current.activeStyle.fontWeight;
          const style = { fontWeight: current === "bold" ? "normal" : "bold" } as const;
          dispatch({ type: "SET_ACTIVE_STYLE", style });
          dispatch({ type: "UPDATE_NODE_PROPS", nodeId: stateRef.current.editingNodeId, props: style });
          e.preventDefault();
          return;
        }
        if (fmtMeta && (e.key === "i" || e.key === "I")) {
          const current = stateRef.current.activeStyle.fontStyle;
          const style = { fontStyle: current === "italic" ? "normal" : "italic" } as const;
          dispatch({ type: "SET_ACTIVE_STYLE", style });
          dispatch({ type: "UPDATE_NODE_PROPS", nodeId: stateRef.current.editingNodeId, props: style });
          e.preventDefault();
          return;
        }
        if (fmtMeta && (e.key === "u" || e.key === "U")) {
          const current = stateRef.current.activeStyle.textDecoration;
          const style = { textDecoration: current === "underline" ? "none" : "underline" } as const;
          dispatch({ type: "SET_ACTIVE_STYLE", style });
          dispatch({ type: "UPDATE_NODE_PROPS", nodeId: stateRef.current.editingNodeId, props: style });
          e.preventDefault();
          return;
        }
        if (e.key === "Escape") {
          dispatch({ type: "SET_EDITING", nodeId: null });
          e.preventDefault();
        }
        return;
      }

      const meta = e.metaKey || e.ctrlKey;

      // Text formatting shortcuts for selected (not editing) nodes
      if (meta && stateRef.current.selection.nodeIds.size > 0) {
        const applyFormat = (style: Record<string, string>) => {
          dispatch({ type: "SET_ACTIVE_STYLE", style });
          for (const nid of stateRef.current.selection.nodeIds) {
            dispatch({ type: "UPDATE_NODE_PROPS", nodeId: nid, props: style });
          }
          e.preventDefault();
        };
        if (e.key === "b" || e.key === "B") {
          const current = stateRef.current.activeStyle.fontWeight;
          applyFormat({ fontWeight: current === "bold" ? "normal" : "bold" });
          return;
        }
        if (e.key === "i" || e.key === "I") {
          const current = stateRef.current.activeStyle.fontStyle;
          applyFormat({ fontStyle: current === "italic" ? "normal" : "italic" });
          return;
        }
        if (e.key === "u" || e.key === "U") {
          const current = stateRef.current.activeStyle.textDecoration;
          applyFormat({ textDecoration: current === "underline" ? "none" : "underline" });
          return;
        }
      }

      // Printable key on a selected text/sticky/rect/ellipse → enter edit mode immediately
      if (
        e.key.length === 1 &&
        !meta &&
        !e.altKey &&
        stateRef.current.selection.nodeIds.size === 1
      ) {
        const selectedId = [...stateRef.current.selection.nodeIds][0];
        const selectedNode = stateRef.current.document.nodes[selectedId];
        if (
          selectedNode &&
          (selectedNode.props.type === "text" ||
            selectedNode.props.type === "sticky" ||
            selectedNode.props.type === "rect" ||
            selectedNode.props.type === "ellipse")
        ) {
          const existingText =
            "text" in selectedNode.props ? (selectedNode.props.text ?? "") : "";
          dispatch({ type: "SET_EDITING", nodeId: selectedId });
          dispatch({
            type: "UPDATE_NODE_TEXT",
            nodeId: selectedId,
            text: existingText + e.key,
          });
          e.preventDefault();
          return;
        }
      }

      if (e.key === "Escape") {
        dispatch({ type: "CLEAR_SELECTION" });
      } else if (e.key === "Delete" || e.key === "Backspace") {
        handleDeleteSelected();
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
      } else if (meta && e.key === "c") {
        handleCopyToClipboard();
        e.preventDefault();
      } else if (meta && e.key === "x") {
        handleCopyToClipboard();
        const ids = [...stateRef.current.selection.nodeIds];
        if (ids.length > 0) {
          dispatch({ type: "DELETE_SELECTED" });
        }
        e.preventDefault();
      } else if (meta && e.key === "v") {
        if (clipboardRef.current.length > 0) {
          handlePasteFromClipboard();
          e.preventDefault();
        }
        // If clipboard empty, fall through for image paste handler
      } else if (meta && e.key === "d") {
        const ids = [...stateRef.current.selection.nodeIds];
        if (ids.length > 0) {
          dispatch({ type: "DUPLICATE_NODES", nodeIds: ids });
          e.preventDefault();
        }
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
  }, [handleFitContent, handleCopyToClipboard, handlePasteFromClipboard, handleDeleteSelected]);

  // ---------------------------------------------------------------------------
  // Wheel zoom
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      if (cropModeRef.current) return;
      const s = stateRef.current;
      const cam = s.document.camera;

      if (e.ctrlKey || e.metaKey) {
        // Pinch-to-zoom or ctrl+wheel
        const rawDelta = -e.deltaY * 0.01;
        const delta = Math.sign(rawDelta) * Math.min(Math.abs(rawDelta), 0.15);
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
      const hitPadding = 8 / s.document.camera.zoom;
      const allNodes = s.document.nodes;
      // Iterate in reverse z-order (top node wins)
      for (let i = s.document.nodeOrder.length - 1; i >= 0; i--) {
        const id = s.document.nodeOrder[i];
        const node = allNodes[id];
        if (node && pointInNode(world.x, world.y, node, hitPadding, allNodes)) return node;
      }
      return null;
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      // Close context menu on any pointer down
      setCanvasContextMenu(null);

      // Block all canvas interactions while crop mode is active
      if (cropModeRef.current) return;

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

      if (tool === "arrow") {
        // If clicking on a connectable node, start a connection drag
        const connectable = ["rect", "ellipse", "sticky", "text", "image"];
        const hitNode = hitTestNode(e.clientX, e.clientY);
        if (hitNode && connectable.includes(hitNode.type)) {
          interaction.current.dragMode = { kind: "connect-arrow", fromNodeId: hitNode.id };
          setConnectionDrag({ fromNodeId: hitNode.id, cursorX: world.x, cursorY: world.y, targetNodeId: null });
          setArrowHoverNodeId(null);
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          return;
        }
        // Fall through to create-shape (free arrow on empty space)
      }

      if (tool !== "select") {
        // All tools: start drag mode, will resolve to default or custom size on release
        interaction.current.dragMode = {
          kind: "create-shape",
          startWorldX: world.x,
          startWorldY: world.y,
          nodeId: null,
        };
        interaction.current.hasMoved = false; // Reset for this drag
        (interaction.current as any).dragStartClientX = e.clientX; // Store for hasMoved calculation
        (interaction.current as any).dragStartClientY = e.clientY;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }

      // Select tool: check multi-select resize handles first
      if (s.selection.nodeIds.size > 1) {
        const multiHandle = (e.target as HTMLElement).dataset.multiHandle as
          | "top-left" | "top-right" | "bottom-left" | "bottom-right"
          | undefined;
        if (multiHandle) {
          const selNodes = Array.from(s.selection.nodeIds)
            .map((id) => s.document.nodes[id])
            .filter(Boolean) as CanvasNode[];
          const movable = selNodes.filter(
            (n) =>
              !(n.props.type === "arrow" && "fromNodeId" in n.props && n.props.fromNodeId && n.props.toNodeId)
          );
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (const n of movable) {
            minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x + n.width); maxY = Math.max(maxY, n.y + n.height);
          }
          if (minX !== Infinity) {
            interaction.current.hasMoved = false;
            interaction.current.undoPushed = false;
            interaction.current.dragMode = {
              kind: "multi-resize",
              handle: multiHandle,
              origBbox: { minX, minY, maxX, maxY },
              origNodes: movable.map((n) => ({ id: n.id, x: n.x, y: n.y, w: n.width, h: n.height })),
            };
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            return;
          }
        }
      }

      // Select tool: check resize handles first (single selected node)
      if (s.selection.nodeIds.size === 1) {
        const selectedId = [...s.selection.nodeIds][0];
        const selectedNode = s.document.nodes[selectedId];
        if (selectedNode && selectedNode.props.type !== "sticky") {
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
              origTextFontSize:
                selectedNode.props.type === "text"
                  ? selectedNode.props.fontSize
                  : undefined,
              startWorldX: world.x,
              startWorldY: world.y,
            };
            setActiveResizeHandle(handle);
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

        // Calculate the new selection state and nodes to move
        let nodesToMove: string[];

        if (metaKey) {
          // Cmd/Ctrl + click: toggle selection
          const nextSelection = new Set(s.selection.nodeIds);
          if (isAlreadySelected) {
            // Remove from selection
            nextSelection.delete(hitNode.id);
          } else {
            // Add to selection
            nextSelection.add(hitNode.id);
          }
          nodesToMove = Array.from(nextSelection);
          dispatch({
            type: "SELECT_NODES",
            nodeIds: Array.from(nextSelection),
          });
        } else {
          // Click without modifier: select only this node
          if (isAlreadySelected) {
            // Already selected, keep current selection for moving
            nodesToMove = Array.from(s.selection.nodeIds);
          } else {
            // New selection
            nodesToMove = [hitNode.id];
            dispatch({ type: "SELECT_NODES", nodeIds: [hitNode.id] });
          }
        }

        // Connected arrows can't be moved — they're anchored to their endpoint nodes
        // Filter them out from the move operation, but allow moving other selected nodes
        const movableNodes = nodesToMove.filter((id) => {
          const node = s.document.nodes[id];
          return !(node?.props.type === "arrow" && node?.props.fromNodeId && node?.props.toNodeId);
        });

        // Only block the drag if there are no movable nodes (e.g., single selected connected arrow)
        if (movableNodes.length === 0) {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          interaction.current.dragMode = { kind: "none" };
          return;
        }

        // Start move drag
        interaction.current.hasMoved = false;
        interaction.current.undoPushed = false;
        interaction.current.dragMode = {
          kind: "move",
          startX: e.clientX,
          startY: e.clientY,
          nodeIds: movableNodes,
        };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }

      // If click lands inside the bounding box of a multi-node selection,
      // treat it as a move of the whole selection (not a marquee).
      const metaKey = e.metaKey || e.ctrlKey;
      if (!metaKey && s.selection.nodeIds.size > 1) {
        const selNodes = Array.from(s.selection.nodeIds).map(
          (id) => s.document.nodes[id]
        ).filter(Boolean);
        if (selNodes.length > 1) {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (const n of selNodes) {
            // Skip connected arrows — they don't move and would skew the bbox
            if (n.props.type === "arrow" && "fromNodeId" in n.props && n.props.fromNodeId && n.props.toNodeId) continue;
            minX = Math.min(minX, n.x);
            minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x + n.width);
            maxY = Math.max(maxY, n.y + n.height);
          }
          if (world.x >= minX && world.x <= maxX && world.y >= minY && world.y <= maxY) {
            const movableNodes = Array.from(s.selection.nodeIds).filter((id) => {
              const node = s.document.nodes[id];
              return !(node?.props.type === "arrow" && node?.props.fromNodeId && node?.props.toNodeId);
            });
            if (movableNodes.length > 0) {
              interaction.current.hasMoved = false;
              interaction.current.undoPushed = false;
              interaction.current.dragMode = {
                kind: "move",
                startX: e.clientX,
                startY: e.clientY,
                nodeIds: movableNodes,
              };
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              return;
            }
          }
        }
      }

      // Clicked empty area — start marquee select
      if (!metaKey) {
        dispatch({ type: "CLEAR_SELECTION" });
      }
      interaction.current.dragMode = {
        kind: "marquee",
        startWorldX: world.x,
        startWorldY: world.y,
        metaKey,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [hitTestNode]
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (cropModeRef.current) return;
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

      if (mode.kind === "none") {
        const hoveredNode = hitTestNode(e.clientX, e.clientY);
        setHoveredNodeId((current) =>
          current === hoveredNode?.id ? current : hoveredNode?.id ?? null
        );
        if (
          s.activeTool === "select" &&
          !s.editingNodeId &&
          s.selection.nodeIds.size === 1
        ) {
          const selectedId = [...s.selection.nodeIds][0];
          const selectedNode = s.document.nodes[selectedId];
          const nextHandle = selectedNode
            ? hitTestResizeHandles(e.clientX, e.clientY, selectedNode, cam)
            : null;
          setHoveredResizeHandle((current) =>
            current === nextHandle ? current : nextHandle
          );
        } else {
          setHoveredResizeHandle((current) => (current === null ? current : null));
        }
        // Arrow tool: highlight connectable nodes under cursor
        if (s.activeTool === "arrow") {
          const connectable = ["rect", "ellipse", "sticky", "text", "image"];
          const snapId = hoveredNode && connectable.includes(hoveredNode.type) ? hoveredNode.id : null;
          setArrowHoverNodeId((current) => current === snapId ? current : snapId);
        } else {
          setArrowHoverNodeId((current) => current === null ? current : null);
        }
      }

      if (mode.kind === "connect-arrow") {
        const world = screenToWorld(e.clientX, e.clientY, cam);
        const connectable = ["rect", "ellipse", "sticky", "text", "image"];
        const snapDistance = 60; // World-space snap zone radius (larger area)

        // Find if cursor is within snap zone of any connectable node
        let targetId: string | null = null;
        for (const node of Object.values(s.document.nodes)) {
          if (node.id === mode.fromNodeId || !connectable.includes(node.props.type)) continue;
          const nodeCx = node.x + node.width / 2;
          const nodeCy = node.y + node.height / 2;
          const dist = Math.hypot(world.x - nodeCx, world.y - nodeCy);
          if (dist < snapDistance) {
            targetId = node.id;
            break;
          }
        }

        setConnectionDrag({ fromNodeId: mode.fromNodeId, cursorX: world.x, cursorY: world.y, targetNodeId: targetId });
        return;
      }

      if (mode.kind === "move") {
        const dx = (e.clientX - mode.startX) / cam.zoom;
        const dy = (e.clientY - mode.startY) / cam.zoom;
        if (!interaction.current.hasMoved && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) {
          interaction.current.hasMoved = true;
          // Push undo snapshot before first actual movement
          if (!interaction.current.undoPushed) {
            dispatch({ type: "PUSH_UNDO" });
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
        const node = s.document.nodes[mode.nodeId];
        const anchorX =
          mode.handle === "top-left" ||
          mode.handle === "bottom-left" ||
          mode.handle === "left"
            ? mode.origX + mode.origW
            : mode.handle === "top-right" ||
                mode.handle === "bottom-right" ||
                mode.handle === "right"
              ? mode.origX
              : null;
        const anchorY =
          mode.handle === "top-left" ||
          mode.handle === "top-right" ||
          mode.handle === "top"
            ? mode.origY + mode.origH
            : mode.handle === "bottom-left" ||
                mode.handle === "bottom-right" ||
                mode.handle === "bottom"
              ? mode.origY
              : null;

        let newX = mode.origX;
        let newY = mode.origY;
        let newW = mode.origW;
        let newH = mode.origH;

        if (anchorX !== null) {
          newX = Math.min(anchorX, world.x);
          newW = Math.abs(world.x - anchorX);
        }

        if (anchorY !== null) {
          newY = Math.min(anchorY, world.y);
          newH = Math.abs(world.y - anchorY);
        }

        if ((node?.type === "rect" || node?.type === "ellipse") && e.shiftKey) {
          const ratio = mode.origW / Math.max(mode.origH, 1);
          const widthDriven =
            Math.abs(newW - mode.origW) >= Math.abs(newH - mode.origH);

          if (widthDriven) {
            newH = newW / ratio;
          } else {
            newW = newH * ratio;
          }

          if (anchorX !== null) {
            newX = anchorX <= world.x ? anchorX : anchorX - newW;
          }
          if (anchorY !== null) {
            newY = anchorY <= world.y ? anchorY : anchorY - newH;
          }
        }

        if (node?.type === "image") {
          const ratio = mode.origW / Math.max(mode.origH, 1);
          const widthDriven =
            anchorY === null ||
            (anchorX !== null &&
              Math.abs(newW - mode.origW) >= Math.abs(newH - mode.origH));

          if (widthDriven) {
            newH = newW / ratio;
          } else {
            newW = newH * ratio;
          }

          if (anchorX !== null && anchorY !== null) {
            newX = anchorX <= world.x ? anchorX : anchorX - newW;
            newY = anchorY <= world.y ? anchorY : anchorY - newH;
          } else if (anchorX !== null) {
            const centerY = mode.origY + mode.origH / 2;
            newX = anchorX <= world.x ? anchorX : anchorX - newW;
            newY = centerY - newH / 2;
          } else if (anchorY !== null) {
            const centerX = mode.origX + mode.origW / 2;
            newX = centerX - newW / 2;
            newY = anchorY <= world.y ? anchorY : anchorY - newH;
          }
        }

        let resizeProps: Partial<NodeProps> | undefined;
        if (node?.type === "text" && node.props.type === "text") {
          const widthRatio = mode.origW === 0 ? 1 : newW / mode.origW;
          const heightRatio = mode.origH === 0 ? 1 : newH / mode.origH;

          // Determine if this is a horizontal-only, vertical-only, or corner resize
          const isHorizontalOnly = anchorY === null && anchorX !== null;
          const isVerticalOnly = anchorX === null && anchorY !== null;
          const isCornerResize = anchorX !== null && anchorY !== null;

          let scale = 1;

          if (isVerticalOnly) {
            // Top/bottom edge: scale by height ratio
            scale = Math.max(0.1, heightRatio);
          } else if (isHorizontalOnly) {
            // Left/right edge: don't scale font, just change width
            scale = 1;
          } else if (isCornerResize) {
            // Corner resize: average both ratios for smooth, controlled scaling
            // (matches the speed of top/bottom edge resizing)
            scale = Math.max(0.1, (widthRatio + heightRatio) / 2);
          }

          // Only apply font scaling if not a horizontal-only resize
          if (!isHorizontalOnly && scale !== 1) {
            const baseFontSize = mode.origTextFontSize ?? node.props.fontSize;
            const nextFontSize = Math.max(8, baseFontSize * scale);

            // For smooth dragging, scale dimensions proportionally instead of remeasuring
            // Remeasuring on every move causes discrete steps due to Math.ceil in measureTextNodeSize
            newW = mode.origW * scale;
            newH = mode.origH * scale;

            if (anchorX !== null) {
              newX = anchorX <= world.x ? anchorX : anchorX - newW;
            }
            if (anchorY !== null) {
              newY = anchorY <= world.y ? anchorY : anchorY - newH;
            }
            resizeProps = {
              fontSize: nextFontSize,
            } as Partial<NodeProps>;
          } else if (isHorizontalOnly) {
            // For horizontal-only resize, keep height at original
            newH = mode.origH;
            resizeProps = undefined;
          }
        }

        dispatch({
          type: "RESIZE_NODE",
          nodeId: mode.nodeId,
          x: newX,
          y: newY,
          width: newW,
          height: newH,
          props: resizeProps,
        });
        return;
      }

      if (mode.kind === "multi-resize") {
        const world = screenToWorld(e.clientX, e.clientY, cam);
        const { origBbox: ob, handle, origNodes } = mode;
        const bboxW = ob.maxX - ob.minX;
        const bboxH = ob.maxY - ob.minY;
        if (bboxW === 0 || bboxH === 0) return;

        // Anchor is the corner opposite the dragged handle
        const anchorX = handle.includes("left") ? ob.maxX : ob.minX;
        const anchorY = handle.includes("top") ? ob.maxY : ob.minY;

        const scaleX = Math.abs(world.x - anchorX) / bboxW;
        const scaleY = Math.abs(world.y - anchorY) / bboxH;
        const scale = Math.max(0.05, Math.min(scaleX, scaleY));

        if (!interaction.current.undoPushed) {
          dispatch({ type: "PUSH_UNDO" });
          interaction.current.undoPushed = true;
        }

        dispatch({
          type: "RESIZE_MULTI_NODES",
          nodes: origNodes.map((n) => ({
            id: n.id,
            x: anchorX + (n.x - anchorX) * scale,
            y: anchorY + (n.y - anchorY) * scale,
            width: Math.max(10, n.w * scale),
            height: Math.max(10, n.h * scale),
          })),
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

        // If Cmd/Ctrl is held, append to existing selection; otherwise replace
        dispatch({
          type: "SELECT_NODES",
          nodeIds: hitIds,
          append: mode.metaKey,
        });
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
        const normalizedPoints: [number, number][] = newPoints.map(([px, py]) => [
          px - minX,
          py - minY,
        ]);
        dispatch({
          type: "RESIZE_NODE",
          nodeId: mode.nodeId,
          x: node.x + minX,
          y: node.y + minY,
          width: maxX - minX || 1,
          height: maxY - minY || 1,
        });
        dispatch({
          type: "UPDATE_NODE_PROPS",
          nodeId: mode.nodeId,
          props: { points: normalizedPoints } as Partial<NodeProps>,
        });
        return;
      }

      if (mode.kind === "create-shape") {
        const world = screenToWorld(e.clientX, e.clientY, cam);
        const dx = (e.clientX - (interaction.current as any).dragStartClientX) / cam.zoom;
        const dy = (e.clientY - (interaction.current as any).dragStartClientY) / cam.zoom;

        // Track drag distance and mark hasMoved when threshold exceeded
        if (!interaction.current.hasMoved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
          interaction.current.hasMoved = true;
        }

        if (s.activeTool === "arrow") {
          const snapped = e.shiftKey
            ? snapArrowVector(world.x - mode.startWorldX, world.y - mode.startWorldY)
            : { dx: world.x - mode.startWorldX, dy: world.y - mode.startWorldY };
          setArrowPreview({
            x1: mode.startWorldX,
            y1: mode.startWorldY,
            x2: mode.startWorldX + snapped.dx,
            y2: mode.startWorldY + snapped.dy,
          });
        } else {
          // Show preview for rect/ellipse/sticky shapes
          let rawDx = world.x - mode.startWorldX;
          let rawDy = world.y - mode.startWorldY;
          if (e.shiftKey && (s.activeTool === "rect" || s.activeTool === "ellipse")) {
            const side = Math.max(Math.abs(rawDx), Math.abs(rawDy));
            rawDx = Math.sign(rawDx) * side;
            rawDy = Math.sign(rawDy) * side;
          }
          const dragRect = normalizeRect(
            mode.startWorldX,
            mode.startWorldY,
            rawDx,
            rawDy
          );
          const x = dragRect.minX;
          const y = dragRect.minY;
          const w = dragRect.maxX - dragRect.minX;
          const h = dragRect.maxY - dragRect.minY;

          setShapePreview({
            x,
            y,
            width: w,
            height: h,
            type: s.activeTool,
          });
        }
        return;
      }
    },
    [hitTestNode]
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
        setActiveResizeHandle(null);
        return;
      }

      if (mode.kind === "connect-arrow") {
        setConnectionDrag(null);
        setArrowHoverNodeId(null);
        interaction.current.dragMode = { kind: "none" };

        const connectable = ["rect", "ellipse", "sticky", "text", "image"];
        const world = screenToWorld(e.clientX, e.clientY, s.document.camera);
        const snapDistance = 60; // World-space snap zone radius (larger area)

        // Find if cursor is within snap zone of any connectable node
        let targetNode: CanvasNode | null = null;
        for (const node of Object.values(s.document.nodes)) {
          if (node.id === mode.fromNodeId || !connectable.includes(node.props.type)) continue;
          const nodeCx = node.x + node.width / 2;
          const nodeCy = node.y + node.height / 2;
          const dist = Math.hypot(world.x - nodeCx, world.y - nodeCy);
          if (dist < snapDistance) {
            targetNode = node;
            break;
          }
        }

        if (targetNode) {
          // Connected arrow
          const fromNode = s.document.nodes[mode.fromNodeId];
          const { x1, y1, x2, y2 } = getConnectedArrowEndpoints(fromNode, targetNode);
          dispatch({
            type: "CREATE_NODE",
            nodeType: "arrow",
            x: x1, y: y1,
            width: Math.abs(x2 - x1) || 1,
            height: Math.abs(y2 - y1) || 1,
            props: {
              type: "arrow",
              dx: x2 - x1, dy: y2 - y1,
              stroke: s.activeStyle.color,
              strokeWidth: s.activeStyle.strokeWidth,
              strokeStyle: s.activeStyle.strokeStyle,
              fromNodeId: mode.fromNodeId,
              toNodeId: targetNode.id,
            },
          });
          dispatch({ type: "SET_TOOL", tool: "select" });
        } else {
          // Free arrow from source node edge to release point
          const fromNode = s.document.nodes[mode.fromNodeId];
          if (fromNode) {
            const srcEdge = getBBoxEdgePoint(fromNode, world.x, world.y);
            const dx = world.x - srcEdge.x;
            const dy = world.y - srcEdge.y;
            const len = Math.hypot(dx, dy);
            if (len > 5) {
              dispatch({
                type: "CREATE_NODE",
                nodeType: "arrow",
                x: srcEdge.x,
                y: srcEdge.y,
                width: Math.abs(dx),
                height: Math.abs(dy),
                props: {
                  type: "arrow",
                  dx,
                  dy,
                  stroke: s.activeStyle.color,
                  strokeWidth: s.activeStyle.strokeWidth,
                  strokeStyle: s.activeStyle.strokeStyle,
                },
              });
            }
          }
        }
        return;
      }

      if (mode.kind === "create-shape") {
        const tool = s.activeTool;
        const ast = s.activeStyle;

        setArrowPreview(null);
        setShapePreview(null);

        // If no real drag movement, create with default size (independent of zoom)
        if (!interaction.current.hasMoved) {
          if (tool === "arrow") {
            // Default horizontal arrow (independent of zoom)
            const defaultSize = 120;
            dispatch({
              type: "CREATE_NODE",
              nodeType: "arrow",
              x: mode.startWorldX,
              y: mode.startWorldY,
              width: defaultSize,
              height: 1,
              props: {
                type: "arrow",
                dx: defaultSize,
                dy: 0,
                stroke: ast.color,
                strokeWidth: ast.strokeWidth,
                strokeStyle: ast.strokeStyle,
              },
            });
          } else {
            // Other shapes: use default size (independent of zoom)
            const defaultSize = defaultSizeForTool(tool);
            const w = defaultSize.w;
            const h = defaultSize.h;
            const x = mode.startWorldX - w / 2;
            const y = mode.startWorldY - h / 2;
            dispatch({
              type: "CREATE_NODE",
              nodeType: tool as CanvasNode["type"],
              x,
              y,
              width: w,
              height: h,
              props: defaultPropsForTool(tool, ast),
            });
          }
          interaction.current.dragMode = { kind: "none" };
          setActiveResizeHandle(null);
          dispatch({ type: "SET_TOOL", tool: "select" });
          return;
        }

        // User dragged — create with custom size based on drag
        const endWorld = screenToWorld(e.clientX, e.clientY, cam);
        if (tool === "arrow") {
          const vector = e.shiftKey
            ? snapArrowVector(endWorld.x - mode.startWorldX, endWorld.y - mode.startWorldY)
            : { dx: endWorld.x - mode.startWorldX, dy: endWorld.y - mode.startWorldY };
          dispatch({
            type: "CREATE_NODE",
            nodeType: "arrow",
            x: mode.startWorldX,
            y: mode.startWorldY,
            width: Math.abs(vector.dx),
            height: Math.abs(vector.dy),
            props: {
              type: "arrow",
              dx: vector.dx,
              dy: vector.dy,
              stroke: ast.color,
              strokeWidth: ast.strokeWidth,
              strokeStyle: ast.strokeStyle,
            },
          });
        } else {
          let rawDx = endWorld.x - mode.startWorldX;
          let rawDy = endWorld.y - mode.startWorldY;
          if (e.shiftKey && (tool === "rect" || tool === "ellipse")) {
            const side = Math.max(Math.abs(rawDx), Math.abs(rawDy));
            rawDx = Math.sign(rawDx) * side;
            rawDy = Math.sign(rawDy) * side;
          }
          const dragRect = normalizeRect(
            mode.startWorldX,
            mode.startWorldY,
            rawDx,
            rawDy
          );
          dispatch({
            type: "CREATE_NODE",
            nodeType: tool as CanvasNode["type"],
            x: dragRect.minX,
            y: dragRect.minY,
            width: dragRect.maxX - dragRect.minX,
            height: dragRect.maxY - dragRect.minY,
            props: defaultPropsForTool(tool, ast),
          });
        }
        interaction.current.dragMode = { kind: "none" };
        setActiveResizeHandle(null);
        dispatch({ type: "SET_TOOL", tool: "select" });
      }

      if (mode.kind === "move") {
        // Double-click detection for text editing handled in onDoubleClick
      }



      interaction.current.hasMoved = false;
      interaction.current.undoPushed = false;
      interaction.current.dragMode = { kind: "none" };
      setActiveResizeHandle(null);
    },
    []
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const s = stateRef.current;
      const cam = s.document.camera;
      const world = screenToWorld(e.clientX, e.clientY, cam);

      const hit = hitTestNode(e.clientX, e.clientY);
      if (
        hit &&
        (hit.type === "text" ||
          hit.type === "sticky" ||
          hit.type === "rect" ||
          hit.type === "ellipse")
      ) {
        dispatch({ type: "SET_EDITING", nodeId: hit.id });
      } else {
        // Double-click on empty space: create a sticky at that position
        const stickySize = { w: 200, h: 200 };
        const x = world.x - stickySize.w / 2;
        const y = world.y - stickySize.h / 2;

        dispatch({
          type: "CREATE_NODE",
          nodeType: "sticky",
          x,
          y,
          width: stickySize.w,
          height: stickySize.h,
          props: defaultPropsForTool("sticky", s.activeStyle),
        });
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
    if (!node) return;

    // Delete empty text nodes
    const isEmpty =
      node.type === "text" &&
      "text" in node.props &&
      !(node.props.text as string).trim();

    if (isEmpty) {
      // Select the node and delete it
      dispatch({ type: "SELECT_NODES", nodeIds: [nodeId] });
      dispatch({ type: "DELETE_SELECTED" });
      return;
    }

    dispatch({ type: "SET_EDITING", nodeId: null });
    if (node.type === "text") {
      dispatch({ type: "SELECT_NODES", nodeIds: [nodeId] });
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Image upload helper
  // ---------------------------------------------------------------------------
  const createImageNodeFromFile = useCallback(
    async (file: File, worldX: number, worldY: number) => {
      // Read locally first to get dimensions and show immediately
      const localUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const img = new window.Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.src = localUrl;
      });

      const maxW = 400;
      const ratio = Math.min(maxW / img.width, 1);
      const w = img.width * ratio;
      const h = img.height * ratio;

      // Place node immediately with local data URL so the user sees it right away
      const nodeId = generateId();
      dispatch({
        type: "CREATE_NODE",
        nodeType: "image",
        id: nodeId,
        x: worldX - w / 2,
        y: worldY - h / 2,
        width: w,
        height: h,
        props: {
          type: "image",
          src: localUrl,
          alt: file.name,
          opacity: 1,
          fit: "contain",
          originalWidth: img.width,
          originalHeight: img.height,
        },
      });
      dispatch({ type: "SET_TOOL", tool: "select" });
      imageClickPosRef.current = null;

      // Upload to Supabase Storage in the background and swap the src.
      // pendingUploadsRef blocks autosave until all uploads have resolved.
      pendingUploadsRef.current += 1;
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const ext = file.name.split(".").pop() ?? "png";
        const path = `${user.id}/${projectId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("canvas-images")
          .upload(path, file, { contentType: file.type, upsert: false });

        if (uploadError) {
          console.error("[Image upload]", uploadError.message);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("canvas-images")
          .getPublicUrl(path);

        dispatch({
          type: "UPDATE_NODE_PROPS",
          nodeId,
          props: { src: publicUrl },
        });
      } catch (err) {
        console.error("[Image upload]", err);
      } finally {
        pendingUploadsRef.current -= 1;
      }
    },
    [projectId]
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
      // Let the browser handle paste natively when a text input is focused
      const activeEl = document.activeElement;
      if (activeEl instanceof HTMLTextAreaElement || activeEl instanceof HTMLInputElement) return;

      const items = e.clipboardData?.items;
      if (!items) return;
      let textHandled = false;
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
        } else if (!textHandled && (item.type === "text/html" || item.type === "text/plain")) {
          e.preventDefault();
          textHandled = true;
          const getTextWithFormatting = (callback: (text: string, bold?: boolean, italic?: boolean) => void) => {
            if (item.type === "text/html") {
              item.getAsString((html) => {
                // Try to extract text and detect formatting from HTML
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, "text/html");
                const text = doc.body.textContent || "";

                // Check for bold formatting (tags + CSS styles)
                let hasBold = false;
                let hasItalic = false;

                // Check HTML tags
                if (html.includes("<b>") || html.includes("<strong>")) hasBold = true;
                if (html.includes("<i>") || html.includes("<em>")) hasItalic = true;

                // Check CSS font-weight (700 or "bold" in style attributes)
                if (/font-weight\s*:\s*(bold|700|800|900|\d{3,})/i.test(html)) hasBold = true;

                // Check CSS font-style
                if (/font-style\s*:\s*italic/i.test(html)) hasItalic = true;

                callback(text, hasBold, hasItalic);
              });
            } else {
              item.getAsString((text) => callback(text, false, false));
            }
          };

          getTextWithFormatting((text, hasBold = false, hasItalic = false) => {
            if (!text.trim()) return;
            // Get screen center and convert to world
            const container = containerRef.current;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const screenCenterX = rect.width / 2;
            const screenCenterY = rect.height / 2;
            const world = screenToWorld(screenCenterX, screenCenterY, stateRef.current.document.camera);

            // Get current active style for the text node
            const style = stateRef.current.activeStyle;

            // Create text props with the pasted content and detected formatting
            const textProps = {
              text,
              fontSize: style.fontSize,
              color: style.color,
              fontFamily: style.fontFamily,
              fontWeight: hasBold ? "bold" : style.fontWeight,
              fontStyle: hasItalic ? "italic" : style.fontStyle,
              textDecoration: style.textDecoration,
            };

            // Measure the text to get proper dimensions
            const { width, height } = measureTextNodeSize(textProps as TextProps);

            // Create the text node centered at screen center and select it
            dispatch({
              type: "CREATE_NODE",
              nodeType: "text",
              x: world.x - width / 2,
              y: world.y - height / 2,
              width,
              height,
              props: { type: "text", ...textProps },
              selectNode: true,
            });
          });
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
  const hoveredNode =
    hoveredNodeId && !selection.nodeIds.has(hoveredNodeId)
      ? doc.nodes[hoveredNodeId] ?? null
      : null;

  const editingNode = editingNodeId ? doc.nodes[editingNodeId] : null;
  const hasPlainTextSelection = selectedNodes.some((node) => node.type === "text");
  const hasShapeTextSelection = selectedNodes.some(
    (node) => node.type === "rect" || node.type === "ellipse"
  );
  const hasStickySelection = selectedNodes.some((node) => node.type === "sticky");
  const hasTextSelection =
    hasPlainTextSelection ||
    hasShapeTextSelection ||
    hasStickySelection ||
    (editingNode?.type === "text") ||
    (editingNode?.type === "rect") ||
    (editingNode?.type === "ellipse") ||
    (editingNode?.type === "sticky");
  const singleSelectedNode = selectedNodes.length === 1 ? selectedNodes[0] : null;
  const hasImageSelection = singleSelectedNode?.type === "image";
  const imageToolbarPosition =
    singleSelectedNode?.type === "image"
      ? (() => {
          const topCenter = worldToScreen(
            singleSelectedNode.x + singleSelectedNode.width / 2,
            singleSelectedNode.y,
            cam
          );
          return { left: topCenter.x, top: topCenter.y };
        })()
      : null;

  return (
    <div
      className="fixed inset-0"
      style={{ display: "flex", flexDirection: "row", overflow: "hidden" }}
    >
    <div
      ref={containerRef}
      style={{
        flex: 1,
        position: "relative",
        overflow: "hidden",
        userSelect: "none",
        cursor: getCursorForTool(
          activeTool,
          spaceDown,
          activeResizeHandle ?? hoveredResizeHandle
        ),
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onPointerLeave={() => {
        setHoveredResizeHandle(null);
        setHoveredNodeId(null);
        setArrowHoverNodeId(null);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        const hit = hitTestNode(e.clientX, e.clientY);
        if (hit && !selection.nodeIds.has(hit.id)) {
          dispatch({ type: "SELECT_NODES", nodeIds: [hit.id], append: false });
        }
        setCanvasContextMenu({
          x: e.clientX,
          y: e.clientY,
          nodeId: hit?.id ?? null,
        });
      }}
    >
      <Link
        href="/projects"
        data-export-ignore
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: "20px",
          left: "24px",
          zIndex: 1000,
          display: isExporting ? "none" : "inline-flex",
          alignItems: "center",
          gap: "8px",
          color: "var(--klad-ink)",
          textDecoration: "none",
          userSelect: "none",
          mixBlendMode: "multiply",
        }}
      >
        <ChevronLeft
          size={14}
          style={{ color: "var(--klad-ink3)", flexShrink: 0 }}
          aria-hidden="true"
        />
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
        ref={svgRef}
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
            const isFadingIn = fadeInNodeIds.has(id);

            // Wrap node in fade-in group if it was just created by AI
            const wrapFadeIn = (el: React.ReactElement) =>
              isFadingIn ? (
                <g key={id} opacity={0}>
                  <animate
                    attributeName="opacity"
                    from="0"
                    to="1"
                    dur="0.35s"
                    fill="freeze"
                  />
                  {el}
                </g>
              ) : (
                el
              );

            switch (node.type) {
              case "text":
                return wrapFadeIn(
                  <TextNode
                    key={isFadingIn ? `${id}-fade` : id}
                    node={node}
                    isSelected={isSelected}
                    isEditing={isEditing}
                    isResizing={isSelected && activeResizeHandle != null}
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
                    onResize={(w, h) => handleNodeSizeChange(id, w, h)}
                    onBlur={() => handleTextBlur(id)}
                  />
                );
              case "rect":
                return (
                  <RectNode
                    key={id}
                    node={node}
                    isSelected={isSelected}
                    isEditing={isEditing}
                    onTextChange={(t) => handleTextChange(id, t)}
                    onBlur={() => handleTextBlur(id)}
                    onResize={(w, h) => handleNodeSizeChange(id, w, h)}
                  />
                );
              case "ellipse":
                return (
                  <EllipseNode
                    key={id}
                    node={node}
                    isSelected={isSelected}
                    isEditing={isEditing}
                    onTextChange={(t) => handleTextChange(id, t)}
                    onBlur={() => handleTextBlur(id)}
                    onResize={(w, h) => handleNodeSizeChange(id, w, h)}
                  />
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
                  <ArrowNode key={id} node={node} isSelected={isSelected} allNodes={doc.nodes} />
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

          {/* Shape preview during drag */}
          {shapePreview && (
            <g opacity={0.5} pointerEvents="none">
              {shapePreview.type === "ellipse" ? (
                <ellipse
                  cx={shapePreview.x + shapePreview.width / 2}
                  cy={shapePreview.y + shapePreview.height / 2}
                  rx={Math.max(0, shapePreview.width / 2)}
                  ry={Math.max(0, shapePreview.height / 2)}
                  fill={state.activeStyle.color}
                  fillOpacity={state.activeStyle.fillStyle === "semi" ? 0.25 : state.activeStyle.fillStyle === "none" ? 0 : 1}
                  stroke={state.activeStyle.color}
                  strokeWidth={state.activeStyle.strokeWidth}
                />
              ) : (
                <rect
                  x={shapePreview.x}
                  y={shapePreview.y}
                  width={Math.max(0, shapePreview.width)}
                  height={Math.max(0, shapePreview.height)}
                  rx={2}
                  fill={state.activeStyle.color}
                  fillOpacity={state.activeStyle.fillStyle === "semi" ? 0.25 : state.activeStyle.fillStyle === "none" ? 0 : 1}
                  stroke={state.activeStyle.color}
                  strokeWidth={state.activeStyle.strokeWidth}
                />
              )}
            </g>
          )}

          {/* Arrow tool: open grey circle on connectable node when hovering (not dragging) */}
          {state.activeTool === "arrow" && arrowHoverNodeId && !connectionDrag && (() => {
            const n = doc.nodes[arrowHoverNodeId];
            if (!n) return null;
            const cx = n.x + n.width / 2;
            const cy = n.y + n.height / 2;
            return (
              <circle
                cx={cx} cy={cy}
                r={6 / cam.zoom}
                fill="none"
                stroke="#9ca3af"
                strokeWidth={1.5 / cam.zoom}
                pointerEvents="none"
              />
            );
          })()}

          {/* Connection drag visuals */}
          {connectionDrag && (() => {
            const fromNode = doc.nodes[connectionDrag.fromNodeId];
            if (!fromNode) return null;

            const fromCx = fromNode.x + fromNode.width / 2;
            const fromCy = fromNode.y + fromNode.height / 2;
            const sw = state.activeStyle.strokeWidth;
            const color = state.activeStyle.color;
            const z = cam.zoom;

            const targetNode = connectionDrag.targetNodeId ? doc.nodes[connectionDrag.targetNodeId] : null;

            // Arrow snaps to target node edge if within snap zone, else follows cursor
            let arrowX2: number, arrowY2: number;
            if (targetNode) {
              const tgtEdge = getBBoxEdgePoint(targetNode, fromCx, fromCy);
              arrowX2 = tgtEdge.x;
              arrowY2 = tgtEdge.y;
            } else {
              arrowX2 = connectionDrag.cursorX;
              arrowY2 = connectionDrag.cursorY;
            }

            // Source edge points toward where the arrow goes (target edge or cursor)
            const srcEdge = getBBoxEdgePoint(fromNode, arrowX2, arrowY2);

            const crossSize = 6 / z;

            return (
              <g pointerEvents="none">
                {/* Source: open grey circle at node center */}
                <circle
                  cx={fromCx} cy={fromCy}
                  r={6 / z}
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth={1.5 / z}
                />
                {/* Source: grey dashed from center to edge */}
                <line
                  x1={fromCx} y1={fromCy}
                  x2={srcEdge.x} y2={srcEdge.y}
                  stroke="#9ca3af"
                  strokeWidth={1 / z}
                  strokeDasharray={`${4 / z} ${3 / z}`}
                  strokeLinecap="round"
                />

                {/* Main arrow: colored, from source edge to arrow end */}
                <line
                  x1={srcEdge.x} y1={srcEdge.y}
                  x2={arrowX2} y2={arrowY2}
                  stroke={color}
                  strokeWidth={sw}
                  strokeDasharray={`${6 / z} ${4 / z}`}
                  strokeOpacity={0.8}
                  strokeLinecap="butt"
                />
                <path
                  d={arrowheadPath(srcEdge.x, srcEdge.y, arrowX2, arrowY2)}
                  stroke={color}
                  strokeWidth={sw}
                  fill="none"
                  strokeOpacity={0.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Grey X at target node center when snapped */}
                {targetNode && (() => {
                  const tgtCx = targetNode.x + targetNode.width / 2;
                  const tgtCy = targetNode.y + targetNode.height / 2;
                  return (
                    <>
                      <line
                        x1={tgtCx - crossSize} y1={tgtCy - crossSize}
                        x2={tgtCx + crossSize} y2={tgtCy + crossSize}
                        stroke="#9ca3af" strokeWidth={1.5 / z} strokeLinecap="round"
                      />
                      <line
                        x1={tgtCx + crossSize} y1={tgtCy - crossSize}
                        x2={tgtCx - crossSize} y2={tgtCy + crossSize}
                        stroke="#9ca3af" strokeWidth={1.5 / z} strokeLinecap="round"
                      />
                    </>
                  );
                })()}
              </g>
            );
          })()}

          {/* Target node highlight during connection drag */}
          {connectionDrag && connectionDrag.targetNodeId && (() => {
            const targetNode = doc.nodes[connectionDrag.targetNodeId];
            if (!targetNode) return null;
            const bounds = getNodeBounds(targetNode);
            const padding = 4 / cam.zoom;
            return (
              <rect
                x={bounds.minX - padding}
                y={bounds.minY - padding}
                width={bounds.maxX - bounds.minX + padding * 2}
                height={bounds.maxY - bounds.minY + padding * 2}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={1.5 / cam.zoom}
                pointerEvents="none"
              />
            );
          })()}

          {/* Selection overlay (handles, marquee) */}
          {!cropMode && !isExporting && (
            <SelectionOverlay
              selectedNodes={selectedNodes}
              hoveredNode={hoveredNode}
              marquee={selection.marquee}
              camera={cam}
              editingNodeId={editingNodeId}
              stylePreviewNonce={stylePreviewNonce}
              allNodes={doc.nodes}
              onAiAction={handleAiChat}
              isAiLoading={aiChatLoading}
            />
          )}

        </g>
      </svg>

      {/* Crop overlay — shows when image is in crop mode */}
      {cropMode && !isExporting && (() => {
        const node = stateRef.current.document.nodes[cropMode.nodeId];
        if (!node) return null;
        const screenPos = worldToScreen(node.x, node.y, state.document.camera);
        return (
          <ImageCropOverlay
            nodeWidth={node.width}
            nodeHeight={node.height}
            nodeX={screenPos.x}
            nodeY={screenPos.y}
            zoom={state.document.camera.zoom}
            onCropChange={(newBox) => {
              setCropMode((prev) => (prev ? { ...prev, cropBox: newBox } : null));
            }}
            onConfirm={async (finalCropBox) => {
              if (node.type !== "image" || !cropMode) return;
              const imgProps = node.props as { type: "image" } & ImageProps;
              try {
                const result = await cropImagePixels(
                  imgProps.src,
                  finalCropBox,
                  node.width,
                  node.height,
                  imgProps.fit || "contain",
                  imgProps.mimeType,
                );
                dispatch({
                  type: "RESIZE_NODE",
                  nodeId: cropMode.nodeId,
                  x: node.x + finalCropBox.x,
                  y: node.y + finalCropBox.y,
                  width: finalCropBox.width,
                  height: finalCropBox.height,
                  props: {
                    type: "image",
                    src: result.dataUrl,
                    alt: imgProps.alt,
                    opacity: imgProps.opacity,
                    fit: "contain",
                    mimeType: imgProps.mimeType,
                    originalWidth: result.width,
                    originalHeight: result.height,
                  },
                });
              } catch {
                // Crop failed — silently cancel
              }
              setCropMode(null);
            }}
            onCancel={() => setCropMode(null)}
          />
        );
      })()}

      {/* Toolbar group — ActionBar floats above the select button */}
      <div
        data-export-ignore
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          left: aiChatOpen
            ? `calc((100% - ${AI_SIDEBAR_WIDTH}px) / 2)`
            : "50%",
          bottom: "16px",
          transform: "translateX(-50%)",
          transition: "left 0.25s ease",
          zIndex: 50,
          display: isExporting ? "none" : "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "8px",
        }}
      >
        <ActionBar
          canUndo={state.undoStack.length > 0}
          canRedo={state.redoStack.length > 0}
          hasSelection={selection.nodeIds.size > 0}
          onUndo={() => dispatch({ type: "UNDO" })}
          onRedo={() => dispatch({ type: "REDO" })}
          onDelete={handleDeleteSelected}
          onDuplicate={() => {
            const ids = [...selection.nodeIds];
            if (ids.length > 0) dispatch({ type: "DUPLICATE_NODES", nodeIds: ids });
          }}
        />
        <div style={{ display: "flex", flexDirection: "row", gap: "8px", alignItems: "center" }}>
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
          <div data-ai-button>
            <KladAiButton
              disabled={false}
              isLoading={aiChatLoading}
              isOpen={aiChatOpen}
              onClick={() => {
                if (!aiChatOpen) {
                  setAiChatMessages([]);
                }
                setAiChatOpen((o) => !o);
              }}
            />
          </div>
          <AiUsageCounter refreshKey={usageRefreshKey} />
        </div>
      </div>
      <div data-export-ignore style={isExporting ? { display: "none" } : undefined}>
        <ZoomControls
          zoom={cam.zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitContent={handleFitContent}
        />
      </div>
      <div data-export-ignore style={isExporting ? { display: "none" } : undefined}>
        <SaveIndicator status={saveStatus} rightOffset={aiChatOpen ? AI_SIDEBAR_WIDTH : 0} />
      </div>
      <div data-export-ignore style={isExporting ? { display: "none" } : undefined}>
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      </div>
      {canvasContextMenu && !isExporting && (
        <CanvasContextMenu
          x={canvasContextMenu.x}
          y={canvasContextMenu.y}
          nodeId={canvasContextMenu.nodeId}
          hasClipboard={hasClipboard}
          isImageNode={
            canvasContextMenu.nodeId
              ? stateRef.current.document.nodes[canvasContextMenu.nodeId]?.type === "image"
              : false
          }
          onCopy={handleCopyToClipboard}
          onPaste={handlePasteFromClipboard}
          onDuplicate={() => {
            const ids = [...selection.nodeIds];
            if (ids.length > 0) dispatch({ type: "DUPLICATE_NODES", nodeIds: ids });
          }}
          onDelete={handleDeleteSelected}
          onSelectAll={handleSelectAll}
          onBringToFront={() => {
            const ids = [...selection.nodeIds];
            if (ids.length > 0) dispatch({ type: "BRING_TO_FRONT", nodeIds: ids });
          }}
          onSendToBack={() => {
            const ids = [...selection.nodeIds];
            if (ids.length > 0) dispatch({ type: "SEND_TO_BACK", nodeIds: ids });
          }}
          onCrop={() => {
            const nodeId = canvasContextMenu?.nodeId;
            if (!nodeId) return;
            const node = stateRef.current.document.nodes[nodeId];
            if (!node || node.type !== "image") return;
            setCropMode({
              nodeId: node.id,
              cropBox: {
                x: 0,
                y: 0,
                width: node.width,
                height: node.height,
              },
            });
            setCanvasContextMenu(null);
          }}
          onClose={() => setCanvasContextMenu(null)}
        />
      )}
      {hasImageSelection && imageToolbarPosition && !isExporting && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            left: imageToolbarPosition.left,
            top: imageToolbarPosition.top,
            transform: "translate(-50%, calc(-100% - 18px))",
            zIndex: 1000,
            display: "flex",
            gap: "5px",
            padding: "5px",
            backgroundColor: "var(--klad-paper, #f7f4ef)",
            border: "1px solid var(--klad-ink, #1a1814)",
            boxShadow: "3px 3px 0 var(--klad-ink, #1a1814)",
          }}
        >
          <button
            type="button"
            onClick={() => {
              if (singleSelectedNode?.type !== "image") return;
              setCropMode({
                nodeId: singleSelectedNode.id,
                cropBox: {
                  x: 0,
                  y: 0,
                  width: singleSelectedNode.width,
                  height: singleSelectedNode.height,
                },
              });
            }}
            style={imageToolbarButtonStyle}
            title="Crop image"
            aria-label="Crop image"
          >
            <Crop size={16} />
          </button>
          <a
            href={(singleSelectedNode.props as { src?: string }).src}
            download={(singleSelectedNode.props as { alt?: string }).alt || "image"}
            onClick={(e) => e.stopPropagation()}
            style={{
              ...imageToolbarButtonStyle,
              textDecoration: "none",
            }}
            title="Download original"
            aria-label="Download original"
          >
            <Download size={16} />
          </a>
        </div>
      )}
      <div data-export-ignore style={isExporting ? { display: "none" } : undefined}>
      <CanvasMenu
        canUndo={state.undoStack.length > 0}
        canRedo={state.redoStack.length > 0}
        hasSelection={selection.nodeIds.size > 0}
        onUndo={() => dispatch({ type: "UNDO" })}
        onRedo={() => dispatch({ type: "REDO" })}
        onSelectAll={handleSelectAll}
        onDeselect={handleDeselect}
        onDelete={handleDeleteSelected}
        onDuplicate={() => {
          const ids = Array.from(selection.nodeIds);
          if (ids.length > 0) {
            dispatch({ type: "DUPLICATE_NODES", nodeIds: ids });
          }
        }}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitContent={handleFitContent}
        onExportPng={handleExportPng}
        onExportSvg={handleExportSvg}
        onExportPdf={handleExportPdf}
      />
      {/* Feedback button — sits right of the CanvasMenu (...) button */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{ position: "fixed", top: "12px", left: "170px", zIndex: 50 }}
      >
        <FeedbackButton variant="canvas" />
      </div>
      </div>

      <div data-export-ignore style={isExporting ? { display: "none" } : undefined}>
      <StylePanel
        activeStyle={state.activeStyle}
        hasSelection={selection.nodeIds.size > 0 || !!editingNodeId}
        selectedNodeCount={selection.nodeIds.size}
        showTextControls={
          hasTextSelection ||
          editingNode?.type === "text" ||
          editingNode?.type === "rect" ||
          editingNode?.type === "ellipse" ||
          editingNode?.type === "sticky"
        }
        showShapeTextControls={
          hasShapeTextSelection ||
          editingNode?.type === "rect" ||
          editingNode?.type === "ellipse"
        }
        showImageControls={hasImageSelection}
        showStickyControls={
          hasStickySelection || editingNode?.type === "sticky"
        }
        onStyleChange={(partial) => {
          setStylePreviewNonce((value) => value + 1);
          dispatch({ type: "SET_ACTIVE_STYLE", style: partial });
          // Update editing node if one exists
          if (editingNodeId) {
            dispatch({ type: "UPDATE_NODE_PROPS", nodeId: editingNodeId, props: partial });
          }
          // Also update selected nodes
          for (const nodeId of selection.nodeIds) {
            dispatch({ type: "UPDATE_NODE_PROPS", nodeId, props: partial });
          }
        }}
        onAlign={(alignment) => {
          dispatch({
            type: "ALIGN_NODES",
            nodeIds: Array.from(selection.nodeIds),
            alignment,
          });
        }}
        onZOrder={(action) => {
          const ids = Array.from(selection.nodeIds);
          const actionMap = {
            "bring-to-front": "BRING_TO_FRONT",
            "bring-forward": "BRING_FORWARD",
            "send-backward": "SEND_BACKWARD",
            "send-to-back": "SEND_TO_BACK",
          } as const;
          dispatch({ type: actionMap[action], nodeIds: ids });
        }}
      />
      </div>

      {/* Hidden image file input */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleImageFileChange}
      />
    </div>

    {/* AI Sidebar */}
    <AiSidebar
      isOpen={aiChatOpen}
      isLoading={aiChatLoading}
      messages={aiChatMessages}
      selectedCount={selection.nodeIds.size}
      totalNodes={Object.keys(doc.nodes).length}
      onSend={handleAiChat}
      onClose={() => setAiChatOpen(false)}
    />

    {/* Export overlay — outside containerRef so html2canvas won't capture it */}
    {isExporting && (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(247, 244, 239, 0.85)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-ibm-plex-mono), monospace",
            fontSize: "14px",
            color: "var(--klad-ink3)",
          }}
        >
          Exporting…
        </span>
      </div>
    )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCursorForTool(
  tool: Tool,
  spaceDown: boolean,
  resizeHandle: ResizeHandle | null = null
): string {
  if (spaceDown) return "grab";
  if (resizeHandle) return getCursorForResizeHandle(resizeHandle);
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

function getCursorForResizeHandle(handle: ResizeHandle): string {
  switch (handle) {
    case "top-left":
    case "bottom-right":
      return "nwse-resize";
    case "top-right":
    case "bottom-left":
      return "nesw-resize";
    case "left":
    case "right":
      return "ew-resize";
    case "top":
    case "bottom":
      return "ns-resize";
    default:
      return "default";
  }
}

function snapArrowVector(dx: number, dy: number): { dx: number; dy: number } {
  const length = Math.hypot(dx, dy);
  if (length === 0) return { dx: 0, dy: 0 };

  const step = Math.PI / 4;
  const angle = Math.atan2(dy, dx);
  const snappedAngle = Math.round(angle / step) * step;

  return {
    dx: Math.cos(snappedAngle) * length,
    dy: Math.sin(snappedAngle) * length,
  };
}

function defaultSizeForTool(tool: Tool): { w: number; h: number } {
  switch (tool) {
    case "text":
      return { w: 200, h: 40 };
    case "sticky":
      return { w: 200, h: 200 };
    case "rect":
      return { w: 150, h: 150 };
    case "ellipse":
      return { w: 120, h: 120 };
    default:
      return { w: 150, h: 100 };
  }
}

function defaultPropsForTool(tool: Tool, style: ActiveStyle): NodeProps {
  switch (tool) {
    case "text":
      return {
        type: "text",
        text: "",
        fontSize: style.fontSize,
        color: style.color,
        fontFamily: style.fontFamily,
        fontWeight: style.fontWeight,
        fontStyle: style.fontStyle,
        textDecoration: style.textDecoration,
      };
    case "sticky":
      return {
        type: "sticky",
        text: "",
        color: "yellow",
        fontSize: 14,
        fontFamily: "sans",
        fontWeight: "normal",
        fontStyle: "normal",
        textDecoration: "none",
      };
    case "rect":
      return {
        type: "rect",
        fill: style.color,
        stroke: style.color,
        strokeWidth: style.strokeWidth,
        strokeStyle: style.strokeStyle,
        fillStyle: style.fillStyle,
        text: "",
        fontSize: style.fontSize,
        fontFamily: style.fontFamily,
        fontWeight: style.fontWeight,
        fontStyle: style.fontStyle,
        textDecoration: style.textDecoration,
      };
    case "ellipse":
      return {
        type: "ellipse",
        fill: style.color,
        stroke: style.color,
        strokeWidth: style.strokeWidth,
        strokeStyle: style.strokeStyle,
        fillStyle: style.fillStyle,
        text: "",
        fontSize: style.fontSize,
        fontFamily: style.fontFamily,
        fontWeight: style.fontWeight,
        fontStyle: style.fontStyle,
        textDecoration: style.textDecoration,
      };
    default:
      return { type: "rect", fill: "transparent", stroke: style.color, strokeWidth: style.strokeWidth };
  }
}

const imageToolbarButtonStyle = {
  width: "31px",
  height: "31px",
  border: "1px solid var(--klad-ink3, #7a756e)",
  background: "transparent",
  color: "var(--klad-ink, #1a1814)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};
