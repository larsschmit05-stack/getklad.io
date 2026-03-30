"use client";

import { useState } from "react";
import { Undo2, Redo2, Trash2, Copy } from "lucide-react";

interface ActionBarProps {
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export default function ActionBar({
  canUndo,
  canRedo,
  hasSelection,
  onUndo,
  onRedo,
  onDelete,
  onDuplicate,
}: ActionBarProps) {
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      style={{
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
      <ActionBtn icon={<Undo2 size={15} />} title="Undo (⌘Z)" disabled={!canUndo} onClick={onUndo} />
      <ActionBtn icon={<Redo2 size={15} />} title="Redo (⌘⇧Z)" disabled={!canRedo} onClick={onRedo} />

      <div
        style={{
          width: "1px",
          height: "18px",
          backgroundColor: "var(--klad-paper3, #e3ddd5)",
          margin: "0 4px",
          flexShrink: 0,
        }}
      />

      <ActionBtn
        icon={<Trash2 size={15} />}
        title="Delete"
        disabled={!hasSelection}
        onClick={onDelete}
        danger
      />
      <ActionBtn
        icon={<Copy size={15} />}
        title="Duplicate (⌘D)"
        disabled={!hasSelection}
        onClick={onDuplicate}
      />
    </div>
  );
}

function ActionBtn({
  icon,
  title,
  disabled,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  title: string;
  disabled?: boolean;
  onClick: () => void;
  danger?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  const color = disabled
    ? "var(--klad-paper3, #e3ddd5)"
    : danger && hovered
    ? "#c44b3c"
    : hovered
    ? "var(--klad-ink, #1a1814)"
    : "var(--klad-ink2, #3d3a35)";

  return (
    <button
      title={title}
      disabled={disabled}
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
        backgroundColor: hovered && !disabled ? "var(--klad-paper2, #ede9e2)" : "transparent",
        cursor: disabled ? "not-allowed" : "pointer",
        color,
        borderRadius: "2px",
        transition: "background-color 0.08s, color 0.08s",
        padding: 0,
        outline: "none",
      }}
    >
      {icon}
    </button>
  );
}
