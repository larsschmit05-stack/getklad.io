"use client";

import type { CanvasNode } from "@/lib/canvas/types";

interface TextNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  isEditing: boolean;
  onTextChange?: (text: string) => void;
  onBlur?: () => void;
}

export default function TextNode({
  node,
  isSelected,
  isEditing,
  onTextChange,
  onBlur,
}: TextNodeProps) {
  if (node.props.type !== "text") return null;
  void isSelected;
  const { text, fontSize, color } = node.props;

  return (
    <g transform={`translate(${node.x}, ${node.y})`}>
      {/* Invisible hit area */}
      <rect
        width={node.width}
        height={node.height}
        fill="transparent"
        stroke="none"
        strokeWidth={0}
        rx={2}
      />
      {isEditing ? (
        <foreignObject width={node.width} height={node.height}>
          <textarea
            value={text}
            onChange={(e) => onTextChange?.(e.target.value)}
            onBlur={onBlur}
            style={{
              width: "100%",
              height: "100%",
              display: "block",
              boxSizing: "border-box",
              fontSize: `${fontSize}px`,
              color,
              background: "transparent",
              border: "none",
              outline: "none",
              padding: "4px 6px",
              margin: 0,
              fontFamily: "var(--font-geist-sans), sans-serif",
              wordBreak: "break-word",
              whiteSpace: "pre-wrap",
              overflow: "hidden",
              resize: "none",
              textAlign: "left",
              lineHeight: "1.35",
            }}
            autoFocus
          />
        </foreignObject>
      ) : (
        <foreignObject width={node.width} height={node.height}>
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "block",
              boxSizing: "border-box",
              fontSize: `${fontSize}px`,
              color,
              padding: "4px 6px",
              fontFamily: "var(--font-geist-sans), sans-serif",
              wordBreak: "break-word",
              whiteSpace: "pre-wrap",
              pointerEvents: "none",
              userSelect: "none",
              textAlign: "left",
              lineHeight: "1.35",
            }}
          >
            {text}
          </div>
        </foreignObject>
      )}
    </g>
  );
}
