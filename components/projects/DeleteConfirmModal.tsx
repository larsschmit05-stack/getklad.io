"use client";

import { useEffect } from "react";
import type { Project } from "@/lib/db";

export function DeleteConfirmModal({
  project,
  onClose,
  onConfirm,
}: {
  project: Project;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        backgroundColor: "rgba(26, 24, 20, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: "var(--klad-paper)",
          border: "1px solid var(--klad-ink)",
          boxShadow: "6px 6px 0 var(--klad-ink)",
          padding: "32px",
          width: "100%",
          maxWidth: "440px",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-playfair), ui-serif, Georgia, serif",
            fontStyle: "italic",
            fontSize: "22px",
            fontWeight: 700,
            color: "var(--klad-ink)",
            marginBottom: "16px",
          }}
        >
          Delete Project
        </h2>

        <p
          style={{
            fontFamily: "var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif",
            fontSize: "15px",
            color: "var(--klad-ink2)",
            marginBottom: "24px",
            lineHeight: 1.5,
          }}
        >
          Delete &ldquo;{project.name}&rdquo;? This can&rsquo;t be undone.
        </p>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: "10px 20px",
              fontFamily: "var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif",
              fontSize: "14px",
              fontWeight: 600,
              color: "#fff",
              backgroundColor: "#c44b3c",
              border: "1px solid var(--klad-ink)",
              boxShadow: "3px 3px 0 var(--klad-ink)",
              cursor: "pointer",
              transition: "all 0.1s ease",
            }}
          >
            Delete
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 20px",
              fontFamily: "var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif",
              fontSize: "14px",
              color: "var(--klad-ink3)",
              backgroundColor: "transparent",
              border: "1px solid var(--klad-paper3)",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
