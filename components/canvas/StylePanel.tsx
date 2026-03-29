"use client";

import { PALETTE, type ActiveStyle, type StrokeStyle, type FillStyle } from "@/lib/canvas/types";

interface StylePanelProps {
  activeStyle: ActiveStyle;
  hasSelection: boolean;
  onStyleChange: (style: Partial<ActiveStyle>) => void;
}

export default function StylePanel({
  activeStyle,
  hasSelection,
  onStyleChange,
}: StylePanelProps) {
  if (!hasSelection) return null;

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        left: "16px",
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        backgroundColor: "var(--klad-paper, #f7f4ef)",
        border: "1px solid var(--klad-ink, #1a1814)",
        boxShadow: "3px 3px 0 var(--klad-ink, #1a1814)",
        padding: "12px",
        borderRadius: "2px",
        maxWidth: "280px",
        pointerEvents: "auto",
      }}
    >
      {/* Color Palette */}
      <div>
        <label
          style={{
            display: "block",
            fontSize: "11px",
            fontWeight: "600",
            color: "var(--klad-ink3, #7a756e)",
            marginBottom: "6px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Color
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "4px",
          }}
        >
          {PALETTE.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => {
                console.log("[StylePanel] Color clicked:", color);
                onStyleChange({ color });
              }}
              title={color}
              style={{
                width: "28px",
                height: "28px",
                backgroundColor: color,
                border:
                  activeStyle.color === color
                    ? "2px solid var(--klad-ink, #1a1814)"
                    : "1px solid var(--klad-ink3, #7a756e)",
                borderRadius: "2px",
                cursor: "pointer",
                transition: "border 0.1s",
                pointerEvents: "auto",
              }}
            />
          ))}
        </div>
      </div>

      {/* Stroke Width */}
      <div style={{ borderTop: "1px solid var(--klad-paper2, #ede9e2)", paddingTop: "8px" }}>
        <label
          style={{
            display: "block",
            fontSize: "11px",
            fontWeight: "600",
            color: "var(--klad-ink3, #7a756e)",
            marginBottom: "6px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Stroke Width
        </label>
        <div style={{ display: "flex", gap: "4px" }}>
          {[1, 2, 3, 4, 6].map((width) => (
            <button
              key={width}
              type="button"
              onClick={() => {
                console.log("[StylePanel] Stroke width clicked:", width);
                onStyleChange({ strokeWidth: width });
              }}
              style={{
                flex: 1,
                padding: "6px",
                fontSize: "12px",
                fontWeight: activeStyle.strokeWidth === width ? "600" : "400",
                backgroundColor:
                  activeStyle.strokeWidth === width
                    ? "var(--klad-yellow, #f5e642)"
                    : "transparent",
                border: "1px solid var(--klad-ink3, #7a756e)",
                borderRadius: "2px",
                cursor: "pointer",
                transition: "all 0.1s",
                pointerEvents: "auto",
              }}
            >
              {width}
            </button>
          ))}
        </div>
      </div>

      {/* Stroke Style */}
      <div style={{ borderTop: "1px solid var(--klad-paper2, #ede9e2)", paddingTop: "8px" }}>
        <label
          style={{
            display: "block",
            fontSize: "11px",
            fontWeight: "600",
            color: "var(--klad-ink3, #7a756e)",
            marginBottom: "6px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Line Style
        </label>
        <div style={{ display: "flex", gap: "4px" }}>
          {(["solid", "dashed", "dotted"] as StrokeStyle[]).map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => {
                console.log("[StylePanel] Stroke style clicked:", style);
                onStyleChange({ strokeStyle: style });
              }}
              style={{
                flex: 1,
                padding: "6px",
                fontSize: "12px",
                textTransform: "capitalize",
                fontWeight: activeStyle.strokeStyle === style ? "600" : "400",
                backgroundColor:
                  activeStyle.strokeStyle === style
                    ? "var(--klad-yellow, #f5e642)"
                    : "transparent",
                border: "1px solid var(--klad-ink3, #7a756e)",
                borderRadius: "2px",
                cursor: "pointer",
                transition: "all 0.1s",
                pointerEvents: "auto",
              }}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      {/* Fill Style */}
      <div style={{ borderTop: "1px solid var(--klad-paper2, #ede9e2)", paddingTop: "8px" }}>
        <label
          style={{
            display: "block",
            fontSize: "11px",
            fontWeight: "600",
            color: "var(--klad-ink3, #7a756e)",
            marginBottom: "6px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Fill
        </label>
        <div style={{ display: "flex", gap: "4px" }}>
          {(["none", "semi", "solid"] as FillStyle[]).map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => {
                console.log("[StylePanel] Fill style clicked:", style);
                onStyleChange({ fillStyle: style });
              }}
              style={{
                flex: 1,
                padding: "6px",
                fontSize: "12px",
                textTransform: "capitalize",
                fontWeight: activeStyle.fillStyle === style ? "600" : "400",
                backgroundColor:
                  activeStyle.fillStyle === style
                    ? "var(--klad-yellow, #f5e642)"
                    : "transparent",
                border: "1px solid var(--klad-ink3, #7a756e)",
                borderRadius: "2px",
                cursor: "pointer",
                transition: "all 0.1s",
                pointerEvents: "auto",
              }}
            >
              {style}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
