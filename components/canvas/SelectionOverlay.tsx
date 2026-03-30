"use client";

import { useState, useEffect } from "react";
import type { CanvasNode, Camera } from "@/lib/canvas/types";
import { getSelectionFrameBounds, getConnectedArrowEndpoints, getNodeCenter } from "@/lib/canvas/geometry";
import { arrowheadPath } from "./nodes/ArrowNode";
import { smoothPath } from "./nodes/FreehandNode";

interface SelectionOverlayProps {
  selectedNodes: CanvasNode[];
  hoveredNode: CanvasNode | null;
  marquee: { x: number; y: number; width: number; height: number } | null;
  camera: Camera;
  editingNodeId: string | null;
  stylePreviewNonce?: number;
  allNodes: Record<string, CanvasNode>;
}

const HANDLE_SIZE_SCREEN = 8; // Size in screen pixels

export default function SelectionOverlay({
  selectedNodes,
  hoveredNode,
  marquee,
  camera,
  editingNodeId,
  stylePreviewNonce,
  allNodes,
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
            strokeWidth={1 / camera.zoom}
            strokeDasharray={`${4 / camera.zoom} ${2 / camera.zoom}`}
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
            strokeWidth={1 / camera.zoom}
            strokeDasharray={`${4 / camera.zoom} ${2 / camera.zoom}`}
            pointerEvents="none"
          />
        )}
      </>
    );
  }

  return (
    <>
      {hoveredNode && selectedNodes.length === 0 && (
        <HoverOutline node={hoveredNode} camera={camera} />
      )}

      {/* Keep the single-selection outline visible at any zoom; only hide handles at low zoom */}
      {selectedNodes.length === 1 && (
        <SelectionHandles
          node={selectedNodes[0]}
          camera={camera}
          allNodes={allNodes}
        />
      )}

      {/* Multi-select bounding box — always visible to show selection */}
      {selectedNodes.length > 1 && (
        <MultiSelectBoundingBox nodes={selectedNodes} camera={camera} />
      )}

      {/* Marquee selection rectangle — always visible to show selection area */}
      {marquee && (
        <rect
          x={Math.min(marquee.x, marquee.x + marquee.width)}
          y={Math.min(marquee.y, marquee.y + marquee.height)}
          width={Math.abs(marquee.width)}
          height={Math.abs(marquee.height)}
          fill="rgba(59, 130, 246, 0.1)"
          stroke="#3b82f6"
          strokeWidth={1 / camera.zoom}
          strokeDasharray={`${4 / camera.zoom} ${2 / camera.zoom}`}
          pointerEvents="none"
        />
      )}
    </>
  );
}

function HoverOutline({
  node,
  camera,
}: {
  node: CanvasNode;
  camera: Camera;
}) {
  const z = camera.zoom;

  if (node.props.type === "arrow") {
    const { dx, dy } = node.props;
    return (
      <g pointerEvents="none" opacity={0.9}>
        <line
          x1={node.x}
          y1={node.y}
          x2={node.x + dx}
          y2={node.y + dy}
          stroke="#3b82f6"
          strokeWidth={1.5 / z}
          strokeLinecap="round"
        />
        <path
          d={arrowheadPath(node.x, node.y, node.x + dx, node.y + dy, 10)}
          stroke="#3b82f6"
          strokeWidth={1.5 / z}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    );
  }

  if (node.props.type === "freehand") {
    const path = smoothPath(node.props.points);
    if (!path) return null;
    return (
      <path
        d={path}
        transform={`translate(${node.x}, ${node.y})`}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={Math.max(node.props.strokeWidth, 2 / z)}
        strokeDasharray={
          node.props.strokeStyle === "dashed"
            ? `${node.props.strokeWidth * 6} ${node.props.strokeWidth * 4}`
            : node.props.strokeStyle === "dotted"
              ? `${node.props.strokeWidth} ${node.props.strokeWidth * 3}`
              : undefined
        }
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
        pointerEvents="none"
      />
    );
  }

  const frame = getSelectionFrameBounds(node, camera);
  const strokeWidth = 1.5 / z;

  if (node.props.type === "ellipse") {
    return (
      <ellipse
        cx={node.x + node.width / 2}
        cy={node.y + node.height / 2}
        rx={Math.max(0, node.width / 2)}
        ry={Math.max(0, node.height / 2)}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={strokeWidth}
        opacity={0.9}
        pointerEvents="none"
      />
    );
  }

  return (
    <rect
      x={frame.minX}
      y={frame.minY}
      width={Math.max(0, frame.maxX - frame.minX)}
      height={Math.max(0, frame.maxY - frame.minY)}
      rx={2 / z}
      fill="none"
      stroke="#3b82f6"
      strokeWidth={strokeWidth}
      opacity={0.9}
      pointerEvents="none"
    />
  );
}

