// ---------------------------------------------------------------------------
// AI Placement Logic — Pure functions for placing AI results on canvas
// ---------------------------------------------------------------------------

import type { CanvasNode, CanvasDocument } from "@/lib/canvas/types";
import { generateId } from "@/lib/canvas/types";
import { getSelectionBounds, aabbIntersects } from "@/lib/canvas/geometry";
import type { AiChatResponse } from "@/lib/ai/skills/chat/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlacementResult = {
  /** Nodes to create via PASTE_NODES */
  newNodes: CanvasNode[];
  /** Position updates via APPLY_ORGANIZE */
  stickyUpdates: Array<{ nodeId: string; x: number; y: number; width: number; height: number }>;
  /** Output bounding box for camera pan */
  outputBounds: { x: number; y: number; width: number; height: number } | null;
  /** Whether to use APPLY_ORGANIZE (true) or PASTE_NODES (false) */
  useOrganize: boolean;
};

export type EditResult = {
  edits: Array<{ nodeId: string; newText: string }>;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ORGANIZE_COLOR_MAP: Record<string, string> = {
  blue: "#4a9ebe",
  amber: "#e8951a",
  sage: "#5c8c6e",
  lavender: "#8e6b9e",
  red: "#c44b3c",
  navy: "#2c3e50",
  green: "#2d8a56",
  pink: "#d45b8e",
};

const ORG_STICKY_SIZE = 200;
const ORG_GAP = 24;
const ORG_COLS = 3;
const ORG_HEADER_GAP = 32;
const ORG_HEADER_H = 44;
const ORG_GROUP_GAP_X = 80;

const PLACEMENT_GAP = 80;

// ---------------------------------------------------------------------------
// Collision-free placement helper
// ---------------------------------------------------------------------------

function findFreeArea(
  allNodes: Record<string, CanvasNode>,
  selectedIds: Set<string>,
  bounds: { minX: number; minY: number; maxX: number; maxY: number } | null,
  outputW: number,
  outputH: number,
  anchorY: number,
): { x: number; y: number } {
  const startX = bounds ? bounds.maxX + PLACEMENT_GAP : 0;
  const STEP = 100;
  const MAX_ATTEMPTS = 50;
  const allNodesList = Object.values(allNodes);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const testX = startX + attempt * STEP;
    const testBounds = {
      minX: testX,
      minY: anchorY,
      maxX: testX + outputW,
      maxY: anchorY + outputH,
    };

    const collides = allNodesList.some((node) => {
      if (selectedIds.has(node.id)) return false;
      const nb = {
        minX: node.x,
        minY: node.y,
        maxX: node.x + node.width,
        maxY: node.y + node.height,
      };
      return aabbIntersects(testBounds, nb);
    });

    if (!collides) {
      return { x: testX, y: anchorY };
    }
  }

  return { x: startX + MAX_ATTEMPTS * STEP, y: anchorY };
}

// ---------------------------------------------------------------------------
// Groups placement
// ---------------------------------------------------------------------------

