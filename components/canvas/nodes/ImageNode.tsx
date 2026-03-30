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
      <image
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

export default memo(ImageNode);
