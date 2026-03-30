"use client";

import type React from "react";
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

export type ZOrderAction =
  | "bring-to-front"
  | "bring-forward"
  | "send-backward"
  | "send-to-back";

interface StylePanelProps {
  activeStyle: ActiveStyle;
  hasSelection: boolean;
  selectedNodeCount?: number;
  showTextControls?: boolean;
  showShapeTextControls?: boolean;
  showImageControls?: boolean;
  showStickyControls?: boolean;
  onStyleChange: (style: Partial<ActiveStyle>) => void;
  onAlign?: (alignment: AlignmentType) => void;
  onZOrder?: (action: ZOrderAction) => void;
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

// ---------------------------------------------------------------------------
// Z-Order icons (16×16 viewBox, matching reference screenshot style)
// ---------------------------------------------------------------------------

function BringToFrontIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="5" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <rect x="7" y="3" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" fill="currentColor" />
    </svg>
  );
}

function BringForwardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="5" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <rect x="7" y="3" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" fill="var(--klad-paper, #f7f4ef)" />
    </svg>
  );
}

function SendBackwardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="7" y="3" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <rect x="1" y="5" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

function SendToBackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="7" y="3" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none" />
      {/* Hatched pattern */}
      <defs>
        <pattern id="hatch" patternUnits="userSpaceOnUse" width="3" height="3" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="3" stroke="currentColor" strokeWidth="0.8" />
        </pattern>
      </defs>
      <rect x="1" y="5" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" fill="url(#hatch)" />
    </svg>
  );
}

