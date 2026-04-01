// ---------------------------------------------------------------------------
// Canvas Engine — State Reducer (immutable, with undo/redo)
// ---------------------------------------------------------------------------

import type {
  CanvasDocument,
  CanvasNode,
  Camera,
  EditorState,
  Tool,
  NodeProps,
  ActiveStyle,
} from "./types";
import { createEmptyDocument, generateId } from "./types";

const MAX_UNDO = 50;

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type AlignmentType =
  | "left"
  | "center-h"
  | "right"
  | "top"
  | "center-v"
  | "bottom"
  | "distribute-h"
  | "distribute-v";

export type CanvasAction =
  | { type: "SET_DOCUMENT"; document: CanvasDocument }
  | { type: "SET_CAMERA"; camera: Camera }
  | { type: "SET_TOOL"; tool: Tool }
  | { type: "SELECT_NODES"; nodeIds: string[]; append?: boolean }
  | { type: "SELECT_ALL" }
  | { type: "CLEAR_SELECTION" }
  | {
      type: "SET_MARQUEE";
      marquee: { x: number; y: number; width: number; height: number } | null;
    }
  | {
      type: "CREATE_NODE";
      nodeType: CanvasNode["type"];
      x: number;
      y: number;
      width: number;
      height: number;
      props: NodeProps;
    }
  | { type: "DELETE_SELECTED" }
  | { type: "MOVE_NODES"; nodeIds: string[]; dx: number; dy: number }
  | {
      type: "RESIZE_NODE";
      nodeId: string;
      x: number;
      y: number;
      width: number;
      height: number;
      props?: Partial<NodeProps>;
    }
  | { type: "UPDATE_NODE_SIZE"; nodeId: string; width: number; height: number }
  | { type: "UPDATE_NODE_PROPS"; nodeId: string; props: Partial<NodeProps> }
  | { type: "UPDATE_NODE_TEXT"; nodeId: string; text: string }
  | { type: "SET_EDITING"; nodeId: string | null }
  | { type: "SET_ACTIVE_STYLE"; style: Partial<ActiveStyle> }
  | { type: "ALIGN_NODES"; nodeIds: string[]; alignment: AlignmentType }
  | { type: "DUPLICATE_NODES"; nodeIds: string[] }
  | { type: "PASTE_NODES"; nodes: CanvasNode[] }
  | {
      type: "APPLY_ORGANIZE";
      updates: Array<{ nodeId: string; x: number; y: number; width: number; height: number }>;
      newNodes: CanvasNode[];
    }
  | { type: "BRING_TO_FRONT"; nodeIds: string[] }
  | { type: "BRING_FORWARD"; nodeIds: string[] }
  | { type: "SEND_BACKWARD"; nodeIds: string[] }
  | { type: "SEND_TO_BACK"; nodeIds: string[] }
  | { type: "UNDO" }
  | { type: "REDO" };

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

