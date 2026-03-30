"use client";

import { useState, useRef, useEffect } from "react";
import { MoreHorizontal } from "lucide-react";

interface CanvasMenuProps {
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSelectAll: () => void;
  onDeselect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitContent: () => void;
  onExportPng: () => void;
  onExportSvg: () => void;
  onExportPdf: () => void;
}

export default function CanvasMenu({
  canUndo,
  canRedo,
  hasSelection,
  onUndo,
  onRedo,
  onSelectAll,
  onDeselect,
  onDelete,
  onDuplicate,
  onZoomIn,
  onZoomOut,
  onFitContent,
  onExportPng,
  onExportSvg,
  onExportPdf,
}: CanvasMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: PointerEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, [isOpen]);

  const handleMenuItemClick = (callback: () => void) => {
    callback();
    setIsOpen(false);
  };

  const MenuItem = ({
    label,
    shortcut,
    disabled,
    onClick,
  }: {
    label: string;
    shortcut?: string;
    disabled?: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "8px 12px",
        textAlign: "left",
        border: "none",
        background: "transparent",
        cursor: disabled ? "not-allowed" : "pointer",
        color: disabled ? "var(--klad-paper3, #e3ddd5)" : "var(--klad-ink, #1a1814)",
        fontSize: "14px",
        fontFamily: "var(--font-dm-sans)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        transition: "background-color 0.1s",
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor =
            "var(--klad-paper2, #ede9e2)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor =
          "transparent";
      }}
    >
      <span>{label}</span>
      {shortcut && (
        <span
          style={{
            marginLeft: "16px",
            fontSize: "12px",
            color: "var(--klad-ink3, #7a756e)",
          }}
        >
          {shortcut}
        </span>
      )}
    </button>
  );

  const Divider = () => (
    <div
      style={{
        height: "1px",
        backgroundColor: "var(--klad-paper3, #e3ddd5)",
        margin: "4px 0",
      }}
    />
  );

  return (
    <div
      style={{
        position: "fixed",
        top: "12px",
        left: "130px",
        zIndex: 50,
      }}
    >
      {/* Three-dot button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "31.5px",
          height: "31.5px",
          backgroundColor: isOpen
            ? "var(--klad-yellow, #f5e642)"
            : "var(--klad-paper, #f7f4ef)",
          border: "1px solid var(--klad-ink, #1a1814)",
          boxShadow: "3px 3px 0 var(--klad-ink, #1a1814)",
          borderRadius: "2px",
          cursor: "pointer",
          color: isOpen ? "var(--klad-ink, #1a1814)" : "var(--klad-ink3, #7a756e)",
          transition: "background-color 0.1s, color 0.1s",
          padding: 0,
          outline: "none",
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "var(--klad-paper2, #ede9e2)";
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--klad-ink, #1a1814)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "var(--klad-paper, #f7f4ef)";
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--klad-ink3, #7a756e)";
          }
        }}
        title="Canvas menu"
      >
        <MoreHorizontal size={16} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          ref={menuRef}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            minWidth: "220px",
            backgroundColor: "var(--klad-paper, #f7f4ef)",
            border: "1px solid var(--klad-ink, #1a1814)",
            boxShadow: "3px 3px 0 var(--klad-ink, #1a1814)",
            borderRadius: "2px",
            zIndex: 51,
          }}
        >
          {/* Edit section */}
          <MenuItem
            label="Undo"
            shortcut="⌘Z"
            disabled={!canUndo}
            onClick={() => handleMenuItemClick(onUndo)}
          />
          <MenuItem
            label="Redo"
            shortcut="⌘⇧Z"
            disabled={!canRedo}
            onClick={() => handleMenuItemClick(onRedo)}
          />

          <Divider />

          {/* Selection section */}
          <MenuItem
            label="Select All"
            shortcut="⌘A"
            onClick={() => handleMenuItemClick(onSelectAll)}
          />
          <MenuItem
            label="Deselect"
            shortcut="Esc"
            onClick={() => handleMenuItemClick(onDeselect)}
          />
          <MenuItem
            label="Delete"
            shortcut="⌫"
            disabled={!hasSelection}
            onClick={() => handleMenuItemClick(onDelete)}
          />
          <MenuItem
            label="Duplicate"
            shortcut="⌘D"
            disabled={!hasSelection}
            onClick={() => handleMenuItemClick(onDuplicate)}
          />

          <Divider />

          {/* View section */}
          <MenuItem
            label="Zoom In"
            shortcut="⌘+"
            onClick={() => handleMenuItemClick(onZoomIn)}
          />
          <MenuItem
            label="Zoom Out"
            shortcut="⌘−"
            onClick={() => handleMenuItemClick(onZoomOut)}
          />
          <MenuItem
            label="Fit to Screen"
            shortcut="⌘0"
            onClick={() => handleMenuItemClick(onFitContent)}
          />

          <Divider />

          {/* Export section */}
          <MenuItem
            label="Export as PNG"
            onClick={() => handleMenuItemClick(onExportPng)}
          />
          <MenuItem
            label="Export as SVG"
            onClick={() => handleMenuItemClick(onExportSvg)}
          />
          <MenuItem
            label="Export as PDF"
            onClick={() => handleMenuItemClick(onExportPdf)}
          />
        </div>
      )}
    </div>
  );
}
