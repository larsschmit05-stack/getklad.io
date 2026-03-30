"use client";

import type { Tool } from "@/lib/canvas/types";
import {
  MousePointer2,
  Type,
  StickyNote,
  Square,
  Circle,
  Pencil,
  MoveRight,
  ImageIcon,
} from "lucide-react";

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  onImageClick?: () => void;
}

const TOOLS: { id: Tool; label: string; Icon: React.ElementType }[] = [
  { id: "select",   label: "Select  V",  Icon: MousePointer2 },
  { id: "text",     label: "Text    T",  Icon: Type },
  { id: "sticky",   label: "Sticky  S",  Icon: StickyNote },
  { id: "rect",     label: "Rect    R",  Icon: Square },
  { id: "ellipse",  label: "Ellipse O",  Icon: Circle },
  { id: "freehand", label: "Draw    D",  Icon: Pencil },
  { id: "arrow",    label: "Arrow   A",  Icon: MoveRight },
  { id: "image",    label: "Image   I",  Icon: ImageIcon },
];

const DIVIDER_AFTER = new Set(["freehand"]);

export default function Toolbar({ activeTool, onToolChange, onImageClick }: ToolbarProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        gap: "4px",
        backgroundColor: "var(--klad-paper, #f7f4ef)",
        border: "1px solid var(--klad-ink, #1a1814)",
        boxShadow: "3px 3px 0 var(--klad-ink, #1a1814)",
        padding: "7px 9px",
      }}
    >
      {TOOLS.map(({ id, label, Icon }) => (
        <div key={id}>
          {DIVIDER_AFTER.has(id) && (
            <div
              style={{
                width: "1px",
                alignSelf: "stretch",
                backgroundColor: "var(--klad-paper3, #e3ddd5)",
                margin: "2px 5px",
              }}
            />
          )}
          <button
            title={label}
            onClick={() => {
              if (id === "image" && onImageClick) {
                onImageClick();
              } else {
                onToolChange(id);
              }
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "35px",
              height: "35px",
              borderRadius: "2px",
              border: "none",
              cursor: "pointer",
              backgroundColor:
                activeTool === id
                  ? "var(--klad-yellow, #f5e642)"
                  : "transparent",
              color:
                activeTool === id
                  ? "var(--klad-ink, #1a1814)"
                  : "var(--klad-ink3, #7a756e)",
              transition: "background-color 0.1s, color 0.1s",
            }}
            onMouseEnter={(e) => {
              if (activeTool !== id) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  "var(--klad-paper2, #ede9e2)";
                (e.currentTarget as HTMLButtonElement).style.color =
                  "var(--klad-ink, #1a1814)";
              }
            }}
            onMouseLeave={(e) => {
              if (activeTool !== id) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  "transparent";
                (e.currentTarget as HTMLButtonElement).style.color =
                  "var(--klad-ink3, #7a756e)";
              }
            }}
          >
            <Icon size={18} />
          </button>
        </div>
      ))}
    </div>
  );
}
