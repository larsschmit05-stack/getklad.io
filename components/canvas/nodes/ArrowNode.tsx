"use client";

import { memo } from "react";

import type { CanvasNode } from "@/lib/canvas/types";

interface ArrowNodeProps {
  node: CanvasNode;
  isSelected: boolean;
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

function ArrowNode({ node, isSelected }: ArrowNodeProps) {
  if (node.props.type !== "arrow") return null;
  void isSelected;
  const { dx, dy, stroke, strokeWidth, strokeStyle } = node.props;

  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return null;

  const x1 = node.x;
  const y1 = node.y;
  const x2 = node.x + dx;
  const y2 = node.y + dy;

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
