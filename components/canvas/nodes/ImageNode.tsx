"use client";

import { memo } from "react";

import type { CanvasNode } from "@/lib/canvas/types";

interface ImageNodeProps {
  node: CanvasNode;
  isSelected: boolean;
}

function ImageNode({ node, isSelected }: ImageNodeProps) {
  if (node.props.type !== "image") return null;
  void isSelected;
  const { src, alt, opacity = 1, fit = "contain" } = node.props;

  return (
    <g transform={`translate(${node.x}, ${node.y})`}>
      {/* Use key to force re-render when fit changes */}
      <image
        key={`${src}-${fit}`}
        href={src}
        width={node.width}
        height={node.height}
        preserveAspectRatio={fit === "cover" ? "xMidYMid slice" : "xMidYMid meet"}
        opacity={opacity}
        aria-label={alt}
      />
    </g>
  );
}

function areImageNodePropsEqual(prev: ImageNodeProps, next: ImageNodeProps) {
  return (
    prev.node.id === next.node.id &&
    prev.node.x === next.node.x &&
    prev.node.y === next.node.y &&
    prev.node.width === next.node.width &&
    prev.node.height === next.node.height &&
    prev.node.rotation === next.node.rotation &&
    prev.isSelected === next.isSelected &&
    (prev.node.props as { src?: string; alt?: string; opacity?: number; fit?: string }).src ===
      (next.node.props as { src?: string; alt?: string; opacity?: number; fit?: string }).src &&
    (prev.node.props as { src?: string; alt?: string; opacity?: number; fit?: string }).alt ===
      (next.node.props as { src?: string; alt?: string; opacity?: number; fit?: string }).alt &&
    (prev.node.props as { src?: string; alt?: string; opacity?: number; fit?: string }).opacity ===
      (next.node.props as { src?: string; alt?: string; opacity?: number; fit?: string }).opacity &&
    (prev.node.props as { src?: string; alt?: string; opacity?: number; fit?: string }).fit ===
      (next.node.props as { src?: string; alt?: string; opacity?: number; fit?: string }).fit
  );
}

export default memo(ImageNode, areImageNodePropsEqual);
