"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { Project } from "@/lib/db";

export interface ContextMenuState {
  project: Project;
  x: number;
  y: number;
}

export function ContextMenu({
  menu,
  onRename,
  onDelete,
  onClose,
}: {
  menu: ContextMenuState;
  onRename: (project: Project) => void;
  onDelete: (project: Project) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const menuWidth = 168;
  const menuHeight = 84;
  const x = Math.min(menu.x, window.innerWidth - menuWidth - 8);
  const y = Math.min(menu.y, window.innerHeight - menuHeight - 8);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: y,
        left: x,
        zIndex: 100,
        backgroundColor: "var(--klad-paper)",
        border: "1px solid var(--klad-ink)",
        boxShadow: "3px 3px 0 var(--klad-ink)",
        minWidth: `${menuWidth}px`,
        padding: "4px 0",
      }}
    >
      <ContextMenuItem
        icon={<Pencil size={13} />}
        label="Rename"
        onClick={() => {
          onClose();
          onRename(menu.project);
        }}
      />
      <div
        style={{
          height: "1px",
          backgroundColor: "var(--klad-paper3)",
          margin: "4px 0",
        }}
      />
      <ContextMenuItem
        icon={<Trash2 size={13} />}
        label="Delete"
        danger
        onClick={() => {
          onClose();
          onDelete(menu.project);
        }}
      />
    </div>
  );
}

function ContextMenuItem({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = danger ? "#c44b3c" : "var(--klad-ink)";

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        width: "100%",
        padding: "7px 14px",
        fontFamily: "var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif",
        fontSize: "13px",
        fontWeight: 500,
        color,
        backgroundColor: hovered ? "var(--klad-paper2)" : "transparent",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        transition: "background-color 0.08s",
      }}
    >
      {icon}
      {label}
    </button>
  );
}
