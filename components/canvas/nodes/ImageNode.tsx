"use client";

import type { CanvasNode } from "@/lib/canvas/types";

interface ImageNodeProps {
  node: CanvasNode;
  isSelected: boolean;
}

export default function ImageNode({ node, isSelected }: ImageNodeProps) {
  if (node.props.type !== "image") return null;
  const { src, alt } = node.props;

  return (
    <g transform={`translate(${node.x}, ${node.y})`}>
      <image
        href={src}
        width={node.width}
        height={node.height}
        preserveAspectRatio="xMidYMid meet"
        aria-label={alt}
      />
      {isSelected && (
        <rect
          width={node.width}
          height={node.height}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
        />
      )}
    </g>
  );
}
