"use client";

import { useState, useEffect } from "react";
import { Wand2, LayoutGrid, ListChecks, FileText, MessageCircleQuestion } from "lucide-react";
import type { CanvasNode, Camera } from "@/lib/canvas/types";
import { getSelectionFrameBounds, getConnectedArrowEndpoints, getNodeCenter } from "@/lib/canvas/geometry";
import { arrowheadPath } from "./nodes/ArrowNode";
import { smoothPath } from "./nodes/FreehandNode";

// CSS for loading animation
const styles = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .ai-wand-loading {
    animation: spin 1s linear infinite;
  }
`;

interface SelectionOverlayProps {
  selectedNodes: CanvasNode[];
  hoveredNode: CanvasNode | null;
  marquee: { x: number; y: number; width: number; height: number } | null;
  camera: Camera;
  editingNodeId: string | null;
  stylePreviewNonce?: number;
  allNodes: Record<string, CanvasNode>;
  onAiAction?: (instruction: string) => void;
  isAiLoading?: boolean;
}

const HANDLE_SIZE_SCREEN = 8; // Size in screen pixels

export default function SelectionOverlay({
  selectedNodes,
  hoveredNode,
  marquee,
  camera,
  editingNodeId,
  stylePreviewNonce,
  allNodes,
  onAiAction,
  isAiLoading,
}: SelectionOverlayProps) {
  const [previewMode, setPreviewMode] = useState(false);

  // Inject styles for animation
  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
    return () => styleEl.remove();
  }, []);

  // Briefly hide selection chrome when entering text edit or changing styles.
  useEffect(() => {
    const shouldPreview = Boolean(stylePreviewNonce);

    if (!shouldPreview) {
      const frame = window.requestAnimationFrame(() => {
        setPreviewMode(false);
      });
      return () => window.cancelAnimationFrame(frame);
    }
    const frame = window.requestAnimationFrame(() => {
      setPreviewMode(true);
    });
    const timer = window.setTimeout(() => setPreviewMode(false), 600);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [editingNodeId, stylePreviewNonce]);

  if (editingNodeId) {
    return (
      <>
        {marquee && (
          <rect
            x={Math.min(marquee.x, marquee.x + marquee.width)}
            y={Math.min(marquee.y, marquee.y + marquee.height)}
            width={Math.abs(marquee.width)}
            height={Math.abs(marquee.height)}
            fill="rgba(59, 130, 246, 0.1)"
            stroke="#3b82f6"
            strokeWidth={1 / camera.zoom}
            strokeDasharray={`${4 / camera.zoom} ${2 / camera.zoom}`}
            pointerEvents="none"
          />
        )}
      </>
    );
  }

  // Don't show handles in preview mode
  if (previewMode) {
    return (
      <>
        {marquee && (
          <rect
            x={Math.min(marquee.x, marquee.x + marquee.width)}
            y={Math.min(marquee.y, marquee.y + marquee.height)}
            width={Math.abs(marquee.width)}
            height={Math.abs(marquee.height)}
            fill="rgba(59, 130, 246, 0.1)"
            stroke="#3b82f6"
            strokeWidth={1 / camera.zoom}
            strokeDasharray={`${4 / camera.zoom} ${2 / camera.zoom}`}
            pointerEvents="none"
          />
        )}
      </>
    );
  }

  return (
    <>
      {hoveredNode && selectedNodes.length === 0 && (
        <HoverOutline node={hoveredNode} camera={camera} />
      )}

      {/* Keep the single-selection outline visible at any zoom; only hide handles at low zoom */}
      {selectedNodes.length === 1 && (
        <SelectionHandles
          node={selectedNodes[0]}
          camera={camera}
          allNodes={allNodes}
          onAiAction={onAiAction}
          isAiLoading={isAiLoading}
        />
      )}

      {/* Multi-select bounding box — always visible to show selection */}
      {selectedNodes.length > 1 && (
        <MultiSelectBoundingBox
          nodes={selectedNodes}
          camera={camera}
          onAiAction={onAiAction}
          isAiLoading={isAiLoading}
        />
      )}

      {/* Marquee selection rectangle — always visible to show selection area */}
      {marquee && (
        <rect
          x={Math.min(marquee.x, marquee.x + marquee.width)}
          y={Math.min(marquee.y, marquee.y + marquee.height)}
          width={Math.abs(marquee.width)}
          height={Math.abs(marquee.height)}
          fill="rgba(59, 130, 246, 0.1)"
          stroke="#3b82f6"
          strokeWidth={1 / camera.zoom}
          strokeDasharray={`${4 / camera.zoom} ${2 / camera.zoom}`}
          pointerEvents="none"
        />
      )}
    </>
  );
}

function HoverOutline({
  node,
  camera,
}: {
  node: CanvasNode;
  camera: Camera;
}) {
  const z = camera.zoom;

  if (node.props.type === "arrow") {
    const { dx, dy } = node.props;
    return (
      <g pointerEvents="none" opacity={0.9}>
        <line
          x1={node.x}
          y1={node.y}
          x2={node.x + dx}
          y2={node.y + dy}
          stroke="#3b82f6"
          strokeWidth={1.5 / z}
          strokeLinecap="round"
        />
        <path
          d={arrowheadPath(node.x, node.y, node.x + dx, node.y + dy, 10)}
          stroke="#3b82f6"
          strokeWidth={1.5 / z}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    );
  }

  if (node.props.type === "freehand") {
    const path = smoothPath(node.props.points);
    if (!path) return null;
    return (
      <path
        d={path}
        transform={`translate(${node.x}, ${node.y})`}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={Math.max(node.props.strokeWidth, 2 / z)}
        strokeDasharray={
          node.props.strokeStyle === "dashed"
            ? `${node.props.strokeWidth * 6} ${node.props.strokeWidth * 4}`
            : node.props.strokeStyle === "dotted"
              ? `${node.props.strokeWidth} ${node.props.strokeWidth * 3}`
              : undefined
        }
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
        pointerEvents="none"
      />
    );
  }

  const frame = getSelectionFrameBounds(node, camera);
  const strokeWidth = 1.5 / z;

  if (node.props.type === "ellipse") {
    return (
      <ellipse
        cx={node.x + node.width / 2}
        cy={node.y + node.height / 2}
        rx={Math.max(0, node.width / 2)}
        ry={Math.max(0, node.height / 2)}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={strokeWidth}
        opacity={0.9}
        pointerEvents="none"
      />
    );
  }

  return (
    <rect
      x={frame.minX}
      y={frame.minY}
      width={Math.max(0, frame.maxX - frame.minX)}
      height={Math.max(0, frame.maxY - frame.minY)}
      rx={2 / z}
      fill="none"
      stroke="#3b82f6"
      strokeWidth={strokeWidth}
      opacity={0.9}
      pointerEvents="none"
    />
  );
}

function SelectionHandles({
  node,
  camera,
  allNodes,
  onAiAction,
  isAiLoading,
}: {
  node: CanvasNode;
  camera: Camera;
  allNodes: Record<string, CanvasNode>;
  onAiAction?: (instruction: string) => void;
  isAiLoading?: boolean;
}) {
  const z = camera.zoom;
  const handleSize = HANDLE_SIZE_SCREEN / z;

  // Arrow: show internal blue arrow + control points
  if (node.props.type === "arrow") {
    const { dx, dy, strokeWidth, fromNodeId, toNodeId } = node.props;
    const isConnected = !!(fromNodeId && toNodeId);

    let startX: number, startY: number, endX: number, endY: number;
    if (isConnected) {
      const fromNode = allNodes[fromNodeId!];
      const toNode = allNodes[toNodeId!];
      if (!fromNode || !toNode) return null;
      const ep = getConnectedArrowEndpoints(fromNode, toNode);
      startX = ep.x1; startY = ep.y1; endX = ep.x2; endY = ep.y2;
    } else {
      const len = Math.hypot(dx, dy);
      if (len === 0) return null;
      startX = node.x; startY = node.y; endX = node.x + dx; endY = node.y + dy;
    }

    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const arrowSize = Math.min(12, Math.max(8, strokeWidth * 4));

    if (isConnected) {
      const fromNode = allNodes[fromNodeId!]!;
      const toNode = allNodes[toNodeId!]!;
      const fromCenter = getNodeCenter(fromNode);
      const toCenter = getNodeCenter(toNode);

      return (
        <g pointerEvents="none">
          {/* Dashed extension from source node center to arrow start edge */}
          <line
            x1={fromCenter.x} y1={fromCenter.y}
            x2={startX} y2={startY}
            stroke="#9ca3af"
            strokeWidth={1 / z}
            strokeDasharray={`${4 / z} ${3 / z}`}
            strokeLinecap="round"
          />
          {/* Solid blue arrow from edge to edge */}
          <line
            x1={startX} y1={startY} x2={endX} y2={endY}
            stroke="#3b82f6" strokeWidth={1 / z} strokeLinecap="round"
          />
          <path
            d={arrowheadPath(startX, startY, endX, endY, arrowSize)}
            stroke="#3b82f6" strokeWidth={1 / z}
            fill="none" strokeLinecap="round" strokeLinejoin="round"
          />
          {/* Dashed extension from arrow end edge to target node center */}
          <line
            x1={endX} y1={endY}
            x2={toCenter.x} y2={toCenter.y}
            stroke="#9ca3af"
            strokeWidth={1 / z}
            strokeDasharray={`${4 / z} ${3 / z}`}
            strokeLinecap="round"
          />
          {/* Handle at source node center */}
          <circle
            cx={fromCenter.x} cy={fromCenter.y}
            r={handleSize / 2}
            fill="white" stroke="#3b82f6" strokeWidth={1 / z}
          />
          {/* Midpoint handle */}
          <circle
            cx={midX} cy={midY}
            r={handleSize / 2}
            fill="white" stroke="#3b82f6" strokeWidth={1 / z}
          />
          {/* Handle at target node center */}
          <circle
            cx={toCenter.x} cy={toCenter.y}
            r={handleSize / 2}
            fill="white" stroke="#3b82f6" strokeWidth={1 / z}
          />
        </g>
      );
    }

    return (
      <g pointerEvents="none">
        {/* Thin blue arrow overlay */}
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke="#3b82f6"
          strokeWidth={1 / z}
          strokeLinecap="round"
        />
        <path
          d={arrowheadPath(startX, startY, endX, endY, arrowSize)}
          stroke="#3b82f6"
          strokeWidth={1 / z}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Free arrow: start handle */}
        <circle
          cx={startX}
          cy={startY}
          r={handleSize / 2}
          fill="white"
          stroke="#3b82f6"
          strokeWidth={1 / z}
          style={{ cursor: "move" }}
        />

        <circle
          cx={midX}
          cy={midY}
          r={handleSize / 2}
          fill="white"
          stroke="#3b82f6"
          strokeWidth={1 / z}
          style={{ cursor: "move" }}
        />

        {/* Free arrow: end handle */}
        <circle
          cx={endX}
          cy={endY}
          r={handleSize / 2}
          fill="white"
          stroke="#3b82f6"
          strokeWidth={1 / z}
          style={{ cursor: "move" }}
        />
      </g>
    );
  }

  // Rect/Ellipse/Text/Sticky: show outline + 4 white square handles
  if (
    node.props.type === "rect" ||
    node.props.type === "ellipse" ||
    node.props.type === "image" ||
    node.props.type === "freehand" ||
    node.props.type === "text" ||
    node.props.type === "sticky"
  ) {
    const outlineStroke =
      "strokeWidth" in node.props
        ? 1.25 / z
        : 1 / z;
    const frame = getSelectionFrameBounds(node, camera);
    const corners: [string, number, number][] = [
      ["top-left", frame.minX, frame.minY],
      ["top-right", frame.maxX, frame.minY],
      ["bottom-left", frame.minX, frame.maxY],
      ["bottom-right", frame.maxX, frame.maxY],
    ];

    return (
      <g>
        <g pointerEvents="none">
          {node.props.type === "ellipse" ? (
            <ellipse
              cx={node.x + node.width / 2}
              cy={node.y + node.height / 2}
              rx={Math.max(0, node.width / 2)}
              ry={Math.max(0, node.height / 2)}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={outlineStroke}
            />
          ) : node.props.type === "image" ? (
            <rect
              x={frame.minX}
              y={frame.minY}
              width={Math.max(0, frame.maxX - frame.minX)}
              height={Math.max(0, frame.maxY - frame.minY)}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={outlineStroke}
            />
          ) : (
            <rect
              x={frame.minX}
              y={frame.minY}
              width={frame.maxX - frame.minX}
              height={frame.maxY - frame.minY}
              rx={2 / z}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={outlineStroke}
            />
          )}
          {node.props.type !== "sticky" && corners.map(([key, cx, cy]) => (
              <rect
                key={key}
                data-handle={key}
                x={cx - handleSize / 2}
                y={cy - handleSize / 2}
                width={handleSize}
                height={handleSize}
                rx={Math.max(1, handleSize / 4)}
                fill="white"
                stroke="#3b82f6"
                strokeWidth={1.5 / z}
                style={{ cursor: getCursorForHandle(key) }}
              />
            ))}
        </g>
        {/* AI button for text and sticky nodes — outside pointerEvents="none" group */}
        {onAiAction && (node.props.type === "text" || node.props.type === "sticky") && (
          <AiButtonDropdown
            anchorX={frame.maxX + 6 / z}
            anchorY={frame.minY}
            zoom={z}
            actions={SINGLE_NODE_AI_ACTIONS}
            onAiAction={onAiAction}
            isAiLoading={isAiLoading}
          />
        )}
      </g>
    );
  }

  return null;
}

function getCursorForHandle(handle: string): string {
  switch (handle) {
    case "top-left":
    case "bottom-right":
      return "nwse-resize";
    case "top-right":
    case "bottom-left":
      return "nesw-resize";
    default:
      return "default";
  }
}

// ---------------------------------------------------------------------------
// AI quick-action definitions
// ---------------------------------------------------------------------------

type AiAction = {
  label: string;
  instruction: string;
  icon: "grid" | "text" | "tasks" | "questions";
};

const AI_QUICK_ACTIONS: AiAction[] = [
  {
    label: "Organize",
    instruction: "Organize these notes into logical themes with clear labels",
    icon: "grid",
  },
  {
    label: "Summarize",
    instruction: "Summarize these notes in a few sentences",
    icon: "text",
  },
  {
    label: "Critical Questions",
    instruction: "Ask critical questions that challenge assumptions and expose blind spots in these notes",
    icon: "questions",
  },
  {
    label: "Create Tasks",
    instruction: "Create a task list from these notes",
    icon: "tasks",
  },
];

const SINGLE_NODE_AI_ACTIONS: AiAction[] = [
  {
    label: "Summarize",
    instruction: "Summarize these notes in a few sentences",
    icon: "text",
  },
  {
    label: "Critical Questions",
    instruction: "Ask critical questions that challenge assumptions and expose blind spots in these notes",
    icon: "questions",
  },
  {
    label: "Create Tasks",
    instruction: "Create a task list from these notes",
    icon: "tasks",
  },
];

// ---------------------------------------------------------------------------
// Reusable AI button + dropdown (rendered inside a foreignObject)
// ---------------------------------------------------------------------------

function AiButtonDropdown({
  anchorX,
  anchorY,
  zoom,
  actions,
  onAiAction,
  isAiLoading,
}: {
  anchorX: number;
  anchorY: number;
  zoom: number;
  actions: AiAction[];
  onAiAction: (instruction: string) => void;
  isAiLoading?: boolean;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const BTN_SIZE = 28;
  const BTN_GAP = 6;
  const DROPDOWN_W = 160;
  const DROPDOWN_ITEM_H = 32;
  const DROPDOWN_PAD = 4;
  const dropdownH = actions.length * DROPDOWN_ITEM_H + DROPDOWN_PAD * 2;

  return (
    <foreignObject
      x={anchorX}
      y={anchorY}
      width={(dropdownOpen ? Math.max(DROPDOWN_W, BTN_SIZE) : BTN_SIZE) / zoom}
      height={(BTN_SIZE + (dropdownOpen ? BTN_GAP + dropdownH : 0)) / zoom}
      style={{ overflow: "visible" }}
    >
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          transformOrigin: "top left",
          transform: `scale(${1 / zoom})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: `${BTN_GAP}px`,
        }}
      >
        <button
          onClick={() => setDropdownOpen((o) => !o)}
          disabled={isAiLoading}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: BTN_SIZE,
            height: BTN_SIZE,
            borderRadius: "2px",
            border: "1px solid var(--klad-ink, #1a1814)",
            boxShadow: "2px 2px 0 var(--klad-ink, #1a1814)",
            cursor: isAiLoading ? "not-allowed" : "pointer",
            backgroundColor: dropdownOpen
              ? "var(--klad-yellow, #f5e642)"
              : "var(--klad-paper, #f7f4ef)",
            color: "var(--klad-ink, #1a1814)",
            transition: "background-color 0.15s",
            padding: 0,
            opacity: isAiLoading ? 0.8 : 1,
          }}
        >
          <Wand2
            size={14}
            className={isAiLoading ? "ai-wand-loading" : ""}
            style={{ display: "block" }}
          />
        </button>

        {dropdownOpen && (
          <div
            style={{
              width: DROPDOWN_W,
              backgroundColor: "var(--klad-paper, #f7f4ef)",
              border: "1px solid var(--klad-ink, #1a1814)",
              boxShadow: "3px 3px 0 var(--klad-ink, #1a1814)",
              borderRadius: "2px",
              padding: `${DROPDOWN_PAD}px`,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {actions.map((action) => (
              <button
                key={action.label}
                onClick={() => {
                  if (isAiLoading) return;
                  setDropdownOpen(false);
                  onAiAction(action.instruction);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  height: DROPDOWN_ITEM_H,
                  padding: "0 8px",
                  border: "none",
                  borderRadius: "2px",
                  backgroundColor: "transparent",
                  cursor: isAiLoading ? "default" : "pointer",
                  opacity: isAiLoading ? 0.5 : 1,
                  fontFamily: "var(--font-dm-sans, sans-serif)",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "var(--klad-ink, #1a1814)",
                  textAlign: "left",
                  transition: "background-color 0.1s",
                  width: "100%",
                }}
                onMouseEnter={(e) => {
                  if (!isAiLoading) {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      "var(--klad-paper2, #ede9e2)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    "transparent";
                }}
              >
                {action.icon === "grid" ? (
                  <LayoutGrid size={14} style={{ color: "var(--klad-ink3, #7a756e)", flexShrink: 0 }} />
                ) : action.icon === "text" ? (
                  <FileText size={14} style={{ color: "var(--klad-ink3, #7a756e)", flexShrink: 0 }} />
                ) : action.icon === "questions" ? (
                  <MessageCircleQuestion size={14} style={{ color: "var(--klad-ink3, #7a756e)", flexShrink: 0 }} />
                ) : (
                  <ListChecks size={14} style={{ color: "var(--klad-ink3, #7a756e)", flexShrink: 0 }} />
                )}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </foreignObject>
  );
}

// ---------------------------------------------------------------------------
// Multi-select bounding box + AI button
// ---------------------------------------------------------------------------

function MultiSelectBoundingBox({
  nodes,
  camera,
  onAiAction,
  isAiLoading,
}: {
  nodes: CanvasNode[];
  camera: Camera;
  onAiAction?: (instruction: string) => void;
  isAiLoading?: boolean;
}) {
  if (nodes.length === 0) return null;

  // Compute union bounding box
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  }

  const z = camera.zoom;
  const strokeWidth = 1.5 / z;
  const btnGapWorld = 6 / z;

  return (
    <g>
      <rect
        x={minX}
        y={minY}
        width={maxX - minX}
        height={maxY - minY}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={strokeWidth}
        strokeDasharray={`${4 / z} ${2 / z}`}
        pointerEvents="none"
      />

      {/* AI button at top-right corner of bounding box */}
      {onAiAction && (
        <AiButtonDropdown
          anchorX={maxX + btnGapWorld}
          anchorY={minY}
          zoom={z}
          actions={AI_QUICK_ACTIONS}
          onAiAction={onAiAction}
          isAiLoading={isAiLoading}
        />
      )}
    </g>
  );
}
