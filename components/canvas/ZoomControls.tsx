"use client";

import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitContent: () => void;
}

export default function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onFitContent,
}: ZoomControlsProps) {
  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-1 rounded-lg border border-zinc-300 bg-white/95 px-1.5 py-1 shadow-md backdrop-blur-sm">
      <button
        title="Zoom out"
        onClick={onZoomOut}
        className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
      >
        <ZoomOut className="h-4 w-4" />
      </button>
      <span className="min-w-[48px] text-center text-xs text-zinc-500 tabular-nums">
        {Math.round(zoom * 100)}%
      </span>
      <button
        title="Zoom in"
        onClick={onZoomIn}
        className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
      >
        <ZoomIn className="h-4 w-4" />
      </button>
      <div className="mx-0.5 h-4 w-px bg-zinc-200" />
      <button
        title="Fit content (Ctrl+0)"
        onClick={onFitContent}
        className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
      >
        <Maximize2 className="h-4 w-4" />
      </button>
    </div>
  );
}