export function placeGroups(
  data: AiChatResponse,
  document: CanvasDocument,
  selectedIds: Set<string>,
): PlacementResult {
  const selectedNodesList = [...selectedIds]
    .map((id) => document.nodes[id])
    .filter(Boolean) as CanvasNode[];
  const bounds = getSelectionBounds(selectedNodesList);

  const headerNodes: CanvasNode[] = [];
  const stickyUpdates: PlacementResult["stickyUpdates"] = [];

  const EST_CHAR_W = 18;
  let totalOutputW = 0;
  let maxGroupH = 0;
  for (const item of data.items) {
    const memberIds = (item.nodeIds ?? []).filter((id: string) => document.nodes[id]);
    if (memberIds.length === 0) continue;
    const cols = Math.min(memberIds.length, ORG_COLS);
    const rows = Math.ceil(memberIds.length / ORG_COLS);
    const gridWidth = cols * ORG_STICKY_SIZE + (cols - 1) * ORG_GAP;
    const gridHeight = rows * ORG_STICKY_SIZE + (rows - 1) * ORG_GAP;
    const estimatedHeaderW = item.label.length * EST_CHAR_W;
    const colWidth = Math.max(gridWidth, estimatedHeaderW);
    totalOutputW += colWidth + ORG_GROUP_GAP_X;
    maxGroupH = Math.max(maxGroupH, gridHeight);
  }
  totalOutputW = Math.max(0, totalOutputW - ORG_GROUP_GAP_X);
  const totalOutputH = ORG_HEADER_H + ORG_HEADER_GAP + maxGroupH;

  const anchorY = bounds ? bounds.minY : 0;
  const freePos = findFreeArea(document.nodes, selectedIds, bounds, totalOutputW, totalOutputH, anchorY);

  let cursorX = freePos.x;
  const baseY = freePos.y;

  for (const item of data.items) {
    const memberIds = (item.nodeIds ?? []).filter((id: string) => document.nodes[id]);
    if (memberIds.length === 0) continue;

    const cols = Math.min(memberIds.length, ORG_COLS);
    const gridWidth = cols * ORG_STICKY_SIZE + (cols - 1) * ORG_GAP;
    const color = ORGANIZE_COLOR_MAP[item.color ?? "blue"] ?? "#1a1814";
    const estimatedHeaderW = item.label.length * EST_CHAR_W;
    const headerWidth = Math.max(gridWidth, estimatedHeaderW);
    const colWidth = Math.max(gridWidth, estimatedHeaderW);
    const headerX = cursorX + (colWidth - headerWidth) / 2;

    headerNodes.push({
      id: generateId(), type: "text", x: headerX, y: baseY,
      width: headerWidth, height: ORG_HEADER_H, rotation: 0,
      props: {
        type: "text", text: item.label, fontSize: 32, color,
        fontFamily: "sans", fontWeight: "bold", fontStyle: "normal", textDecoration: "none",
      },
    });

    const gridTopY = baseY + ORG_HEADER_H + ORG_HEADER_GAP;
    const gridOffsetX = cursorX + (colWidth - gridWidth) / 2;
    for (let i = 0; i < memberIds.length; i++) {
      stickyUpdates.push({
        nodeId: memberIds[i],
        x: gridOffsetX + (i % ORG_COLS) * (ORG_STICKY_SIZE + ORG_GAP),
        y: gridTopY + Math.floor(i / ORG_COLS) * (ORG_STICKY_SIZE + ORG_GAP),
        width: ORG_STICKY_SIZE, height: ORG_STICKY_SIZE,
      });
    }
    cursorX += colWidth + ORG_GROUP_GAP_X;
  }

  return {
    newNodes: headerNodes,
    stickyUpdates,
    outputBounds: headerNodes.length > 0
      ? { x: freePos.x, y: freePos.y, width: totalOutputW, height: totalOutputH }
      : null,
    useOrganize: true,
  };
}

// ---------------------------------------------------------------------------
// Tasks placement (Kanban board)
// ---------------------------------------------------------------------------

