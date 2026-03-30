"use client";

import { memo, useLayoutEffect, useRef } from "react";

import type { CanvasNode } from "@/lib/canvas/types";
import {
  getTextDomFontFamily,
  measureTextNodeSize,
  TEXT_BOX_PADDING_X,
  TEXT_BOX_PADDING_Y,
  TEXT_LINE_HEIGHT,
} from "@/lib/canvas/text";

interface TextNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  isEditing: boolean;
  onTextChange?: (text: string) => void;
  onSizeChange?: (width: number, height: number) => void;
  onBlur?: () => void;
}

function TextNode({
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
  const fontFamily = textType === "text" ? node.props.fontFamily : "sans";
  const fontWeight = textType === "text" ? node.props.fontWeight : "normal";
  const fontStyle = textType === "text" ? node.props.fontStyle : "normal";
  const textDecoration = textType === "text" ? node.props.textDecoration : "none";

  useLayoutEffect(() => {
    if (textType !== "text" || !isEditing) return;
    const { width: measuredWidth, height: measuredHeight } = measureTextNodeSize(
      node.props
    );

    if (
      Math.abs(measuredWidth - node.width) > 1 ||
      Math.abs(measuredHeight - node.height) > 1
    ) {
      onSizeChange?.(measuredWidth, measuredHeight);
    }
  }, [
    fontSize,
    fontFamily,
    fontStyle,
    fontWeight,
    node.height,
    node.width,
    onSizeChange,
    text,
    textType,
    isEditing,
    node.props,
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
              padding: `${TEXT_BOX_PADDING_Y}px ${TEXT_BOX_PADDING_X}px`,
              margin: 0,
              fontFamily: getTextDomFontFamily(fontFamily),
              fontWeight,
              fontStyle,
              textDecoration,
              wordBreak: "break-word",
              whiteSpace: "pre",
              overflowY: "hidden",
              overflowX: "hidden",
              resize: "none",
              textAlign: "left",
              lineHeight: String(TEXT_LINE_HEIGHT),
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
              display: "flex",
              justifyContent: "flex-start",
              boxSizing: "border-box",
              fontSize: `${fontSize}px`,
              color,
              padding: `${TEXT_BOX_PADDING_Y}px ${TEXT_BOX_PADDING_X}px`,
              fontFamily: getTextDomFontFamily(fontFamily),
              fontWeight,
              fontStyle,
              textDecoration,
              wordBreak: "break-word",
              whiteSpace: "pre",
              pointerEvents: "none",
              userSelect: "none",
              textAlign: "left",
              lineHeight: String(TEXT_LINE_HEIGHT),
              overflow: "hidden",
            }}
          >
            <span style={{ display: "block", width: "100%" }}>{text}</span>
          </div>
        </foreignObject>
      )}
    </g>
  );
}

function areTextNodePropsEqual(prev: TextNodeProps, next: TextNodeProps) {
  return (
    prev.node === next.node &&
    prev.isSelected === next.isSelected &&
    prev.isEditing === next.isEditing
  );
}

export default memo(TextNode, areTextNodePropsEqual);