function SelectionHandles({
  node,
  camera,
  allNodes,
}: {
  node: CanvasNode;
  camera: Camera;
  allNodes: Record<string, CanvasNode>;
}) {
  const z = camera.zoom;
  const handleSize = HANDLE_SIZE_SCREEN / z;

  // Arrow: show internal blue arrow + control points
  if (node.props.type === "arrow") {
    const { dx, dy, strokeWidth, fromNodeId, toNodeId } = node.props;
    const isConnected = !!(fromNodeId && toNodeId);

    let startX: number, startY: number, endX: number, endY: number;
    if (isConnected) {
      const fromNode = allNodes[fromNodeId!];
      const toNode = allNodes[toNodeId!];
      if (!fromNode || !toNode) return null;
      const ep = getConnectedArrowEndpoints(fromNode, toNode);
      startX = ep.x1; startY = ep.y1; endX = ep.x2; endY = ep.y2;
    } else {
      const len = Math.hypot(dx, dy);
      if (len === 0) return null;
      startX = node.x; startY = node.y; endX = node.x + dx; endY = node.y + dy;
    }

    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const arrowSize = Math.min(12, Math.max(8, strokeWidth * 4));

    if (isConnected) {
      const fromNode = allNodes[fromNodeId!]!;
      const toNode = allNodes[toNodeId!]!;
      const fromCenter = getNodeCenter(fromNode);
      const toCenter = getNodeCenter(toNode);

      return (
        <g pointerEvents="none">
          {/* Dashed extension from source node center to arrow start edge */}
          <line
            x1={fromCenter.x} y1={fromCenter.y}
            x2={startX} y2={startY}
            stroke="#9ca3af"
            strokeWidth={1 / z}
            strokeDasharray={`${4 / z} ${3 / z}`}
            strokeLinecap="round"
          />
          {/* Solid blue arrow from edge to edge */}
          <line
            x1={startX} y1={startY} x2={endX} y2={endY}
            stroke="#3b82f6" strokeWidth={1 / z} strokeLinecap="round"
          />
          <path
            d={arrowheadPath(startX, startY, endX, endY, arrowSize)}
            stroke="#3b82f6" strokeWidth={1 / z}
            fill="none" strokeLinecap="round" strokeLinejoin="round"
          />
          {/* Dashed extension from arrow end edge to target node center */}
          <line
            x1={endX} y1={endY}
            x2={toCenter.x} y2={toCenter.y}
            stroke="#9ca3af"
            strokeWidth={1 / z}
            strokeDasharray={`${4 / z} ${3 / z}`}
            strokeLinecap="round"
          />
          {/* Handle at source node center */}
          <circle
            cx={fromCenter.x} cy={fromCenter.y}
            r={handleSize / 2}
            fill="white" stroke="#3b82f6" strokeWidth={1 / z}
          />
          {/* Midpoint handle */}
          <circle
            cx={midX} cy={midY}
            r={handleSize / 2}
            fill="white" stroke="#3b82f6" strokeWidth={1 / z}
          />
          {/* Handle at target node center */}
          <circle
            cx={toCenter.x} cy={toCenter.y}
            r={handleSize / 2}
            fill="white" stroke="#3b82f6" strokeWidth={1 / z}
          />
        </g>
      );
    }

    return (
      <g pointerEvents="none">
        {/* Thin blue arrow overlay */}
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke="#3b82f6"
          strokeWidth={1 / z}
          strokeLinecap="round"
        />
        <path
          d={arrowheadPath(startX, startY, endX, endY, arrowSize)}
          stroke="#3b82f6"
          strokeWidth={1 / z}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Free arrow: start handle */}
        <circle
          cx={startX}
          cy={startY}
          r={handleSize / 2}
          fill="white"
          stroke="#3b82f6"
          strokeWidth={1 / z}
          style={{ cursor: "move" }}
        />

        <circle
          cx={midX}
          cy={midY}
          r={handleSize / 2}
          fill="white"
          stroke="#3b82f6"
          strokeWidth={1 / z}
          style={{ cursor: "move" }}
        />

        {/* Free arrow: end handle */}
        <circle
          cx={endX}
          cy={endY}
          r={handleSize / 2}
          fill="white"
          stroke="#3b82f6"
          strokeWidth={1 / z}
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
        ? 1.25 / z
        : 1 / z;
    const frame = getSelectionFrameBounds(node, camera);
    const corners: [string, number, number][] = [
      ["top-left", frame.minX, frame.minY],
      ["top-right", frame.maxX, frame.minY],
      ["bottom-left", frame.minX, frame.maxY],
      ["bottom-right", frame.maxX, frame.maxY],
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
            x={frame.minX}
            y={frame.minY}
            width={Math.max(0, frame.maxX - frame.minX)}
            height={Math.max(0, frame.maxY - frame.minY)}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={outlineStroke}
          />
        ) : (
          <rect
            x={frame.minX}
            y={frame.minY}
            width={frame.maxX - frame.minX}
            height={frame.maxY - frame.minY}
            rx={2 / z}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={outlineStroke}
          />
        )}
        {node.props.type !== "sticky" && corners.map(([key, cx, cy]) => (
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
              strokeWidth={1.5 / z}
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
  const z = camera.zoom;
  const strokeWidth = 1.5 / z;

  return (
    <rect
      x={minX}
      y={minY}
      width={width}
      height={height}
      fill="none"
      stroke="#3b82f6"
      strokeWidth={strokeWidth}
      strokeDasharray={`${4 / z} ${2 / z}`}
      pointerEvents="none"
    />
  );
}
