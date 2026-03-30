"use client";

import { useState, useEffect } from "react";
import type { CanvasNode, Camera } from "@/lib/canvas/types";
import { arrowheadPath } from "./nodes/ArrowNode";

interface SelectionOverlayProps {
  selectedNodes: CanvasNode[];
  marquee: { x: number; y: number; width: number; height: number } | null;
  camera: Camera;
  editingNodeId: string | null;
  stylePreviewNonce?: number;
}

const HANDLE_SIZE_SCREEN = 8; // Size in screen pixels

export default function SelectionOverlay({
  selectedNodes,
  marquee,
  camera,
  editingNodeId,
  stylePreviewNonce,
}: SelectionOverlayProps) {
  const [previewMode, setPreviewMode] = useState(false);

  // Briefly hide selection chrome when entering text edit or changing styles.
  useEffect(() => {
    const shouldPreview = Boolean(stylePreviewNonce);

    if (!shouldPreview) {
      const frame = window.requestAnimationFrame(() => {
        setPreviewMode(false);
      });
      return () => window.cancelAnimationFrame(frame);
    }
    const frame = window.requestAnimationFrame(() => {
      setPreviewMode(true);
    });
    const timer = window.setTimeout(() => setPreviewMode(false), 1500);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [editingNodeId, stylePreviewNonce]);

  if (editingNodeId) {
    return (
      <>
        {marquee && (
          <rect
            x={Math.min(marquee.x, marquee.x + marquee.width)}
            y={Math.min(marquee.y, marquee.y + marquee.height)}
            width={Math.abs(marquee.width)}
            height={Math.abs(marquee.height)}
            fill="rgba(59, 130, 246, 0.1)"
            stroke="#3b82f6"
            strokeWidth={1}
            strokeDasharray="4 2"
            pointerEvents="none"
          />
        )}
      </>
    );
  }

  // Don't show handles in preview mode
  if (previewMode) {
    return (
      <>
        {marquee && (
          <rect
            x={Math.min(marquee.x, marquee.x + marquee.width)}
            y={Math.min(marquee.y, marquee.y + marquee.height)}
            width={Math.abs(marquee.width)}
            height={Math.abs(marquee.height)}
            fill="rgba(59, 130, 246, 0.1)"
            stroke="#3b82f6"
            strokeWidth={1}
            strokeDasharray="4 2"
            pointerEvents="none"
          />
        )}
      </>
    );
  }

  return (
    <>
      {/* Custom selection handles based on node type */}
      {selectedNodes.length === 1 && (
        <SelectionHandles node={selectedNodes[0]} camera={camera} />
      )}

      {/* Multi-select bounding box */}
      {selectedNodes.length > 1 && (
        <MultiSelectBoundingBox nodes={selectedNodes} camera={camera} />
      )}

      {/* Marquee selection rectangle */}
      {marquee && (
        <rect
          x={Math.min(marquee.x, marquee.x + marquee.width)}
          y={Math.min(marquee.y, marquee.y + marquee.height)}
          width={Math.abs(marquee.width)}
          height={Math.abs(marquee.height)}
          fill="rgba(59, 130, 246, 0.1)"
          stroke="#3b82f6"
          strokeWidth={1}
          strokeDasharray="4 2"
          pointerEvents="none"
        />
      )}
    </>
  );
}

function SelectionHandles({
  node,
  camera,
}: {
  node: CanvasNode;
  camera: Camera;
}) {
  const handleSize = HANDLE_SIZE_SCREEN / camera.zoom;

  // Arrow: show internal blue arrow + 3 control points
  if (node.props.type === "arrow") {
    const { dx, dy, strokeWidth } = node.props;
    const len = Math.hypot(dx, dy);
    if (len === 0) return null;

    // Three control points: start, middle (for curve), end
    const startX = node.x;
    const startY = node.y;
    const endX = node.x + dx;
    const endY = node.y + dy;
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;

    const arrowSize = Math.min(12, Math.max(8, strokeWidth * 4));

    return (
      <g pointerEvents="none">
        {/* Thin blue arrow centered inside the existing arrow */}
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke="#3b82f6"
          strokeWidth={Math.max(0.5, 1 / camera.zoom)}
          strokeLinecap="round"
        />
        <path
          d={arrowheadPath(startX, startY, endX, endY, arrowSize)}
          stroke="#3b82f6"
          strokeWidth={Math.max(0.5, 1 / camera.zoom)}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Three white control points */}
        <circle
          cx={startX}
          cy={startY}
          r={handleSize / 2}
          fill="white"
          stroke="#3b82f6"
          strokeWidth={Math.max(0.5, 1 / camera.zoom)}
          style={{ cursor: "move" }}
        />

        <circle
          cx={midX}
          cy={midY}
          r={handleSize / 2}
          fill="white"
          stroke="#3b82f6"
          strokeWidth={Math.max(0.5, 1 / camera.zoom)}
          style={{ cursor: "move" }}
        />

        <circle
          cx={endX}
          cy={endY}
          r={handleSize / 2}
          fill="white"
          stroke="#3b82f6"
          strokeWidth={Math.max(0.5, 1 / camera.zoom)}
          style={{ cursor: "move" }}
        />
      </g>
    );
  }

  // Rect/Ellipse/Text/Sticky: show outline + 4 white square handles
  if (
    node.props.type === "rect" ||
    node.props.type === "ellipse" ||
    node.props.type === "image" ||
    node.props.type === "freehand" ||
    node.props.type === "text" ||
    node.props.type === "sticky"
  ) {
    const outlineStroke =
      "strokeWidth" in node.props
        ? Math.max(0.5, Math.min(node.props.strokeWidth, 1.25) / camera.zoom)
        : Math.max(0.5, 1 / camera.zoom);
    const corners: [string, number, number][] = [
      ["top-left", node.x, node.y],
      ["top-right", node.x + node.width, node.y],
      ["bottom-left", node.x, node.y + node.height],
      ["bottom-right", node.x + node.width, node.y + node.height],
    ];

    return (
      <g pointerEvents="none">
        {node.props.type === "ellipse" ? (
          <ellipse
            cx={node.x + node.width / 2}
            cy={node.y + node.height / 2}
            rx={Math.max(0, node.width / 2)}
            ry={Math.max(0, node.height / 2)}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={outlineStroke}
          />
        ) : node.props.type === "image" ? (
          <rect
            x={node.x + outlineStroke / 2}
            y={node.y + outlineStroke / 2}
            width={Math.max(0, node.width - outlineStroke)}
            height={Math.max(0, node.height - outlineStroke)}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={outlineStroke}
          />
        ) : (
          <rect
            x={node.x}
            y={node.y}
            width={node.width}
            height={node.height}
            rx={Math.max(2, 2 / camera.zoom)}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={outlineStroke}
          />
        )}
        {corners.map(([key, cx, cy]) => (
          <rect
            key={key}
            data-handle={key}
            x={cx - handleSize / 2}
            y={cy - handleSize / 2}
            width={handleSize}
            height={handleSize}
            rx={Math.max(1, handleSize / 4)}
            fill="white"
            stroke="#3b82f6"
            strokeWidth={Math.max(0.5, 1.5 / camera.zoom)}
            style={{ cursor: getCursorForHandle(key) }}
          />
        ))}
      </g>
    );
  }

  return null;
}

function getCursorForHandle(handle: string): string {
  switch (handle) {
    case "top-left":
    case "bottom-right":
      return "nwse-resize";
    case "top-right":
    case "bottom-left":
      return "nesw-resize";
    default:
      return "default";
  }
}

function MultiSelectBoundingBox({
  nodes,
  camera,
}: {
  nodes: CanvasNode[];
  camera: Camera;
}) {
  if (nodes.length === 0) return null;

  // Compute union bounding box
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const strokeWidth = Math.max(0.5, 1.5 / camera.zoom);

  return (
    <rect
      x={minX}
      y={minY}
      width={width}
      height={height}
      fill="none"
      stroke="#3b82f6"
      strokeWidth={strokeWidth}
      strokeDasharray="4 2"
      pointerEvents="none"
    />
  );
}
