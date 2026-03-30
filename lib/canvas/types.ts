// ---------------------------------------------------------------------------
// Canvas Engine — Type Definitions
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Color palette — 12 editorial tones
// ---------------------------------------------------------------------------

export const PALETTE = [
  "#1a1814", // ink
  "#3d3a35", // brown
  "#7a756e", // gray
  "#c4bfb8", // silver
  "#fef9f3", // paper
  "#f5e642", // yellow (brand)
  "#e8951a", // amber
  "#c44b3c", // red
  "#5c8c6e", // sage
  "#2c3e50", // navy
  "#4a9ebe", // sky
  "#8e6b9e", // lavender
] as const;

// ---------------------------------------------------------------------------
// Style options
// ---------------------------------------------------------------------------

export type StrokeStyle = "solid" | "dashed" | "dotted";
export type FillStyle = "none" | "solid" | "semi";

export type ActiveStyle = {
  color: string;
  strokeStyle: StrokeStyle;
  fillStyle: FillStyle;
  strokeWidth: number;
  opacity: number;
  fontSize: number;
  fontFamily: "sans" | "serif" | "mono" | "display";
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  textDecoration: "none" | "underline";
};

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

export type Tool =
  | "select"
  | "text"
  | "sticky"
  | "rect"
  | "ellipse"
  | "freehand"
  | "arrow"
  | "image";

export type Camera = {
  x: number;
  y: number;
  zoom: number;
};

// ---------------------------------------------------------------------------
// Node types
// ---------------------------------------------------------------------------

export type TextProps = {
  text: string;
  fontSize: number;
  color: string;
  fontFamily: "sans" | "serif" | "mono" | "display";
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  textDecoration: "none" | "underline";
};

export type StickyProps = {
  text: string;
  color: string; // background color
};

export type RectProps = {
  fill: string;
  stroke: string;
  strokeWidth: number;
  strokeStyle?: StrokeStyle;
  fillStyle?: FillStyle;
};

export type EllipseProps = {
  fill: string;
  stroke: string;
  strokeWidth: number;
  strokeStyle?: StrokeStyle;
  fillStyle?: FillStyle;
};

export type FreehandProps = {
  points: [number, number][]; // relative to node x,y
  stroke: string;
  strokeWidth: number;
  strokeStyle?: StrokeStyle;
};

// Arrow: x,y = start (world space); end = (x+dx, y+dy)
export type ArrowProps = {
  dx: number;
  dy: number;
  stroke: string;
  strokeWidth: number;
  strokeStyle?: StrokeStyle;
};

// Future node types — defined in schema now so the persisted format is stable.
// Rendering is not implemented yet.

export type ImageProps = {
  src: string; // Supabase Storage path, signed URL, or data URL
  alt: string;
  opacity?: number;
  fit?: "contain" | "cover";
  mimeType?: string;
  originalWidth?: number;
  originalHeight?: number;
};

export type AiOutputProps = {
  text: string;
  aiModel: string;
  aiAction: string; // "organize" | "to-tasks" | "critical-questions"
  locked: boolean;
};

export type NodeProps =
  | ({ type: "text" } & TextProps)
  | ({ type: "sticky" } & StickyProps)
  | ({ type: "rect" } & RectProps)
  | ({ type: "ellipse" } & EllipseProps)
  | ({ type: "freehand" } & FreehandProps)
  | ({ type: "arrow" } & ArrowProps)
  | ({ type: "image" } & ImageProps)
  | ({ type: "ai-output" } & AiOutputProps);

export type NodeType = NodeProps["type"];

export type CanvasNode = {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  props: NodeProps;
  meta?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Connectors
// ---------------------------------------------------------------------------

export type Connector = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  meta?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Document (top-level persisted state)
// ---------------------------------------------------------------------------

export type CanvasDocument = {
  version: 1;
  camera: Camera;
  nodes: Record<string, CanvasNode>;
  nodeOrder: string[]; // z-order, back → front
  connectors: Record<string, Connector>;
};

// ---------------------------------------------------------------------------
// Editor state (in-memory, not persisted)
// ---------------------------------------------------------------------------

export type SelectionState = {
  nodeIds: Set<string>;
  marquee: { x: number; y: number; width: number; height: number } | null;
};

export type EditorState = {
  document: CanvasDocument;
  selection: SelectionState;
  activeTool: Tool;
  editingNodeId: string | null; // node currently being text-edited
  undoStack: CanvasDocument[];
  redoStack: CanvasDocument[];
  activeStyle: ActiveStyle;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function createEmptyDocument(): CanvasDocument {
  return {
    version: 1,
    camera: { x: 0, y: 0, zoom: 1 },
    nodes: {},
    nodeOrder: [],
    connectors: {},
  };
}

export function generateId(): string {
  return crypto.randomUUID();
}
