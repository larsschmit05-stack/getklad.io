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
  const { src, alt, opacity = 1, fit = "contain", cropBox } = node.props;
  const clipPathId = `clip-${node.id}`;

  return (
    <g transform={`translate(${node.x}, ${node.y})`}>
      {/* Define clipping path if crop exists */}
      {cropBox && (
        <defs>
          <clipPath id={clipPathId}>
            <rect x={cropBox.x} y={cropBox.y} width={cropBox.width} height={cropBox.height} />
          </clipPath>
        </defs>
      )}
      {/* Use key to force re-render when fit or cropBox changes */}
      <image
        key={`${src}-${fit}-${cropBox?.x || 0}`}
        href={src}
        width={node.width}
        height={node.height}
        preserveAspectRatio={fit === "cover" ? "xMidYMid slice" : "xMidYMid meet"}
        opacity={opacity}
        aria-label={alt}
        clipPath={cropBox ? `url(#${clipPathId})` : undefined}
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
    cropBox?: { x: number; y: number; width: number; height: number };
  };
  const nextProps = next.node.props as {
    src?: string;
    alt?: string;
    opacity?: number;
    fit?: string;
    cropBox?: { x: number; y: number; width: number; height: number };
  };
  const cropBoxEqual =
    prevProps.cropBox === nextProps.cropBox ||
    (prevProps.cropBox &&
      nextProps.cropBox &&
      prevProps.cropBox.x === nextProps.cropBox.x &&
      prevProps.cropBox.y === nextProps.cropBox.y &&
      prevProps.cropBox.width === nextProps.cropBox.width &&
      prevProps.cropBox.height === nextProps.cropBox.height) ||
    (!prevProps.cropBox && !nextProps.cropBox);

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
    prevProps.fit === nextProps.fit &&
    cropBoxEqual
  );
}

export default memo(ImageNode, areImageNodePropsEqual);
