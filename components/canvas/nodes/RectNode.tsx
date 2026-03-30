"use client";

import { memo, useLayoutEffect, useRef } from "react";

import type { CanvasNode } from "@/lib/canvas/types";
import {
  getTextDomFontFamily,
  TEXT_BOX_PADDING_X,
  TEXT_BOX_PADDING_Y,
  TEXT_LINE_HEIGHT,
} from "@/lib/canvas/text";

interface RectNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  isEditing?: boolean;
  onTextChange?: (text: string) => void;
  onBlur?: () => void;
}

function strokeDashArray(style: string | undefined, width: number): string | undefined {
  if (style === "dashed") return `${width * 6} ${width * 4}`;
  if (style === "dotted") return `${width} ${width * 3}`;
  return undefined;
}

function resolveFill(fill: string, fillStyle: string | undefined): { fill: string; fillOpacity: number } {
  if (fillStyle === "none") return { fill: "transparent", fillOpacity: 0 };
  if (fillStyle === "semi") return { fill, fillOpacity: 0.25 };
  return { fill, fillOpacity: 1 };
}

function RectNode({
  node,
  isSelected,
  isEditing = false,
  onTextChange,
  onBlur,
}: RectNodeProps) {
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
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
  } = shapeType === "rect" ? node.props : ({} as NonNullable<unknown> & {
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

  const { fill: resolvedFill, fillOpacity } = resolveFill(fill, fillStyle);
  const dash = strokeDashArray(strokeStyle, strokeWidth);

  useLayoutEffect(() => {
    if (shapeType !== "rect" || !isEditing || !editorRef.current) return;
    const textarea = editorRef.current;
    textarea.focus();
    const caret = textarea.value.length;
    textarea.setSelectionRange(caret, caret);
  }, [isEditing, shapeType]);

  if (shapeType !== "rect") return null;
  void isSelected;

  return (
    <g transform={`translate(${node.x}, ${node.y})`}>
      <rect
        width={node.width}
        height={node.height}
        rx={2}
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
      >
        {isEditing ? (
          <textarea
            ref={editorRef}
            value={text}
            onChange={(e) => onTextChange?.(e.target.value)}
            onBlur={onBlur}
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              height: "100%",
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
              overflow: "hidden",
            }}
          />
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

export default memo(RectNode);
