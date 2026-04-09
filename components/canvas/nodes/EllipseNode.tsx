"use client";

import { memo, useId, useLayoutEffect, useRef } from "react";

import type { CanvasNode } from "@/lib/canvas/types";
import {
  getTextDomFontFamily,
  TEXT_BOX_PADDING_X,
  TEXT_BOX_PADDING_Y,
  TEXT_LINE_HEIGHT,
} from "@/lib/canvas/text";
import { resolveFill, strokeDashArray } from "@/lib/canvas/shape-styles";

interface EllipseNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  isEditing?: boolean;
  onTextChange?: (text: string) => void;
  onBlur?: () => void;
  onResize?: (width: number, height: number) => void;
}

function EllipseNode({
  node,
  isSelected,
  isEditing = false,
  onTextChange,
  onBlur,
  onResize,
}: EllipseNodeProps) {
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const clipId = useId();
  const shapeType = node.props.type;
  const {
    fill = "transparent",
    stroke = "#1a1814",
    strokeWidth = 2,
    strokeStyle,
    fillStyle,
    text = "",
    fontSize = 24,
    fontFamily = "sans",
    fontWeight = "normal",
    fontStyle = "normal",
    textDecoration = "none",
  } = shapeType === "ellipse" ? node.props : ({} as NonNullable<unknown> & {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    strokeStyle?: string;
    fillStyle?: string;
    text?: string;
    fontSize?: number;
    fontFamily?: "sans" | "serif" | "mono" | "display";
    fontWeight?: "normal" | "bold";
    fontStyle?: "normal" | "italic";
    textDecoration?: "none" | "underline";
  });

  const cx = node.width / 2;
  const cy = node.height / 2;
  const { fill: resolvedFill, fillOpacity } = resolveFill(fill, fillStyle);
  const dash = strokeDashArray(strokeStyle, strokeWidth);

  useLayoutEffect(() => {
    if (shapeType !== "ellipse" || !isEditing || !editorRef.current) return;
    const textarea = editorRef.current;
    textarea.focus();
    const caret = textarea.value.length;
    textarea.setSelectionRange(caret, caret);
  }, [isEditing, shapeType]);

  useLayoutEffect(() => {
    if (shapeType !== "ellipse" || !isEditing || !editorRef.current) return;
    const textarea = editorRef.current;
    const availableHeight = Math.max(node.height - TEXT_BOX_PADDING_Y * 2, 0);
    const availableWidth = Math.max(node.width - TEXT_BOX_PADDING_X * 2, 0);

    textarea.style.height = "0px";
    const scrollHeight = textarea.scrollHeight;
    const scrollWidth = textarea.scrollWidth;

    // If content needs more height or width, expand the node
    // For ellipse, expand both dimensions to maintain aspect ratio
    if (scrollHeight > availableHeight || scrollWidth > availableWidth) {
      const newHeight = Math.max(node.height, scrollHeight + TEXT_BOX_PADDING_Y * 2);
      const newWidth = Math.max(node.width, scrollWidth + TEXT_BOX_PADDING_X * 2);
      onResize?.(newWidth, newHeight);
    }

    textarea.style.height = `${Math.min(scrollHeight, availableHeight)}px`;
  }, [isEditing, node.height, node.width, text, shapeType, onResize]);

  if (shapeType !== "ellipse") return null;
  void isSelected;

  return (
    <g transform={`translate(${node.x}, ${node.y})`}>
      <defs>
        <clipPath id={clipId}>
          <ellipse cx={cx} cy={cy} rx={cx} ry={cy} />
        </clipPath>
      </defs>
      <ellipse
        cx={cx}
        cy={cy}
        rx={cx}
        ry={cy}
        fill={resolvedFill}
        fillOpacity={fillOpacity}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dash}
      />
      <foreignObject
        x={TEXT_BOX_PADDING_X}
        y={TEXT_BOX_PADDING_Y}
        width={Math.max(0, node.width - TEXT_BOX_PADDING_X * 2)}
        height={Math.max(0, node.height - TEXT_BOX_PADDING_Y * 2)}
        clipPath={`url(#${clipId})`}
      >
        {isEditing ? (
          <div
            style={{
              width: "100%",
              height: "100%",
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <textarea
              ref={editorRef}
              value={text}
              onChange={(e) => onTextChange?.(e.target.value)}
              onBlur={onBlur}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxHeight: "100%",
                display: "block",
                boxSizing: "border-box",
                resize: "none",
                border: "none",
                outline: "none",
                background: "transparent",
                color: stroke,
                fontSize: `${fontSize}px`,
                fontFamily: getTextDomFontFamily(fontFamily),
                fontWeight,
                fontStyle,
                textDecoration,
                textAlign: "center",
                lineHeight: String(TEXT_LINE_HEIGHT),
                whiteSpace: "pre-wrap",
                overflow: "auto",
                padding: 0,
                margin: 0,
              }}
            />
          </div>
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: stroke,
              fontSize: `${fontSize}px`,
              fontFamily: getTextDomFontFamily(fontFamily),
              fontWeight,
              fontStyle,
              textDecoration,
              textAlign: "center",
              lineHeight: String(TEXT_LINE_HEIGHT),
              whiteSpace: "pre-wrap",
              overflow: "hidden",
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            {text}
          </div>
        )}
      </foreignObject>
    </g>
  );
}

export default memo(EllipseNode);
