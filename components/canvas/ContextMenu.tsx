"use client";

import { useState, useRef, useEffect } from "react";
import {
  Copy,
  ClipboardPaste,
  Trash2,
  CopyPlus,
  ArrowUpToLine,
  ArrowDownToLine,
  MousePointerClick,
  Crop,
} from "lucide-react";

interface ContextMenuProps {
  x: number;
  y: number;
  nodeId: string | null;
  hasClipboard: boolean;
  isImageNode?: boolean;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSelectAll: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onCrop?: () => void;
  onClose: () => void;
}

export default function CanvasContextMenu({
  x,
  y,
  nodeId,
  hasClipboard,
  isImageNode,
  onCopy,
  onPaste,
  onDuplicate,
  onDelete,
  onSelectAll,
  onBringToFront,
  onSendToBack,
  onCrop,
  onClose,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Clamp to viewport
  const menuWidth = 200;
  const menuHeight = nodeId ? 240 : 90;
  const clampedX = Math.min(x, window.innerWidth - menuWidth - 8);
  const clampedY = Math.min(y, window.innerHeight - menuHeight - 8);

  function handleAction(action: () => void) {
    action();
    onClose();
  }

  return (
    <div
      ref={ref}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        top: clampedY,
        left: clampedX,
        zIndex: 1100,
        backgroundColor: "var(--klad-paper, #f7f4ef)",
        border: "1px solid var(--klad-ink, #1a1814)",
        boxShadow: "3px 3px 0 var(--klad-ink, #1a1814)",
        borderRadius: "2px",
        minWidth: `${menuWidth}px`,
        padding: "4px 0",
      }}
    >
      {nodeId ? (
        <>
          {isImageNode && onCrop && (
            <MenuItem
              icon={<Crop size={13} />}
              label="Crop / Fit"
              onClick={() => handleAction(onCrop)}
            />
          )}
          <MenuItem
            icon={<Copy size={13} />}
            label="Copy"
            shortcut="⌘C"
            onClick={() => handleAction(onCopy)}
          />
          <MenuItem
            icon={<ClipboardPaste size={13} />}
            label="Paste"
            shortcut="⌘V"
            disabled={!hasClipboard}
            onClick={() => handleAction(onPaste)}
          />
          <MenuItem
            icon={<CopyPlus size={13} />}
            label="Duplicate"
            shortcut="⌘D"
            onClick={() => handleAction(onDuplicate)}
          />
          <MenuItem
            icon={<Trash2 size={13} />}
            label="Delete"
            shortcut="⌫"
            danger
            onClick={() => handleAction(onDelete)}
          />
          <Divider />
          <MenuItem
            icon={<ArrowUpToLine size={13} />}
            label="Bring to Front"
            onClick={() => handleAction(onBringToFront)}
          />
          <MenuItem
            icon={<ArrowDownToLine size={13} />}
            label="Send to Back"
            onClick={() => handleAction(onSendToBack)}
          />
        </>
      ) : (
        <>
          <MenuItem
            icon={<ClipboardPaste size={13} />}
            label="Paste"
            shortcut="⌘V"
            disabled={!hasClipboard}
            onClick={() => handleAction(onPaste)}
          />
          <MenuItem
            icon={<MousePointerClick size={13} />}
            label="Select All"
            shortcut="⌘A"
            onClick={() => handleAction(onSelectAll)}
          />
        </>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  shortcut,
  disabled,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = disabled
    ? "var(--klad-paper3, #e3ddd5)"
    : danger && hovered
    ? "#c44b3c"
    : "var(--klad-ink, #1a1814)";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        width: "100%",
        padding: "8px 12px",
        fontFamily: "var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif",
        fontSize: "13px",
        color,
        backgroundColor: hovered && !disabled ? "var(--klad-paper2, #ede9e2)" : "transparent",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        textAlign: "left",
        transition: "background-color 0.08s",
        outline: "none",
      }}
    >
      {icon}
      <span style={{ flex: 1 }}>{label}</span>
      {shortcut && (
        <span
          style={{
            fontSize: "11px",
            color: "var(--klad-ink3, #7a756e)",
            marginLeft: "16px",
          }}
        >
          {shortcut}
        </span>
      )}
    </button>
  );
}

function Divider() {
  return (
    <div
      style={{
        height: "1px",
        backgroundColor: "var(--klad-paper3, #e3ddd5)",
        margin: "4px 0",
      }}
    />
  );
}
