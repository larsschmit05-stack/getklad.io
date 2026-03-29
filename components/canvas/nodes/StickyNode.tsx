"use client";

import { useLayoutEffect, useRef } from "react";

import type { CanvasNode } from "@/lib/canvas/types";

interface StickyNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  isEditing: boolean;
  onTextChange?: (text: string) => void;
  onBlur?: () => void;
}

const STICKY_COLORS: Record<string, { bg: string; text: string }> = {
  yellow: { bg: "#fef9c3", text: "#713f12" },
  blue: { bg: "#dbeafe", text: "#1e3a5f" },
  green: { bg: "#dcfce7", text: "#14532d" },
  pink: { bg: "#fce7f3", text: "#701a4e" },
};

export default function StickyNode({
  node,
  isSelected,
  isEditing,
  onTextChange,
  onBlur,
}: StickyNodeProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const stickyType = node.props.type;
  const stickyText = stickyType === "sticky" ? node.props.text : "";

  useLayoutEffect(() => {
    if (stickyType !== "sticky") return;
    if (!isEditing || !textareaRef.current) return;

    const textarea = textareaRef.current;
    const availableHeight = Math.max(node.height - 24, 0);

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, availableHeight)}px`;
  }, [isEditing, node.height, stickyText, stickyType]);

  if (stickyType !== "sticky") return null;
  void isSelected;
  const { text, color } = node.props;
  const colors = STICKY_COLORS[color] ?? STICKY_COLORS.yellow;

  return (
    <g transform={`translate(${node.x}, ${node.y})`}>
      {/* Shadow */}
      <rect
        width={node.width}
        height={node.height}
        rx={4}
        fill="rgba(0,0,0,0.08)"
        transform="translate(3, 3)"
      />
      {/* Card */}
      <rect
        width={node.width}
        height={node.height}
        rx={4}
        fill={colors.bg}
        stroke="rgba(0,0,0,0.1)"
        strokeWidth={1}
      />
      {isEditing ? (
        <foreignObject width={node.width} height={node.height}>
          <div
            style={{
              width: "100%",
              height: "100%",
              boxSizing: "border-box",
              padding: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => onTextChange?.(e.target.value)}
              onBlur={onBlur}
              style={{
                width: "100%",
                minHeight: "1.35em",
                maxHeight: "100%",
                display: "block",
                boxSizing: "border-box",
                color: colors.text,
                fontSize: "14px",
                fontFamily: "var(--font-geist-sans), sans-serif",
                background: "transparent",
                border: "none",
                outline: "none",
                padding: 0,
                margin: 0,
                wordBreak: "break-word",
                whiteSpace: "pre-wrap",
                overflowY: "auto",
                overflowX: "hidden",
                resize: "none",
                textAlign: "center",
                lineHeight: "1.35",
              }}
              autoFocus
            />
          </div>
        </foreignObject>
      ) : (
        <foreignObject width={node.width} height={node.height}>
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "block",
              boxSizing: "border-box",
              color: colors.text,
              fontSize: "14px",
              fontFamily: "var(--font-geist-sans), sans-serif",
              padding: "12px",
              wordBreak: "break-word",
              whiteSpace: "pre-wrap",
              pointerEvents: "none",
              userSelect: "none",
              overflow: "hidden",
              textAlign: "center",
              lineHeight: "1.35",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                display: "block",
                width: "100%",
                maxHeight: "100%",
                overflow: "hidden",
              }}
            >
              {text}
            </span>
          </div>
        </foreignObject>
      )}
    </g>
  );
}
