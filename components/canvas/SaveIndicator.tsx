"use client";

export type SaveStatus = "idle" | "saving" | "error" | "fatal";

const base: React.CSSProperties = {
  position: "fixed",
  bottom: "16px",
  right: "16px",
  zIndex: 50,
  fontSize: "12px",
  fontFamily: "var(--font-ibm-plex-mono), ui-monospace, monospace",
  padding: "6px 12px",
};

export default function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;

  if (status === "saving")
    return (
      <div
        style={{
          ...base,
          backgroundColor: "var(--klad-paper, #f7f4ef)",
          border: "1px solid var(--klad-ink, #1a1814)",
          boxShadow: "3px 3px 0 var(--klad-ink, #1a1814)",
          color: "var(--klad-ink2, #3d3a35)",
        }}
      >
        Saving...
      </div>
    );

  if (status === "error")
    return (
      <div
        style={{
          ...base,
          backgroundColor: "var(--klad-yellow, #f5e642)",
          border: "1px solid var(--klad-ink, #1a1814)",
          boxShadow: "3px 3px 0 var(--klad-ink, #1a1814)",
          color: "var(--klad-ink, #1a1814)",
        }}
      >
        Failed to save — retrying...
      </div>
    );

  if (status === "fatal")
    return (
      <div
        style={{
          ...base,
          backgroundColor: "#c44b3c",
          border: "1px solid var(--klad-ink, #1a1814)",
          boxShadow: "3px 3px 0 var(--klad-ink, #1a1814)",
          color: "#fff",
          padding: "10px 14px",
          fontSize: "13px",
          fontFamily: "var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <p style={{ fontWeight: 600, margin: 0 }}>Canvas could not be saved.</p>
        <p style={{ margin: "4px 0 0", fontSize: "11px", opacity: 0.85 }}>
          Reload the page to avoid losing your work.
        </p>
      </div>
    );

  return null;
}
