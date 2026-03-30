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
  const cropX = (node.props as { cropX?: number }).cropX ?? 0;
  const cropY = (node.props as { cropY?: number }).cropY ?? 0;
  const cropW = (node.props as { cropW?: number }).cropW ?? 1;
  const cropH = (node.props as { cropH?: number }).cropH ?? 1;

  // If cropped, use clipPath; otherwise use simple preserveAspectRatio
  if (cropX !== 0 || cropY !== 0 || cropW !== 1 || cropH !== 1) {
    // Crop mode: image is scaled so crop region fills node box
    const imgW = node.width / cropW;
    const imgH = node.height / cropH;
    const imgX = -cropX * imgW;
    const imgY = -cropY * imgH;

    return (
      <g transform={`translate(${node.x}, ${node.y})`}>
        <defs>
          <clipPath id={`crop-${node.id}`} clipPathUnits="userSpaceOnUse">
            <rect x={0} y={0} width={node.width} height={node.height} />
          </clipPath>
        </defs>
        <image
          href={src}
          x={imgX}
          y={imgY}
          width={imgW}
          height={imgH}
          preserveAspectRatio="none"
          clipPath={`url(#crop-${node.id})`}
          opacity={opacity}
          aria-label={alt}
        />
      </g>
    );
  }

  // No crop: use standard fit modes
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

function areImageNodePropsEqual(prev: ImageNodeProps, next: ImageNodeProps) {
  const prevProps = prev.node.props as { src?: string; alt?: string; opacity?: number; fit?: string; cropX?: number; cropY?: number; cropW?: number; cropH?: number };
  const nextProps = next.node.props as { src?: string; alt?: string; opacity?: number; fit?: string; cropX?: number; cropY?: number; cropW?: number; cropH?: number };

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
    (prevProps.cropX ?? 0) === (nextProps.cropX ?? 0) &&
    (prevProps.cropY ?? 0) === (nextProps.cropY ?? 0) &&
    (prevProps.cropW ?? 1) === (nextProps.cropW ?? 1) &&
    (prevProps.cropH ?? 1) === (nextProps.cropH ?? 1)
  );
}

export default memo(ImageNode, areImageNodePropsEqual);
