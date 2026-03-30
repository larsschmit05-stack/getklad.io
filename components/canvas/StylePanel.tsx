"use client";

import {
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  Columns,
  Bold,
  Italic,
  Underline,
} from "lucide-react";
import { PALETTE, type ActiveStyle, type StrokeStyle, type FillStyle } from "@/lib/canvas/types";
import type { AlignmentType } from "@/lib/canvas/reducer";

interface StylePanelProps {
  activeStyle: ActiveStyle;
  hasSelection: boolean;
  selectedNodeCount?: number;
  showTextControls?: boolean;
  onStyleChange: (style: Partial<ActiveStyle>) => void;
  onAlign?: (alignment: AlignmentType) => void;
}

const TEXT_SIZES = [
  { label: "S", value: 16 },
  { label: "M", value: 24 },
  { label: "L", value: 32 },
  { label: "XL", value: 48 },
] as const;

const FONT_FAMILIES = [
  { label: "Sans", value: "sans" },
  { label: "Serif", value: "serif" },
  { label: "Mono", value: "mono" },
  { label: "Display", value: "display" },
] as const;

const ALIGNMENT_BUTTONS: Array<{
  alignment: AlignmentType;
  icon: typeof AlignStartHorizontal;
  tooltip: string;
}> = [
  { alignment: "left", icon: AlignStartHorizontal, tooltip: "Align Left" },
  { alignment: "center-h", icon: AlignCenterHorizontal, tooltip: "Align Center" },
  { alignment: "right", icon: AlignEndHorizontal, tooltip: "Align Right" },
  { alignment: "distribute-h", icon: Columns, tooltip: "Distribute" },
];

export default function StylePanel({
  activeStyle,
  hasSelection,
  selectedNodeCount = 1,
  showTextControls = false,
  onStyleChange,
  onAlign,
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
      {showTextControls && (
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
            Text Size
          </label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "6px",
            }}
          >
            {TEXT_SIZES.map((size) => (
              <button
                key={size.label}
                type="button"
                onClick={() => onStyleChange({ fontSize: size.value })}
                style={{
                  padding: "10px 0",
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "var(--klad-ink, #1a1814)",
                  backgroundColor:
                    activeStyle.fontSize === size.value
                      ? "rgba(0,0,0,0.06)"
                      : "transparent",
                  border: "none",
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "background-color 0.1s",
                  pointerEvents: "auto",
                }}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {showTextControls && (
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
            Font
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "4px" }}>
            {FONT_FAMILIES.map((font) => (
              <button
                key={font.value}
                type="button"
                onClick={() => onStyleChange({ fontFamily: font.value })}
                style={{
                  height: "64px",
                  backgroundColor:
                    activeStyle.fontFamily === font.value
                      ? "var(--klad-yellow, #f5e642)"
                      : "transparent",
                  border: "1px solid var(--klad-ink3, #7a756e)",
                  borderRadius: "2px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--klad-ink, #1a1814)",
                }}
              >
                <span
                  style={{
                    fontSize: "22px",
                    lineHeight: 1,
                    fontWeight: 600,
                    fontFamily: getPreviewFontFamily(font.value),
                  }}
                >
                  Aa
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {showTextControls && (
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
            Format
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px" }}>
            <button
              type="button"
              onClick={() =>
                onStyleChange({
                  fontWeight: activeStyle.fontWeight === "bold" ? "normal" : "bold",
                })
              }
              style={formatButtonStyle(activeStyle.fontWeight === "bold")}
            >
              <Bold size={16} />
            </button>
            <button
              type="button"
              onClick={() =>
                onStyleChange({
                  fontStyle: activeStyle.fontStyle === "italic" ? "normal" : "italic",
                })
              }
              style={formatButtonStyle(activeStyle.fontStyle === "italic")}
            >
              <Italic size={16} />
            </button>
            <button
              type="button"
              onClick={() =>
                onStyleChange({
                  textDecoration:
                    activeStyle.textDecoration === "underline" ? "none" : "underline",
                })
              }
              style={formatButtonStyle(activeStyle.textDecoration === "underline")}
            >
              <Underline size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Color Palette */}
      <div style={showTextControls ? { borderTop: "1px solid var(--klad-paper2, #ede9e2)", paddingTop: "8px" } : undefined}>
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
      {!showTextControls && (
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
      )}

      {/* Stroke Style */}
      {!showTextControls && (
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
      )}

      {/* Fill Style */}
      {!showTextControls && (
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
      )}

      {/* Alignment (only for multiple selections) */}
      {selectedNodeCount >= 2 && onAlign && (
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
            Arrange
          </label>
          <div style={{ display: "flex", gap: "4px" }}>
            {ALIGNMENT_BUTTONS.map(({ alignment, icon: Icon, tooltip }) => (
              <button
                key={alignment}
                type="button"
                onClick={() => onAlign(alignment)}
                title={tooltip}
                style={{
                  flex: 1,
                  height: "32px",
                  padding: "4px",
                  fontSize: "14px",
                  color: "var(--klad-ink, #1a1814)",
                  backgroundColor: "transparent",
                  border: "1px solid var(--klad-ink3, #7a756e)",
                  borderRadius: "2px",
                  cursor: "pointer",
                  transition: "background-color 0.1s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "auto",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    "rgba(0,0,0,0.06)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    "transparent";
                }}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatButtonStyle(active: boolean) {
  return {
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: active ? "var(--klad-yellow, #f5e642)" : "transparent",
    border: "1px solid var(--klad-ink3, #7a756e)",
    borderRadius: "2px",
    cursor: "pointer",
    color: "var(--klad-ink, #1a1814)",
  } satisfies React.CSSProperties;
}

function getPreviewFontFamily(fontFamily: "sans" | "serif" | "mono" | "display") {
  switch (fontFamily) {
    case "serif":
      return "var(--font-playfair), ui-serif, Georgia, serif";
    case "mono":
      return "var(--font-ibm-plex-mono), ui-monospace, monospace";
    case "display":
      return "var(--font-playfair), ui-serif, Georgia, serif";
    case "sans":
    default:
      return "var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif";
  }
}
