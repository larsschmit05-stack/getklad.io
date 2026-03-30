"use client";

import { useState } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitContent: () => void;
}

function ZoomBtn({
  icon,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "28px",
        height: "28px",
        border: "none",
        backgroundColor: hovered ? "var(--klad-paper2, #ede9e2)" : "transparent",
        color: hovered ? "var(--klad-ink, #1a1814)" : "var(--klad-ink2, #3d3a35)",
        borderRadius: "2px",
        cursor: "pointer",
        transition: "background-color 0.08s, color 0.08s",
        padding: 0,
        outline: "none",
      }}
    >
      {icon}
    </button>
  );
}

export default function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onFitContent,
}: ZoomControlsProps) {
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        bottom: "16px",
        left: "16px",
        zIndex: 50,
        display: "inline-flex",
        alignItems: "center",
        gap: "2px",
        backgroundColor: "var(--klad-paper, #f7f4ef)",
        border: "1px solid var(--klad-ink, #1a1814)",
        boxShadow: "3px 3px 0 var(--klad-ink, #1a1814)",
        padding: "4px 6px",
        userSelect: "none",
      }}
    >
      <ZoomBtn icon={<ZoomOut size={16} />} title="Zoom out" onClick={onZoomOut} />
      <span
        style={{
          minWidth: "48px",
          textAlign: "center",
          fontSize: "12px",
          fontFamily: "var(--font-ibm-plex-mono), ui-monospace, monospace",
          fontVariantNumeric: "tabular-nums",
          color: "var(--klad-ink3, #7a756e)",
        }}
      >
        {Math.round(zoom * 100)}%
      </span>
      <ZoomBtn icon={<ZoomIn size={16} />} title="Zoom in" onClick={onZoomIn} />
      <div
        style={{
          width: "1px",
          height: "18px",
          backgroundColor: "var(--klad-paper3, #e3ddd5)",
          margin: "0 4px",
          flexShrink: 0,
        }}
      />
      <ZoomBtn icon={<Maximize2 size={16} />} title="Fit content (⌘0)" onClick={onFitContent} />
    </div>
  );
}
