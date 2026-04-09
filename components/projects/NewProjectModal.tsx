"use client";

import { useState, useRef, useEffect } from "react";

export function NewProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setLoading(false);
        return;
      }
      onCreated(data.id);
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

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
            marginBottom: "24px",
          }}
        >
          New Project
        </h2>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            maxLength={100}
            disabled={loading}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
            style={{
              width: "100%",
              padding: "10px 12px",
              fontFamily: "var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif",
              fontSize: "15px",
              color: "var(--klad-ink)",
              backgroundColor: "#fff",
              border: "1px solid var(--klad-ink)",
              outline: "none",
              boxSizing: "border-box",
              marginBottom: error ? "8px" : "20px",
            }}
          />

          {error && (
            <p
              style={{
                fontFamily: "var(--font-ibm-plex-mono), ui-monospace, monospace",
                fontSize: "12px",
                color: "#c0392b",
                marginBottom: "20px",
              }}
            >
              {error}
            </p>
          )}

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              style={{
                flex: 1,
                padding: "10px 20px",
                fontFamily: "var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif",
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--klad-ink)",
                backgroundColor: loading || !name.trim() ? "var(--klad-paper3)" : "var(--klad-yellow)",
                border: "1px solid var(--klad-ink)",
                boxShadow: loading || !name.trim() ? "none" : "3px 3px 0 var(--klad-ink)",
                cursor: loading || !name.trim() ? "not-allowed" : "pointer",
                transition: "all 0.1s ease",
              }}
            >
              {loading ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
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
        </form>
      </div>
    </div>
  );
}
