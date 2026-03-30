"use client";

import { useEffect, useRef } from "react";
import {
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Columns,
  Rows,
} from "lucide-react";
import type { AlignmentType } from "@/lib/canvas/reducer";

interface AlignmentToolbarProps {
  selectedNodeIds: string[];
  onAlign: (alignment: AlignmentType) => void;
}

const ALIGNMENT_BUTTONS: Array<{
  alignment: AlignmentType;
  icon: typeof AlignStartHorizontal;
  tooltip: string;
}> = [
  { alignment: "left", icon: AlignStartHorizontal, tooltip: "Align Left" },
  { alignment: "center-h", icon: AlignCenterHorizontal, tooltip: "Align Center (H)" },
  { alignment: "right", icon: AlignEndHorizontal, tooltip: "Align Right" },
  { alignment: "top", icon: AlignStartVertical, tooltip: "Align Top" },
  { alignment: "center-v", icon: AlignCenterVertical, tooltip: "Align Center (V)" },
  { alignment: "bottom", icon: AlignEndVertical, tooltip: "Align Bottom" },
  { alignment: "distribute-h", icon: Columns, tooltip: "Distribute Horizontally" },
  { alignment: "distribute-v", icon: Rows, tooltip: "Distribute Vertically" },
];

export default function AlignmentToolbar({
  selectedNodeIds,
  onAlign,
}: AlignmentToolbarProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Hide on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedNodeIds.length >= 2) {
        // Just let selection remain; user would click something else
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [selectedNodeIds.length]);

  if (selectedNodeIds.length < 2) return null;

  return (
    <div
      ref={containerRef}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        top: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1001,
        display: "flex",
        gap: "4px",
        backgroundColor: "var(--klad-paper, #f7f4ef)",
        border: "1px solid var(--klad-ink, #1a1814)",
        boxShadow: "3px 3px 0 var(--klad-ink, #1a1814)",
        padding: "8px",
        borderRadius: "2px",
        pointerEvents: "auto",
      }}
    >
      {ALIGNMENT_BUTTONS.map(({ alignment, icon: Icon, tooltip }) => (
        <button
          key={alignment}
          type="button"
          onClick={() => onAlign(alignment)}
          title={tooltip}
          style={{
            width: "32px",
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
          <Icon size={18} />
        </button>
      ))}
    </div>
  );
}
