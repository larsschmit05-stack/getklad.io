"use client";

import type { CanvasNode } from "@/lib/canvas/types";

interface FreehandNodeProps {
  node: CanvasNode;
  isSelected: boolean;
}

function strokeDashArray(style: string | undefined, width: number): string | undefined {
  if (style === "dashed") return `${width * 6} ${width * 4}`;
  if (style === "dotted") return `${width} ${width * 3}`;
  return undefined;
}

/** Smooth point array into a cubic Bezier SVG path. */
function smoothPath(points: Array<[number, number]>): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0][0]} ${points[0][1]} L ${points[1][0]} ${points[1][1]}`;
  }
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

export default function FreehandNode({ node, isSelected }: FreehandNodeProps) {
  if (node.props.type !== "freehand") return null;
  const { points, stroke, strokeWidth, strokeStyle } = node.props;

  if (points.length < 2) return null;

  const d = smoothPath(points);
  const dash = strokeDashArray(strokeStyle, strokeWidth);

  return (
    <g transform={`translate(${node.x}, ${node.y})`}>
      {/* Wider invisible stroke for easier selection */}
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(strokeWidth + 12, 16)}
      />
      <path
        d={d}
        fill="none"
        stroke={isSelected ? "#3b82f6" : stroke}
        strokeWidth={isSelected ? Math.max(strokeWidth, 2) : strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dash}
      />
    </g>
  );
}
