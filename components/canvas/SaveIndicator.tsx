"use client";

export type SaveStatus = "idle" | "saving" | "error" | "fatal";

export default function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;

  const base =
    "fixed bottom-4 right-4 z-50 rounded-md px-3 py-1.5 text-xs backdrop-blur-sm";

  if (status === "saving")
    return (
      <div className={`${base} bg-zinc-800/80 text-zinc-300`}>Saving...</div>
    );

  if (status === "error")
    return (
      <div className={`${base} bg-amber-900/80 text-amber-200`}>
        Failed to save — retrying...
      </div>
    );

  if (status === "fatal")
    return (
      <div className="fixed bottom-4 right-4 z-50 rounded-md border border-red-700 bg-red-950/90 px-4 py-3 text-sm text-red-200 backdrop-blur-sm">
        <p className="font-medium">Canvas could not be saved.</p>
        <p className="mt-0.5 text-xs opacity-80">
          Reload the page to avoid losing your work.
        </p>
      </div>
    );

  return null;
}