const Z_ORDER_BUTTONS: Array<{
  action: ZOrderAction;
  icon: () => React.ReactElement;
  tooltip: string;
}> = [
  { action: "bring-to-front", icon: BringToFrontIcon, tooltip: "Bring to Front" },
  { action: "bring-forward", icon: BringForwardIcon, tooltip: "Bring Forward" },
  { action: "send-backward", icon: SendBackwardIcon, tooltip: "Send Backward" },
  { action: "send-to-back", icon: SendToBackIcon, tooltip: "Send to Back" },
];

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
  showShapeTextControls = false,
  showImageControls = false,
  showStickyControls = false,
  onStyleChange,
  onAlign,
  onZOrder,
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
        gap: "6px",
        backgroundColor: "var(--klad-paper, #f7f4ef)",
        border: "1px solid var(--klad-ink, #1a1814)",
        boxShadow: "3px 3px 0 var(--klad-ink, #1a1814)",
        padding: "8px",
        borderRadius: "2px",
        maxWidth: "220px",
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
            {FONT_FAMILIES.map((font) => (
              <button
                key={font.value}
                type="button"
                onClick={() => onStyleChange({ fontFamily: font.value })}
                style={{
                  padding: "10px 0",
                  backgroundColor:
                    activeStyle.fontFamily === font.value
                      ? "rgba(0,0,0,0.06)"
                      : "transparent",
                  border: "none",
                  borderRadius: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--klad-ink, #1a1814)",
                  transition: "background-color 0.1s",
                }}
              >
                <span
                  style={{
                    fontSize: "18px",
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

      {showImageControls && (
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
            Opacity
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(activeStyle.opacity * 100)}
            onChange={(e) => onStyleChange({ opacity: Number(e.target.value) / 100 })}
            style={{ width: "100%" }}
          />
        </div>
      )}

      {/* Color Palette */}
      {!showImageControls && (
      <div style={showTextControls ? { borderTop: "1px solid var(--klad-paper2, #ede9e2)", paddingTop: "6px" } : undefined}>
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
            gap: "3px",
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
                width: "24px",
                height: "24px",
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
      )}

      {/* Stroke Width */}
      {(!showTextControls || showShapeTextControls) && !showImageControls && (
      <div style={{ borderTop: "1px solid var(--klad-paper2, #ede9e2)", paddingTop: "6px" }}>
        <div style={{ display: "flex", gap: "3px" }}>
          {[1, 2, 3, 4, 6].map((width) => (
            <button
              key={width}
              type="button"
              onClick={() => onStyleChange({ strokeWidth: width })}
              title={`Width ${width}`}
              style={{
                flex: 1,
                padding: "4px",
                height: "28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
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
              <svg width="14" height="2" viewBox="0 0 14 2" style={{ display: "block" }}>
                <line x1="0" y1="1" x2="14" y2="1" stroke="currentColor" strokeWidth={width * 0.3} strokeLinecap="round" />
              </svg>
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Stroke Style */}
      {(!showTextControls || showShapeTextControls) && !showImageControls && (
      <div style={{ borderTop: "1px solid var(--klad-paper2, #ede9e2)", paddingTop: "6px" }}>
        <div style={{ display: "flex", gap: "3px" }}>
          {(["solid", "dashed", "dotted"] as StrokeStyle[]).map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => onStyleChange({ strokeStyle: style })}
              title={style.charAt(0).toUpperCase() + style.slice(1)}
              style={{
                flex: 1,
                padding: "4px",
                height: "28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
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
              <svg width="16" height="2" viewBox="0 0 16 2" style={{ display: "block" }}>
                {style === "solid" && (
                  <line x1="0" y1="1" x2="16" y2="1" stroke="currentColor" strokeWidth="2" />
                )}
                {style === "dashed" && (
                  <line x1="0" y1="1" x2="16" y2="1" stroke="currentColor" strokeWidth="2" strokeDasharray="3,2" />
                )}
                {style === "dotted" && (
                  <line x1="0" y1="1" x2="16" y2="1" stroke="currentColor" strokeWidth="2" strokeDasharray="1,1" />
                )}
              </svg>
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Fill Style */}
      {(!showTextControls || showShapeTextControls) && !showImageControls && (
      <div style={{ borderTop: "1px solid var(--klad-paper2, #ede9e2)", paddingTop: "6px" }}>
        <div style={{ display: "flex", gap: "3px" }}>
          {(["none", "semi", "solid"] as FillStyle[]).map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => onStyleChange({ fillStyle: style })}
              title={style === "none" ? "Empty" : style === "semi" ? "Half Fill" : "Solid Fill"}
              style={{
                flex: 1,
                padding: "4px",
                height: "28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
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
              <svg width="16" height="16" viewBox="0 0 16 16" style={{ display: "block" }}>
                {style === "none" && (
                  <rect x="2" y="2" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" />
                )}
                {style === "semi" && (
                  <>
                    <rect x="2" y="2" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="2" y="8" width="12" height="6" fill="currentColor" opacity="0.4" />
                  </>
                )}
                {style === "solid" && (
                  <rect x="2" y="2" width="12" height="12" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />
                )}
              </svg>
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Sticky Note Colors */}
      {showStickyControls && (
      <div style={{ borderTop: "1px solid var(--klad-paper2, #ede9e2)", paddingTop: "6px" }}>
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
          Sticky Color
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "3px",
          }}
        >
          {[
            { name: "yellow", bg: "#fef9c3" },
            { name: "blue", bg: "#dbeafe" },
            { name: "green", bg: "#dcfce7" },
            { name: "pink", bg: "#fce7f3" },
          ].map(({ name, bg }) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                onStyleChange({ color: name });
              }}
              title={name}
              style={{
                width: "100%",
                aspectRatio: "1",
                backgroundColor: bg,
                border:
                  activeStyle.color === name
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
                style={iconBtnStyle}
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

      {/* Z-Order */}
      {onZOrder && (
        <div style={{ borderTop: "1px solid var(--klad-paper2, #ede9e2)", paddingTop: "8px" }}>
          <label style={sectionLabelStyle}>Order</label>
          <div style={{ display: "flex", gap: "4px" }}>
            {Z_ORDER_BUTTONS.map(({ action, icon: Icon, tooltip }) => (
              <button
                key={action}
                type="button"
                onClick={() => onZOrder(action)}
                title={tooltip}
                style={iconBtnStyle}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    "rgba(0,0,0,0.06)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    "transparent";
                }}
              >
                <Icon />
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

const sectionLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: "600",
  color: "var(--klad-ink3, #7a756e)",
  marginBottom: "6px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const iconBtnStyle: React.CSSProperties = {
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
};

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