export function placeTasks(
  data: AiChatResponse,
  document: CanvasDocument,
  selectedIds: Set<string>,
): PlacementResult {
  const selectedNodesList = [...selectedIds]
    .map((id) => document.nodes[id])
    .filter(Boolean) as CanvasNode[];
  const bounds = getSelectionBounds(selectedNodesList);

  const COL_GAP = 20;
  const STICKY_GAP = 16;
  const HEADER_H = 40;
  const TITLE_H = 52;
  const TITLE_GAP = 12;
  const HEADER_TO_CARDS_GAP = 14;
  const NUM_COLS = 4;
  const STICKY_SIZE = 200;

  const COL_WIDTH = Math.max(STICKY_SIZE * 1.2, 240);

  let taskCount = 0;
  for (const item of data.items) {
    if (item.sourceNodeId && document.nodes[item.sourceNodeId]) taskCount++;
  }

  // Use 2 sub-columns in the To-do lane when there are many tasks
  const TODO_SUBCOLS = taskCount > 4 ? 2 : 1;
  const TODO_COL_WIDTH = TODO_SUBCOLS === 2
    ? STICKY_SIZE * 2 + STICKY_GAP + COL_GAP
    : COL_WIDTH;

  // Board layout: On hold | To-do (possibly wider) | In progress | Done
  const colWidths = [COL_WIDTH, TODO_COL_WIDTH, COL_WIDTH, COL_WIDTH];
  const totalBoardW = colWidths.reduce((s, w) => s + w, 0) + (NUM_COLS - 1) * COL_GAP;

  const todoRows = Math.ceil(Math.max(taskCount, 1) / TODO_SUBCOLS);
  const todoColumnH = todoRows * STICKY_SIZE + Math.max(todoRows - 1, 0) * STICKY_GAP;
  const totalBoardH = TITLE_H + TITLE_GAP + HEADER_H + HEADER_TO_CARDS_GAP + Math.max(todoColumnH, STICKY_SIZE);

  const anchorY = bounds ? bounds.minY : 0;
  const boardPos = findFreeArea(document.nodes, selectedIds, bounds, totalBoardW, totalBoardH, anchorY);
  const boardX = boardPos.x;
  const boardY = boardPos.y;

  const frameNodes: CanvasNode[] = [];
  const stickyUpdates: PlacementResult["stickyUpdates"] = [];

  const taskEntries: Array<{ nodeId: string; isSticky: boolean; label: string }> = [];
  for (const item of data.items) {
    if (!item.sourceNodeId) continue;
    const srcNode = document.nodes[item.sourceNodeId];
    if (!srcNode) continue;
    taskEntries.push({
      nodeId: item.sourceNodeId,
      isSticky: srcNode.props.type === "sticky",
      label: item.label,
    });
  }

  // Pre-compute column x offsets
  const colXOffsets: number[] = [];
  let xCursor = boardX;
  for (let c = 0; c < NUM_COLS; c++) {
    colXOffsets.push(xCursor);
    xCursor += colWidths[c] + COL_GAP;
  }

  // Title
  frameNodes.push({
    id: generateId(), type: "text",
    x: boardX, y: boardY,
    width: totalBoardW, height: TITLE_H, rotation: 0,
    props: {
      type: "text", text: "Tasks",
      fontSize: 32, color: "#1a1814", fontFamily: "sans",
      fontWeight: "bold", fontStyle: "normal", textDecoration: "none",
    },
  });

  // Column headers
  const colNames = ["On hold", "To-do", "In progress", "Done"];
  const colHeaderY = boardY + TITLE_H + TITLE_GAP;
  for (let c = 0; c < NUM_COLS; c++) {
    frameNodes.push({
      id: generateId(), type: "text",
      x: colXOffsets[c], y: colHeaderY,
      width: colWidths[c], height: HEADER_H, rotation: 0,
      props: {
        type: "text", text: colNames[c],
        fontSize: 24, color: "#7a756e", fontFamily: "sans",
        fontWeight: "bold", fontStyle: "normal", textDecoration: "none",
      },
    });
  }

  // Column dividers
  const dividerH = HEADER_H + HEADER_TO_CARDS_GAP + Math.max(todoColumnH, STICKY_SIZE);
  for (let d = 0; d < NUM_COLS - 1; d++) {
    const divX = colXOffsets[d + 1] - COL_GAP / 2;
    frameNodes.push({
      id: generateId(), type: "rect",
      x: divX, y: colHeaderY,
      width: 1, height: dividerH, rotation: 0,
      props: {
        type: "rect", fill: "transparent", stroke: "#e3ddd5",
        strokeWidth: 1, strokeStyle: "solid", fillStyle: "none",
      },
    });
  }

  // Place tasks in To-do column (with optional 2-sub-column layout)
  const cardStartY = colHeaderY + HEADER_H + HEADER_TO_CARDS_GAP;
  const todoColStartX = colXOffsets[1];

  for (let i = 0; i < taskEntries.length; i++) {
    const entry = taskEntries[i];
    const subCol = i % TODO_SUBCOLS;
    const subRow = Math.floor(i / TODO_SUBCOLS);
    const cardX = todoColStartX + subCol * (STICKY_SIZE + STICKY_GAP);
    const cardY = cardStartY + subRow * (STICKY_SIZE + STICKY_GAP);

    if (entry.isSticky) {
      const node = document.nodes[entry.nodeId];
      if (node) {
        stickyUpdates.push({
          nodeId: entry.nodeId,
          x: cardX,
          y: cardY,
          width: STICKY_SIZE,
          height: STICKY_SIZE,
        });
      }
    } else {
      frameNodes.push({
        id: generateId(), type: "sticky",
        x: cardX,
        y: cardY,
        width: STICKY_SIZE, height: STICKY_SIZE, rotation: 0,
        props: {
          type: "sticky", text: entry.label, color: "yellow",
        },
      });
    }
  }

  return {
    newNodes: frameNodes,
    stickyUpdates,
    outputBounds: { x: boardX, y: boardY, width: totalBoardW, height: totalBoardH },
    useOrganize: true,
  };
}

