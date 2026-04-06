"use client";

export type SaveStatus = "idle" | "saving" | "error" | "fatal";

function getBase(rightOffset: number): React.CSSProperties {
  return {
    position: "fixed",
    bottom: "16px",
    right: `${16 + rightOffset}px`,
    zIndex: 50,
    fontSize: "12px",
    fontFamily: "var(--font-ibm-plex-mono), ui-monospace, monospace",
    padding: "6px 12px",
    transition: "right 0.25s ease",
  };
}

export default function SaveIndicator({ status, rightOffset = 0 }: { status: SaveStatus; rightOffset?: number }) {
  if (status === "idle") return null;

  if (status === "saving")
    return (
      <div
        style={{
          ...getBase(rightOffset),
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
          ...getBase(rightOffset),
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
          ...getBase(rightOffset),
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
