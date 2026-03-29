"use client";

import { useLayoutEffect, useRef } from "react";

import type { CanvasNode } from "@/lib/canvas/types";

interface TextNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  isEditing: boolean;
  onTextChange?: (text: string) => void;
  onSizeChange?: (width: number, height: number) => void;
  onBlur?: () => void;
}

export default function TextNode({
  node,
  isSelected,
  isEditing,
  onTextChange,
  onSizeChange,
  onBlur,
}: TextNodeProps) {
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const displayRef = useRef<HTMLDivElement | null>(null);
  const textType = node.props.type;
  const text = textType === "text" ? node.props.text : "";
  const fontSize = textType === "text" ? node.props.fontSize : 16;
  const color = textType === "text" ? node.props.color : "#1a1814";
  const lineHeight = 1.35;
  const horizontalPadding = 20;
  const verticalPadding = 12;

  useLayoutEffect(() => {
    if (textType !== "text") return;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return;

    context.font = `${fontSize}px Geist, ui-sans-serif, system-ui, sans-serif`;

    const content = text.length > 0 ? text : " ";
    const lines = content.split("\n");
    const longestLine = lines.reduce((max, line) => {
      const measured = context.measureText(line.length > 0 ? line : " ").width;
      return Math.max(max, measured);
    }, 0);

    const measuredWidth = Math.max(
      32,
      Math.ceil(longestLine + horizontalPadding)
    );
    const measuredHeight = Math.max(
      Math.ceil(fontSize * lineHeight + verticalPadding),
      Math.ceil(lines.length * fontSize * lineHeight + verticalPadding)
    );

    if (
      Math.abs(measuredWidth - node.width) > 1 ||
      Math.abs(measuredHeight - node.height) > 1
    ) {
      onSizeChange?.(measuredWidth, measuredHeight);
    }
  }, [
    fontSize,
    horizontalPadding,
    lineHeight,
    node.height,
    node.width,
    onSizeChange,
    text,
    textType,
    verticalPadding,
  ]);

  useLayoutEffect(() => {
    if (!isEditing || !editorRef.current) return;

    const textarea = editorRef.current;
    textarea.focus();
    const caret = textarea.value.length;
    textarea.setSelectionRange(caret, caret);
  }, [isEditing]);

  if (textType !== "text") return null;
  void isSelected;

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
            ref={editorRef}
            value={text}
            onChange={(e) => onTextChange?.(e.target.value)}
            onBlur={onBlur}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.currentTarget.blur();
              }
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
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
              whiteSpace: "pre",
              overflowY: "hidden",
              overflowX: "hidden",
              resize: "none",
              textAlign: "left",
              lineHeight: String(lineHeight),
            }}
            autoFocus
          />
        </foreignObject>
      ) : (
        <foreignObject width={node.width} height={node.height}>
          <div
            ref={displayRef}
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
              whiteSpace: "pre",
              pointerEvents: "none",
              userSelect: "none",
              textAlign: "left",
              lineHeight: String(lineHeight),
            }}
          >
            {text}
          </div>
        </foreignObject>
      )}
    </g>
  );
}
