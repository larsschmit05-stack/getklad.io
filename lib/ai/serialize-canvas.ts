// ---------------------------------------------------------------------------
// AI Organize — Canvas Serialization & Types
// ---------------------------------------------------------------------------

import type { CanvasNode, CanvasDocument } from "@/lib/canvas/types";

// ---------------------------------------------------------------------------
// Request / Response types (matches PRD §7)
// ---------------------------------------------------------------------------

export type OrganizeNodeInput = {
  id: string;
  type: string;
  text: string;
};

export type OrganizeRequest = {
  selectedNodes: OrganizeNodeInput[];
  visibleNodes: OrganizeNodeInput[];
  canvasMetadata: {
    totalNodes: number;
    selectedCount: number;
  };
};

export type OrganizeGroup = {
  id: string;
  label: string;
  description?: string;
  nodeIds: string[];
  suggestedColor: string;
  reasoning?: string;
};

export type OrganizeOrphan = {
  nodeId: string;
  text: string;
  reason: string;
};

export type OrganizeResponse = {
  mode: "organize";
  groups: OrganizeGroup[];
  orphans: OrganizeOrphan[];
  summary: string;
};

export type CriticalQuestionsResponse = {
  mode: "critical-questions";
  domain: "business" | "design" | "project" | "mixed";
  questions: string[];
  clarificationMessage: string | null;
  summary: string;
};

export type CreateTasksTask = {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  effort: "small" | "medium" | "large";
};

export type CreateTasksResponse = {
  mode: "create-tasks";
  tasks: CreateTasksTask[];
  clarificationMessage: string | null;
  summary: string;
};

// ---------------------------------------------------------------------------
// Text extraction — pull displayable text from any node type
// ---------------------------------------------------------------------------

function getNodeText(node: CanvasNode): string {
  const p = node.props;
  switch (p.type) {
    case "text":
    case "sticky":
    case "ai-output":
      return p.text;
    case "rect":
    case "ellipse":
      return p.text ?? "";
    case "image":
      return p.alt || "";
    case "freehand":
    case "arrow":
      return "";
  }
}

function toNodeInput(node: CanvasNode): OrganizeNodeInput {
  return {
    id: node.id,
    type: node.type,
    text: getNodeText(node),
  };
}

// ---------------------------------------------------------------------------
// Truncation — abbreviate visible nodes to stay within token budget
// (PRD §4: 1,500–2,200 tokens per call, hard limit 2,500)
// ---------------------------------------------------------------------------

const MAX_SELECTED_TEXT = 500; // chars per selected node
const MAX_VISIBLE_TEXT_FULL = 50; // chars per visible node (first pass)
const MAX_VISIBLE_TEXT_SHORT = 20; // chars per visible node (truncated pass)
const ESTIMATED_TOKENS_PER_CHAR = 0.3; // rough estimate
const TOKEN_BUDGET = 1200; // for serialization payload (leaving room for system prompt + response)

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "…";
}

function estimateTokens(nodes: OrganizeNodeInput[]): number {
  // Rough estimate: JSON overhead (~30 chars per node) + text content
  return nodes.reduce(
    (sum, n) => sum + (30 + n.text.length) * ESTIMATED_TOKENS_PER_CHAR,
    0
  );
}

// ---------------------------------------------------------------------------
// Main serialization function
// ---------------------------------------------------------------------------

export function serializeForOrganize(
  selectedNodeIds: Set<string>,
  document: CanvasDocument
): OrganizeRequest {
  const allNodes = document.nodes;
  const totalNodes = Object.keys(allNodes).length;

  // 1. Selected nodes — always included (non-negotiable per PRD §4)
  const selectedNodes: OrganizeNodeInput[] = [];
  for (const id of selectedNodeIds) {
    const node = allNodes[id];
    if (!node) continue;
    const input = toNodeInput(node);
    input.text = truncateText(input.text, MAX_SELECTED_TEXT);
    selectedNodes.push(input);
  }

  // 2. Visible but unselected nodes — included if token budget allows
  let visibleNodes: OrganizeNodeInput[] = [];
  for (const id of document.nodeOrder) {
    if (selectedNodeIds.has(id)) continue;
    const node = allNodes[id];
    if (!node) continue;
    const input = toNodeInput(node);
    input.text = truncateText(input.text, MAX_VISIBLE_TEXT_FULL);
    visibleNodes.push(input);
  }

  // 3. Check token budget and truncate visible nodes if needed
  const selectedTokens = estimateTokens(selectedNodes);
  let visibleTokens = estimateTokens(visibleNodes);

  if (selectedTokens + visibleTokens > TOKEN_BUDGET) {
    // First pass: abbreviate to 20 chars
    visibleNodes = visibleNodes.map((n) => ({
      ...n,
      text: truncateText(n.text, MAX_VISIBLE_TEXT_SHORT),
    }));
    visibleTokens = estimateTokens(visibleNodes);
  }

  if (selectedTokens + visibleTokens > TOKEN_BUDGET) {
    // Second pass: drop oldest visible nodes (FIFO — nodeOrder is z-order, back=oldest)
    while (
      visibleNodes.length > 0 &&
      selectedTokens + estimateTokens(visibleNodes) > TOKEN_BUDGET
    ) {
      visibleNodes.shift(); // remove oldest first
    }
  }

  // 4. Final hard limit warning
  const finalTokens = selectedTokens + estimateTokens(visibleNodes);
  if (finalTokens > TOKEN_BUDGET) {
    console.warn(
      `Canvas state truncated: sent ${selectedNodes.length} selected + ${visibleNodes.length} visible of ${totalNodes} total nodes`
    );
  }

  return {
    selectedNodes,
    visibleNodes,
    canvasMetadata: {
      totalNodes,
      selectedCount: selectedNodes.length,
    },
  };
}
