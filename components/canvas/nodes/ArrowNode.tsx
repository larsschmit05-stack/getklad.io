"use client";

import { memo } from "react";

import type { CanvasNode } from "@/lib/canvas/types";
import { getConnectedArrowEndpoints } from "@/lib/canvas/geometry";

interface ArrowNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  allNodes?: Record<string, CanvasNode>;
}

/** Compute an open arrowhead path at (endX, endY) pointing from (startX, startY). */
export function arrowheadPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  size = 12
): string {
  const angle = Math.atan2(endY - startY, endX - startX);
  const spread = Math.PI / 6;
  const ax = endX - size * Math.cos(angle - spread);
  const ay = endY - size * Math.sin(angle - spread);
  const bx = endX - size * Math.cos(angle + spread);
  const by = endY - size * Math.sin(angle + spread);
  return `M ${ax.toFixed(2)} ${ay.toFixed(2)} L ${endX.toFixed(2)} ${endY.toFixed(2)} L ${bx.toFixed(2)} ${by.toFixed(2)}`;
}

function strokeDashArray(
  style: string | undefined,
  width: number
): string | undefined {
  if (style === "dashed") return `${width * 6} ${width * 4}`;
  if (style === "dotted") return `${width} ${width * 3}`;
  return undefined;
}

function ArrowNode({ node, isSelected, allNodes }: ArrowNodeProps) {
  if (node.props.type !== "arrow") return null;
  void isSelected;
  const { dx, dy, stroke, strokeWidth, strokeStyle, fromNodeId, toNodeId } = node.props;

  let x1: number, y1: number, x2: number, y2: number;

  if (fromNodeId && toNodeId && allNodes) {
    const fromNode = allNodes[fromNodeId];
    const toNode = allNodes[toNodeId];
    if (fromNode && toNode) {
      const ep = getConnectedArrowEndpoints(fromNode, toNode);
      x1 = ep.x1; y1 = ep.y1; x2 = ep.x2; y2 = ep.y2;
    } else {
      // Fallback: referenced node was deleted, use stored vector
      x1 = node.x; y1 = node.y; x2 = node.x + dx; y2 = node.y + dy;
    }
  } else {
    x1 = node.x; y1 = node.y; x2 = node.x + dx; y2 = node.y + dy;
  }

  if (Math.hypot(x2 - x1, y2 - y1) < 1) return null;

  const dash = strokeDashArray(strokeStyle, strokeWidth);
  const arrowSize = Math.min(12, Math.max(8, strokeWidth * 4));

  return (
    <g>
      {/* Wider invisible stroke for easier hit testing */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="transparent"
        strokeWidth={Math.max(strokeWidth + 12, 16)}
      />
      {/* Shaft */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dash}
        strokeLinecap="round"
      />
      {/* Arrowhead */}
      <path
        d={arrowheadPath(x1, y1, x2, y2, arrowSize)}
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

export default memo(ArrowNode);
