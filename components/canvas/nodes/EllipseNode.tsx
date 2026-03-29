"use client";

import type { CanvasNode } from "@/lib/canvas/types";

interface EllipseNodeProps {
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

export default function EllipseNode({ node, isSelected }: EllipseNodeProps) {
  if (node.props.type !== "ellipse") return null;
  void isSelected;
  const { fill, stroke, strokeWidth, strokeStyle, fillStyle } = node.props;

  const cx = node.width / 2;
  const cy = node.height / 2;
  const { fill: resolvedFill, fillOpacity } = resolveFill(fill, fillStyle);
  const dash = strokeDashArray(strokeStyle, strokeWidth);

  return (
    <g transform={`translate(${node.x}, ${node.y})`}>
      <ellipse
        cx={cx}
        cy={cy}
        rx={cx}
        ry={cy}
        fill={resolvedFill}
        fillOpacity={fillOpacity}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dash}
      />
    </g>
  );
}