export function createInitialState(
  document?: CanvasDocument | null
): EditorState {
  return {
    document: document ?? createEmptyDocument(),
    selection: { nodeIds: new Set(), marquee: null },
    activeTool: "select",
    editingNodeId: null,
    undoStack: [],
    redoStack: [],
    activeStyle: {
      color: "#1a1814",
      strokeStyle: "solid",
      fillStyle: "none",
      strokeWidth: 2,
      opacity: 1,
      fontSize: 24,
      fontFamily: "sans",
      fontWeight: "normal",
      fontStyle: "normal",
      textDecoration: "none",
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pushUndo(state: EditorState): EditorState {
  const undoStack = [state.document, ...state.undoStack].slice(0, MAX_UNDO);
  return { ...state, undoStack, redoStack: [] };
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function canvasReducer(
  state: EditorState,
  action: CanvasAction
): EditorState {
  switch (action.type) {
    case "SET_DOCUMENT":
      return { ...state, document: action.document };

    case "SET_CAMERA":
      return {
        ...state,
        document: { ...state.document, camera: action.camera },
      };

    case "SET_TOOL":
      return {
        ...state,
        activeTool: action.tool,
        editingNodeId: null,
      };

    case "SELECT_NODES": {
      const ids = action.append
        ? new Set([...state.selection.nodeIds, ...action.nodeIds])
        : new Set(action.nodeIds);
      return {
        ...state,
        selection: { ...state.selection, nodeIds: ids },
      };
    }

    case "SELECT_ALL":
      return {
        ...state,
        selection: {
          ...state.selection,
          nodeIds: new Set(state.document.nodeOrder),
        },
      };

    case "CLEAR_SELECTION":
      return {
        ...state,
        selection: { nodeIds: new Set(), marquee: null },
        editingNodeId: null,
      };

    case "SET_MARQUEE":
      return {
        ...state,
        selection: { ...state.selection, marquee: action.marquee },
      };

    case "CREATE_NODE": {
      const withUndo = pushUndo(state);
      const id = generateId();
      const node: CanvasNode = {
        id,
        type: action.nodeType,
        x: action.x,
        y: action.y,
        width: action.width,
        height: action.height,
        rotation: 0,
        props: action.props,
      };
      return {
        ...withUndo,
        document: {
          ...withUndo.document,
          nodes: { ...withUndo.document.nodes, [id]: node },
          nodeOrder: [...withUndo.document.nodeOrder, id],
        },
        selection: {
          nodeIds:
            node.type === "text" ? new Set<string>() : new Set([id]),
          marquee: null,
        },
        activeTool: node.type === "freehand" ? "freehand" : "select",
        editingNodeId:
          node.type === "text" || node.type === "sticky" ? id : null,
      };
    }

    case "DELETE_SELECTED": {
      if (state.selection.nodeIds.size === 0) return state;
      const withUndo = pushUndo(state);
      const nodes = { ...withUndo.document.nodes };
      const toDelete = new Set(withUndo.selection.nodeIds);
      // Cascade-delete connected arrows that reference any deleted node
      for (const id of Object.keys(nodes)) {
        const n = nodes[id];
        if (n?.props.type === "arrow") {
          const { fromNodeId, toNodeId } = n.props;
          if ((fromNodeId && toDelete.has(fromNodeId)) || (toNodeId && toDelete.has(toNodeId))) {
            toDelete.add(id);
          }
        }
      }
      for (const id of toDelete) delete nodes[id];
      return {
        ...withUndo,
        document: {
          ...withUndo.document,
          nodes,
          nodeOrder: withUndo.document.nodeOrder.filter(
            (id) => !toDelete.has(id)
          ),
        },
        selection: { nodeIds: new Set(), marquee: null },
        editingNodeId: null,
      };
    }

    case "DUPLICATE_NODES": {
      if (action.nodeIds.length === 0) return state;
      const withUndo = pushUndo(state);
      const nodes = { ...withUndo.document.nodes };
      const nodeOrder = [...withUndo.document.nodeOrder];
      const newIds: string[] = [];
      const OFFSET = 20;
      for (const id of action.nodeIds) {
        const n = nodes[id];
        if (!n) continue;
        const newId = generateId();
        nodes[newId] = { ...n, id: newId, x: n.x + OFFSET, y: n.y + OFFSET };
        nodeOrder.push(newId);
        newIds.push(newId);
      }
      return {
        ...withUndo,
        document: { ...withUndo.document, nodes, nodeOrder },
        selection: { nodeIds: new Set(newIds), marquee: null },
      };
    }

    case "MOVE_NODES": {
      if (action.nodeIds.length === 0) return state;
      const nodes = { ...state.document.nodes };
      for (const id of action.nodeIds) {
        const n = nodes[id];
        if (n) {
          nodes[id] = { ...n, x: n.x + action.dx, y: n.y + action.dy };
        }
      }
      return {
        ...state,
        document: { ...state.document, nodes },
      };
    }

    case "RESIZE_NODE": {
      const n = state.document.nodes[action.nodeId];
      if (!n) return state;
      return {
        ...state,
        document: {
          ...state.document,
          nodes: {
            ...state.document.nodes,
            [action.nodeId]: {
              ...n,
              x: action.x,
              y: action.y,
              width: action.width,
              height: action.height,
              props: action.props
                ? ({ ...n.props, ...action.props } as NodeProps)
                : n.props,
            },
          },
        },
      };
    }

    case "UPDATE_NODE_SIZE": {
      const n = state.document.nodes[action.nodeId];
      if (!n) return state;
      return {
        ...state,
        document: {
          ...state.document,
          nodes: {
            ...state.document.nodes,
            [action.nodeId]: {
              ...n,
              width: action.width,
              height: action.height,
            },
          },
        },
      };
    }

    case "UPDATE_NODE_PROPS": {
      const n = state.document.nodes[action.nodeId];
      if (!n) return state;
      const withUndo = pushUndo(state);
      return {
        ...withUndo,
        document: {
          ...withUndo.document,
          nodes: {
            ...withUndo.document.nodes,
            [action.nodeId]: {
              ...n,
              props: { ...n.props, ...action.props } as NodeProps,
            },
          },
        },
      };
    }

    case "UPDATE_NODE_TEXT": {
      const n = state.document.nodes[action.nodeId];
      if (
        !n ||
        (n.props.type !== "text" &&
          n.props.type !== "sticky" &&
          n.props.type !== "rect" &&
          n.props.type !== "ellipse")
      ) {
        return state;
      }
      return {
        ...state,
        document: {
          ...state.document,
          nodes: {
            ...state.document.nodes,
            [action.nodeId]: {
              ...n,
              props: { ...n.props, text: action.text } as NodeProps,
            },
          },
        },
      };
    }

    case "SET_EDITING":
      if (action.nodeId && action.nodeId !== state.editingNodeId) {
        const withUndo = pushUndo(state);
        return { ...withUndo, editingNodeId: action.nodeId };
      }
      return { ...state, editingNodeId: action.nodeId };

    case "SET_ACTIVE_STYLE": {
      const newStyle = { ...state.activeStyle, ...action.style };
      // Also propagate the change to any selected nodes
      if (state.selection.nodeIds.size === 0) {
        return { ...state, activeStyle: newStyle };
      }
      const withUndo = pushUndo(state);
      const nodes = { ...withUndo.document.nodes };
      for (const id of state.selection.nodeIds) {
        const n = nodes[id];
        if (!n) continue;
        const updatedProps: Record<string, unknown> = { ...n.props };
        if ("color" in action.style) {
          if (n.props.type === "text") {
            updatedProps.color = action.style.color;
          } else if ("stroke" in n.props) {
            updatedProps.stroke = action.style.color;
            updatedProps.fill = action.style.color;
          }
        }
        if ("strokeStyle" in action.style && "strokeStyle" in n.props) {
          updatedProps.strokeStyle = action.style.strokeStyle;
        }
        if ("fillStyle" in action.style && "fillStyle" in n.props) {
          updatedProps.fillStyle = action.style.fillStyle;
        }
        if (action.style.strokeWidth != null && "strokeWidth" in n.props) {
          updatedProps.strokeWidth = action.style.strokeWidth;
        }
        if (action.style.opacity != null && n.props.type === "image") {
          updatedProps.opacity = action.style.opacity;
        }
        if (
          action.style.fontSize != null &&
          (n.props.type === "text" ||
            n.props.type === "sticky" ||
            n.props.type === "rect" ||
            n.props.type === "ellipse")
        ) {
          updatedProps.fontSize = action.style.fontSize;
        }
        if (
          action.style.fontFamily != null &&
          (n.props.type === "text" ||
            n.props.type === "sticky" ||
            n.props.type === "rect" ||
            n.props.type === "ellipse")
        ) {
          updatedProps.fontFamily = action.style.fontFamily;
        }
        if (
          action.style.fontWeight != null &&
          (n.props.type === "text" ||
            n.props.type === "sticky" ||
            n.props.type === "rect" ||
            n.props.type === "ellipse")
        ) {
          updatedProps.fontWeight = action.style.fontWeight;
        }
        if (
          action.style.fontStyle != null &&
          (n.props.type === "text" ||
            n.props.type === "sticky" ||
            n.props.type === "rect" ||
            n.props.type === "ellipse")
        ) {
          updatedProps.fontStyle = action.style.fontStyle;
        }
        if (
          action.style.textDecoration != null &&
          (n.props.type === "text" ||
            n.props.type === "sticky" ||
            n.props.type === "rect" ||
            n.props.type === "ellipse")
        ) {
          updatedProps.textDecoration = action.style.textDecoration;
        }
        nodes[id] = { ...n, props: updatedProps as NodeProps };
      }
      return {
        ...withUndo,
        activeStyle: newStyle,
        document: { ...withUndo.document, nodes },
      };
    }

    case "ALIGN_NODES": {
      if (action.nodeIds.length < 2) return state;
      const withUndo = pushUndo(state);
      const nodes = { ...withUndo.document.nodes };
      const toAlign = action.nodeIds
        .map((id) => ({ id, node: nodes[id] }))
        .filter((entry): entry is { id: string; node: CanvasNode } => !!entry.node);

      if (toAlign.length < 2) return state;

      const alignment = action.alignment;

      // Compute bounding box
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      for (const { node } of toAlign) {
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x + node.width);
        maxY = Math.max(maxY, node.y + node.height);
      }

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      // Apply alignment
      for (const { id, node } of toAlign) {
        let newX = node.x;
        let newY = node.y;

        switch (alignment) {
          case "left":
            newX = minX;
            break;
          case "center-h":
            newX = centerX - node.width / 2;
            break;
          case "right":
            newX = maxX - node.width;
            break;
          case "top":
            newY = minY;
            break;
          case "center-v":
            newY = centerY - node.height / 2;
            break;
          case "bottom":
            newY = maxY - node.height;
            break;
          case "distribute-h": {
            // Sort by x position and distribute evenly
            const sorted = toAlign.sort((a, b) => a.node.x - b.node.x);
            const totalGap = maxX - minX - sorted.reduce((sum, { node: n }) => sum + n.width, 0);
            const gap = sorted.length > 1 ? totalGap / (sorted.length - 1) : 0;
            let currentX = minX;
            if (id === sorted[0].id) {
              newX = currentX;
            } else {
              const idx = sorted.findIndex((entry) => entry.id === id);
              currentX = minX;
              for (let i = 0; i < idx; i++) {
                currentX += sorted[i].node.width + gap;
              }
              newX = currentX;
            }
            break;
          }
          case "distribute-v": {
            // Sort by y position and distribute evenly
            const sorted = toAlign.sort((a, b) => a.node.y - b.node.y);
            const totalGap = maxY - minY - sorted.reduce((sum, { node: n }) => sum + n.height, 0);
            const gap = sorted.length > 1 ? totalGap / (sorted.length - 1) : 0;
            let currentY = minY;
            if (id === sorted[0].id) {
              newY = currentY;
            } else {
              const idx = sorted.findIndex((entry) => entry.id === id);
              currentY = minY;
              for (let i = 0; i < idx; i++) {
                currentY += sorted[i].node.height + gap;
              }
              newY = currentY;
            }
            break;
          }
        }

        nodes[id] = { ...node, x: newX, y: newY };
      }

      return {
        ...withUndo,
        document: { ...withUndo.document, nodes },
      };
    }

    case "PASTE_NODES": {
      if (action.nodes.length === 0) return state;
      const withUndo = pushUndo(state);
      const nodes = { ...withUndo.document.nodes };
      const nodeOrder = [...withUndo.document.nodeOrder];
      const newIds: string[] = [];
      for (const n of action.nodes) {
        nodes[n.id] = n;
        nodeOrder.push(n.id);
        newIds.push(n.id);
      }
      return {
        ...withUndo,
        document: { ...withUndo.document, nodes, nodeOrder },
        selection: { nodeIds: new Set(newIds), marquee: null },
      };
    }

    case "APPLY_ORGANIZE": {
      if (action.updates.length === 0 && action.newNodes.length === 0)
        return state;
      const withUndo = pushUndo(state);
      const nodes = { ...withUndo.document.nodes };
      const nodeOrder = [...withUndo.document.nodeOrder];

      // Update existing nodes (resize + reposition stickies)
      for (const u of action.updates) {
        const existing = nodes[u.nodeId];
        if (!existing) continue;
        nodes[u.nodeId] = {
          ...existing,
          x: u.x,
          y: u.y,
          width: u.width,
          height: u.height,
        };
      }

      // Add new nodes (header labels)
      const newIds: string[] = [];
      for (const n of action.newNodes) {
        nodes[n.id] = n;
        nodeOrder.push(n.id);
        newIds.push(n.id);
      }

      return {
        ...withUndo,
        document: { ...withUndo.document, nodes, nodeOrder },
        selection: { nodeIds: new Set(newIds), marquee: null },
      };
    }

    case "BRING_TO_FRONT": {
      if (action.nodeIds.length === 0) return state;
      const withUndo = pushUndo(state);
      const selected = new Set(action.nodeIds);
      const rest = withUndo.document.nodeOrder.filter((id) => !selected.has(id));
      const moved = withUndo.document.nodeOrder.filter((id) => selected.has(id));
      return {
        ...withUndo,
        document: { ...withUndo.document, nodeOrder: [...rest, ...moved] },
      };
    }

    case "SEND_TO_BACK": {
      if (action.nodeIds.length === 0) return state;
      const withUndo = pushUndo(state);
      const selected = new Set(action.nodeIds);
      const rest = withUndo.document.nodeOrder.filter((id) => !selected.has(id));
      const moved = withUndo.document.nodeOrder.filter((id) => selected.has(id));
      return {
        ...withUndo,
        document: { ...withUndo.document, nodeOrder: [...moved, ...rest] },
      };
    }

    case "BRING_FORWARD": {
      if (action.nodeIds.length === 0) return state;
      const withUndo = pushUndo(state);
      const selected = new Set(action.nodeIds);
      const order = [...withUndo.document.nodeOrder];
      // Iterate right-to-left to avoid double-swapping
      for (let i = order.length - 2; i >= 0; i--) {
        if (selected.has(order[i]) && !selected.has(order[i + 1])) {
          [order[i], order[i + 1]] = [order[i + 1], order[i]];
        }
      }
      return {
        ...withUndo,
        document: { ...withUndo.document, nodeOrder: order },
      };
    }

    case "SEND_BACKWARD": {
      if (action.nodeIds.length === 0) return state;
      const withUndo = pushUndo(state);
      const selected = new Set(action.nodeIds);
      const order = [...withUndo.document.nodeOrder];
      // Iterate left-to-right to avoid double-swapping
      for (let i = 1; i < order.length; i++) {
        if (selected.has(order[i]) && !selected.has(order[i - 1])) {
          [order[i - 1], order[i]] = [order[i], order[i - 1]];
        }
      }
      return {
        ...withUndo,
        document: { ...withUndo.document, nodeOrder: order },
      };
    }

    case "UNDO": {
      if (state.undoStack.length === 0) return state;
      const [prev, ...rest] = state.undoStack;
      return {
        ...state,
        document: prev,
        undoStack: rest,
        redoStack: [state.document, ...state.redoStack],
        selection: { nodeIds: new Set(), marquee: null },
        editingNodeId: null,
      };
    }

    case "REDO": {
      if (state.redoStack.length === 0) return state;
      const [next, ...rest] = state.redoStack;
      return {
        ...state,
        document: next,
        redoStack: rest,
        undoStack: [state.document, ...state.undoStack],
        selection: { nodeIds: new Set(), marquee: null },
        editingNodeId: null,
      };
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Undo-aware wrappers for drag operations
// These push undo only once at the START of a drag, not on every move.
// ---------------------------------------------------------------------------

/** Call at the START of a drag/resize to snapshot undo. */
export function beginDrag(state: EditorState): EditorState {
  return pushUndo(state);
}
