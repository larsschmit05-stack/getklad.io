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

function areImageNodePropsEqual(prev: ImageNodeProps, next: ImageNodeProps): boolean {
  const prevProps = prev.node.props as {
    src?: string;
    alt?: string;
    opacity?: number;
    fit?: string;
  };
  const nextProps = next.node.props as {
    src?: string;
    alt?: string;
    opacity?: number;
    fit?: string;
  };

  return (
    prev.node.id === next.node.id &&
    prev.node.x === next.node.x &&
    prev.node.y === next.node.y &&
    prev.node.width === next.node.width &&
    prev.node.height === next.node.height &&
    prev.node.rotation === next.node.rotation &&
    prev.isSelected === next.isSelected &&
    prevProps.src === nextProps.src &&
    prevProps.alt === nextProps.alt &&
    prevProps.opacity === nextProps.opacity &&
    prevProps.fit === nextProps.fit
  );
}

export default memo(ImageNode, areImageNodePropsEqual);