// ---------------------------------------------------------------------------
// Summary placement
// ---------------------------------------------------------------------------

export function placeSummary(
  data: AiChatResponse,
  document: CanvasDocument,
  selectedIds: Set<string>,
): PlacementResult {
  const selectedNodesList = [...selectedIds]
    .map((id) => document.nodes[id])
    .filter(Boolean) as CanvasNode[];
  const bounds = getSelectionBounds(selectedNodesList);

  const SUMMARY_W = 400;
  const HEADER_H = 44;
  const HEADER_GAP = 16;
  const BODY_FONT_SIZE = 16;
  const BODY_LINE_H = 1.35;
  const BODY_PAD_X = 12;
  const BODY_PAD_Y = 10;

  const rawText = data.items[0]?.description || data.items[0]?.label || data.summary || "";

  const maxLineChars = Math.floor((SUMMARY_W - BODY_PAD_X * 2) / (BODY_FONT_SIZE * 0.52));
  const words = rawText.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    const test = currentLine ? `${currentLine} ${word}` : word;
    if (test.length > maxLineChars && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = test;
    }
  }
  if (currentLine) lines.push(currentLine);
  const bodyText = lines.join("\n");

  const bodyH = Math.max(40, lines.length * BODY_FONT_SIZE * BODY_LINE_H + BODY_PAD_Y * 2);
  const outputW = SUMMARY_W;
  const outputH = HEADER_H + HEADER_GAP + bodyH;

  const anchorY = bounds ? bounds.minY : 0;
  const freePos = findFreeArea(document.nodes, selectedIds, bounds, outputW, outputH, anchorY);
  const startX = freePos.x;
  const startY = freePos.y;

  const newNodes: CanvasNode[] = [];

  newNodes.push({
    id: generateId(), type: "text", x: startX, y: startY,
    width: SUMMARY_W, height: HEADER_H, rotation: 0,
    props: {
      type: "text", text: "Summary",
      fontSize: 32, color: "#1a1814", fontFamily: "sans",
      fontWeight: "bold", fontStyle: "normal", textDecoration: "none",
    },
  });

  newNodes.push({
    id: generateId(), type: "text", x: startX, y: startY + HEADER_H + HEADER_GAP,
    width: SUMMARY_W, height: bodyH, rotation: 0,
    props: {
      type: "text", text: bodyText,
      fontSize: BODY_FONT_SIZE, color: "#3d3a35", fontFamily: "sans",
      fontWeight: "normal", fontStyle: "normal", textDecoration: "none",
    },
  });

  return {
    newNodes,
    stickyUpdates: [],
    outputBounds: { x: startX, y: startY, width: outputW, height: outputH },
    useOrganize: false,
  };
}

// ---------------------------------------------------------------------------
// Questions / Analysis placement
// ---------------------------------------------------------------------------

