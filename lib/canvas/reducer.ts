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
    }
  | { type: "UPDATE_NODE_SIZE"; nodeId: string; width: number; height: number }
  | { type: "UPDATE_NODE_PROPS"; nodeId: string; props: Partial<NodeProps> }
  | { type: "UPDATE_NODE_TEXT"; nodeId: string; text: string }
  | { type: "SET_EDITING"; nodeId: string | null }
  | { type: "SET_ACTIVE_STYLE"; style: Partial<ActiveStyle> }
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
      fontSize: 24,
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
      const toDelete = withUndo.selection.nodeIds;
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
      if (!n || (n.props.type !== "text" && n.props.type !== "sticky")) {
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
          if (n.props.type === "text" || n.props.type === "sticky") {
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
        if (action.style.fontSize != null && n.props.type === "text") {
          updatedProps.fontSize = action.style.fontSize;
        }
        nodes[id] = { ...n, props: updatedProps as NodeProps };
      }
      return {
        ...withUndo,
        activeStyle: newStyle,
        document: { ...withUndo.document, nodes },
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
