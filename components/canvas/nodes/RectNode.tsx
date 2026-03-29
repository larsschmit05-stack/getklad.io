"use client";

import type { CanvasNode } from "@/lib/canvas/types";

interface RectNodeProps {
  node: CanvasNode;
  isSelected: boolean;
}

function strokeDashArray(style: string | undefined, width: number): string | undefined {
  if (style === "dashed") return `${width * 6} ${width * 4}`;
  if (style === "dotted") return `${width} ${width * 3}`;
  return undefined;
}

function resolveFill(fill: string, fillStyle: string | undefined): { fill: string; fillOpacity: number } {
  if (fillStyle === "none") return { fill: "transparent", fillOpacity: 0 };
  if (fillStyle === "semi") return { fill, fillOpacity: 0.25 };
  return { fill, fillOpacity: 1 };
}

export default function RectNode({ node, isSelected }: RectNodeProps) {
  if (node.props.type !== "rect") return null;
  void isSelected;
  const { fill, stroke, strokeWidth, strokeStyle, fillStyle } = node.props;

  const { fill: resolvedFill, fillOpacity } = resolveFill(fill, fillStyle);
  const dash = strokeDashArray(strokeStyle, strokeWidth);

  return (
    <g transform={`translate(${node.x}, ${node.y})`}>
      <rect
        width={node.width}
        height={node.height}
        rx={2}
        fill={resolvedFill}
        fillOpacity={fillOpacity}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dash}
      />
    </g>
  );
}