export function placeQuestionsOrAnalysis(
  data: AiChatResponse,
  document: CanvasDocument,
  selectedIds: Set<string>,
): PlacementResult {
  const selectedNodesList = [...selectedIds]
    .map((id) => document.nodes[id])
    .filter(Boolean) as CanvasNode[];
  const bounds = getSelectionBounds(selectedNodesList);

  const STICKY_W = 200;
  const STICKY_H = 200;
  const GAP = 20;
  const HEADER_GAP = 28;
  const HEADER_H_QA = 44;
  const S = STICKY_W + GAP; // step between sticky origins

  const headerLabels: Record<string, string> = {
    questions: "Critical Questions", analysis: "Analysis",
  };

  const defaultColor: Record<string, string> = {
    questions: "blue", analysis: "lavender",
  };

  const items = data.items;
  const itemTexts = items.map((item) => item.label);

  // Custom layouts per count:
  // 1: single | 2: side by side | 3: 2 top + 1 centered below
  // 4: 2×2 | 5: 2×2 + 5th right-middle | 6: 2×3
  const getPositions = (count: number): Array<{ x: number; y: number }> => {
    switch (count) {
      case 1: return [{ x: 0, y: 0 }];
      case 2: return [{ x: 0, y: 0 }, { x: S, y: 0 }];
      case 3: return [
        { x: 0, y: 0 }, { x: S, y: 0 },
        { x: S / 2, y: S },
      ];
      case 4: return [
        { x: 0, y: 0 },  { x: S, y: 0 },
        { x: 0, y: S },  { x: S, y: S },
      ];
      case 5: return [
        { x: 0, y: 0 },      { x: S, y: 0 },
        { x: 0, y: S },      { x: S, y: S },
        { x: 2 * S, y: S / 2 },
      ];
      case 6: return [
        { x: 0, y: 0 },      { x: S, y: 0 },
        { x: 0, y: S },      { x: S, y: S },
        { x: 0, y: 2 * S },  { x: S, y: 2 * S },
      ];
      default: return Array.from({ length: count }, (_, i) => ({
        x: (i % 2) * S,
        y: Math.floor(i / 2) * S,
      }));
    }
  };

  const positions = getPositions(items.length);
  const gridWidth = Math.max(...positions.map((p) => p.x)) + STICKY_W;
  const gridHeight = Math.max(...positions.map((p) => p.y)) + STICKY_H;

  const headerLabel = headerLabels[data.type] ?? "Results";
  const estHeaderW = headerLabel.length * 18;
  const outputW = Math.max(gridWidth, estHeaderW, 200);
  const outputH = HEADER_H_QA + HEADER_GAP + gridHeight;

  const anchorY = bounds ? bounds.minY : 100;
  const freePos = findFreeArea(document.nodes, selectedIds, bounds, outputW, outputH, anchorY);
  const startX = freePos.x;
  const startY = freePos.y;

  const newNodes: CanvasNode[] = [];

  newNodes.push({
    id: generateId(), type: "text", x: startX, y: startY,
    width: outputW, height: HEADER_H_QA, rotation: 0,
    props: {
      type: "text", text: headerLabel,
      fontSize: 32, color: "#1a1814", fontFamily: "sans",
      fontWeight: "bold", fontStyle: "normal", textDecoration: "none",
    },
  });

  const firstItemY = startY + HEADER_H_QA + HEADER_GAP;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const pos = positions[i];

    newNodes.push({
      id: generateId(), type: "sticky",
      x: startX + pos.x,
      y: firstItemY + pos.y,
      width: STICKY_W, height: STICKY_H, rotation: 0,
      props: {
        type: "sticky", text: itemTexts[i],
        color: item.color ?? defaultColor[data.type] ?? "blue",
      },
    });
  }

  return {
    newNodes,
    stickyUpdates: [],
    outputBounds: { x: startX, y: startY, width: outputW, height: outputH },
    useOrganize: false,
  };
}

// ---------------------------------------------------------------------------
// Edit in place
// ---------------------------------------------------------------------------

export function applyEdits(
  data: AiChatResponse,
  document: CanvasDocument,
): EditResult {
  const edits: EditResult["edits"] = [];
  if (data.editNodes) {
    for (const edit of data.editNodes) {
      if (document.nodes[edit.nodeId]) {
        edits.push({ nodeId: edit.nodeId, newText: edit.newText });
      }
    }
  }
  return { edits };
}
