"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageCropOverlayProps {
  nodeWidth: number;
  nodeHeight: number;
  nodeX: number;
  nodeY: number;
  zoom: number;
  onCropChange: (cropBox: CropBox) => void;
  onConfirm: (cropBox: CropBox) => void;
  onCancel: () => void;
}

type Handle = "tl" | "tr" | "bl" | "br" | "t" | "b" | "l" | "r";

export default function ImageCropOverlay({
  nodeWidth,
  nodeHeight,
  nodeX,
  nodeY,
  zoom,
  onCropChange,
  onConfirm,
  onCancel,
}: ImageCropOverlayProps) {
  const [cropBox, setCropBox] = useState<CropBox>({
    x: 0,
    y: 0,
    width: nodeWidth,
    height: nodeHeight,
  });
  const [draggingHandle, setDraggingHandle] = useState<Handle | null>(null);
  const dragStateRef = useRef<{ handle: Handle | null }>({ handle: null });
  const cropBoxRef = useRef(cropBox);
  cropBoxRef.current = cropBox;
  const overlayRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (handle: Handle) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragStateRef.current.handle = handle;
    setDraggingHandle(handle);
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const handle = dragStateRef.current.handle;
    if (!handle) return;

    const deltaX = e.movementX / zoom;
    const deltaY = e.movementY / zoom;
    const minSize = 20;

    setCropBox((prev) => {
      const newBox = { ...prev };

      switch (handle) {
        case "tl":
          newBox.x = Math.max(0, Math.min(prev.x + deltaX, prev.x + prev.width - minSize));
          newBox.y = Math.max(0, Math.min(prev.y + deltaY, prev.y + prev.height - minSize));
          newBox.width = prev.width + (prev.x - newBox.x);
          newBox.height = prev.height + (prev.y - newBox.y);
          break;
        case "tr":
          newBox.y = Math.max(0, Math.min(prev.y + deltaY, prev.y + prev.height - minSize));
          newBox.width = Math.max(minSize, prev.width + deltaX);
          newBox.height = prev.height + (prev.y - newBox.y);
          break;
        case "bl":
          newBox.x = Math.max(0, Math.min(prev.x + deltaX, prev.x + prev.width - minSize));
          newBox.width = prev.width + (prev.x - newBox.x);
          newBox.height = Math.max(minSize, prev.height + deltaY);
          break;
        case "br":
          newBox.width = Math.max(minSize, prev.width + deltaX);
          newBox.height = Math.max(minSize, prev.height + deltaY);
          break;
        case "t":
          newBox.y = Math.max(0, Math.min(prev.y + deltaY, prev.y + prev.height - minSize));
          newBox.height = prev.height + (prev.y - newBox.y);
          break;
        case "b":
          newBox.height = Math.max(minSize, prev.height + deltaY);
          break;
        case "l":
          newBox.x = Math.max(0, Math.min(prev.x + deltaX, prev.x + prev.width - minSize));
          newBox.width = prev.width + (prev.x - newBox.x);
          break;
        case "r":
          newBox.width = Math.max(minSize, prev.width + deltaX);
          break;
      }

      // Clamp to node bounds
      newBox.x = Math.max(0, Math.min(newBox.x, nodeWidth - newBox.width));
      newBox.y = Math.max(0, Math.min(newBox.y, nodeHeight - newBox.height));
      newBox.width = Math.min(newBox.width, nodeWidth - newBox.x);
      newBox.height = Math.min(newBox.height, nodeHeight - newBox.y);

      onCropChange(newBox);
      return newBox;
    });
  }, [zoom, nodeWidth, nodeHeight, onCropChange]);

  const handlePointerUp = useCallback(() => {
    if (dragStateRef.current.handle) {
      dragStateRef.current.handle = null;
      setDraggingHandle(null);
    }
  }, []);

  useEffect(() => {
    if (draggingHandle) {
      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUp);
      return () => {
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerup", handlePointerUp);
      };
    }
  }, [draggingHandle, handlePointerMove, handlePointerUp]);

  // Keyboard: Enter = confirm, Escape = cancel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        onConfirm(cropBoxRef.current);
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [onConfirm, onCancel]);

  // Click outside crop handles = confirm crop
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      // If clicking on a crop handle, ignore (those have stopPropagation)
      // This fires on clicks outside the overlay or on the dimmed areas
      if (!overlayRef.current?.contains(e.target as Node)) {
        onConfirm(cropBoxRef.current);
      }
    };
    // Use timeout so the initial click that activates crop mode doesn't immediately confirm
    const timer = setTimeout(() => {
      document.addEventListener("pointerdown", handler);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerdown", handler);
    };
  }, [onConfirm]);

  const handleScreenSize = 10;

  return (
    <div
      ref={overlayRef}
      style={{
        position: "fixed",
        left: `${nodeX}px`,
        top: `${nodeY}px`,
        width: `${nodeWidth * zoom}px`,
        height: `${nodeHeight * zoom}px`,
        pointerEvents: "none",
        zIndex: 999,
      }}
    >
      {/* Overlay with darkened areas and blue outline */}
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: `${nodeWidth * zoom}px`,
          height: `${nodeHeight * zoom}px`,
          pointerEvents: "none",
        }}
        viewBox={`0 0 ${nodeWidth} ${nodeHeight}`}
        preserveAspectRatio="none"
      >
        {/* Top dark area */}
        {cropBox.y > 0 && (
          <rect x="0" y="0" width={nodeWidth} height={cropBox.y} fill="rgba(0,0,0,0.5)" />
        )}
        {/* Bottom dark area */}
        {cropBox.y + cropBox.height < nodeHeight && (
          <rect
            x="0"
            y={cropBox.y + cropBox.height}
            width={nodeWidth}
            height={nodeHeight - (cropBox.y + cropBox.height)}
            fill="rgba(0,0,0,0.5)"
          />
        )}
        {/* Left dark area */}
        {cropBox.x > 0 && (
          <rect x="0" y={cropBox.y} width={cropBox.x} height={cropBox.height} fill="rgba(0,0,0,0.5)" />
        )}
        {/* Right dark area */}
        {cropBox.x + cropBox.width < nodeWidth && (
          <rect
            x={cropBox.x + cropBox.width}
            y={cropBox.y}
            width={nodeWidth - (cropBox.x + cropBox.width)}
            height={cropBox.height}
            fill="rgba(0,0,0,0.5)"
          />
        )}
        {/* Blue outline */}
        <rect
          x={cropBox.x}
          y={cropBox.y}
          width={cropBox.width}
          height={cropBox.height}
          fill="none"
          stroke="#2563eb"
          strokeWidth={1 / zoom}
          pointerEvents="none"
        />
      </svg>

      {/* Top-left corner */}
      <svg
        onPointerDown={handlePointerDown("tl")}
        style={{
          position: "absolute",
          left: `${(cropBox.x - handleScreenSize) * zoom}px`,
          top: `${(cropBox.y - handleScreenSize) * zoom}px`,
          width: `${handleScreenSize * 2 * zoom}px`,
          height: `${handleScreenSize * 2 * zoom}px`,
          cursor: "nwse-resize",
          pointerEvents: "auto",
        }}
        viewBox="0 0 20 20"
      >
        <line x1="10" y1="0" x2="10" y2="10" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
        <line x1="0" y1="10" x2="10" y2="10" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
      </svg>

      {/* Top-right corner */}
      <svg
        onPointerDown={handlePointerDown("tr")}
        style={{
          position: "absolute",
          right: `${(nodeWidth - (cropBox.x + cropBox.width) - handleScreenSize) * zoom}px`,
          top: `${(cropBox.y - handleScreenSize) * zoom}px`,
          width: `${handleScreenSize * 2 * zoom}px`,
          height: `${handleScreenSize * 2 * zoom}px`,
          cursor: "nesw-resize",
          pointerEvents: "auto",
        }}
        viewBox="0 0 20 20"
      >
        <line x1="10" y1="0" x2="10" y2="10" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
        <line x1="10" y1="10" x2="20" y2="10" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
      </svg>

      {/* Bottom-left corner */}
      <svg
        onPointerDown={handlePointerDown("bl")}
        style={{
          position: "absolute",
          left: `${(cropBox.x - handleScreenSize) * zoom}px`,
          bottom: `${(nodeHeight - (cropBox.y + cropBox.height) - handleScreenSize) * zoom}px`,
          width: `${handleScreenSize * 2 * zoom}px`,
          height: `${handleScreenSize * 2 * zoom}px`,
          cursor: "nesw-resize",
          pointerEvents: "auto",
        }}
        viewBox="0 0 20 20"
      >
        <line x1="10" y1="10" x2="10" y2="20" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
        <line x1="0" y1="10" x2="10" y2="10" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
      </svg>

      {/* Bottom-right corner */}
      <svg
        onPointerDown={handlePointerDown("br")}
        style={{
          position: "absolute",
          right: `${(nodeWidth - (cropBox.x + cropBox.width) - handleScreenSize) * zoom}px`,
          bottom: `${(nodeHeight - (cropBox.y + cropBox.height) - handleScreenSize) * zoom}px`,
          width: `${handleScreenSize * 2 * zoom}px`,
          height: `${handleScreenSize * 2 * zoom}px`,
          cursor: "nwse-resize",
          pointerEvents: "auto",
        }}
        viewBox="0 0 20 20"
      >
        <line x1="10" y1="10" x2="10" y2="20" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
        <line x1="10" y1="10" x2="20" y2="10" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
      </svg>

      {/* Top handle */}
      <div
        onPointerDown={handlePointerDown("t")}
        style={{
          position: "absolute",
          left: `${(cropBox.x + 30) * zoom}px`,
          right: `${(nodeWidth - cropBox.x - cropBox.width + 30) * zoom}px`,
          top: `${(cropBox.y - 5) * zoom}px`,
          height: `${10 * zoom}px`,
          backgroundColor: "#2563eb",
          cursor: "ns-resize",
          pointerEvents: "auto",
          minWidth: "30px",
        }}
      />

      {/* Bottom handle */}
      <div
        onPointerDown={handlePointerDown("b")}
        style={{
          position: "absolute",
          left: `${(cropBox.x + 30) * zoom}px`,
          right: `${(nodeWidth - cropBox.x - cropBox.width + 30) * zoom}px`,
          bottom: `${(nodeHeight - cropBox.y - cropBox.height - 5) * zoom}px`,
          height: `${10 * zoom}px`,
          backgroundColor: "#2563eb",
          cursor: "ns-resize",
          pointerEvents: "auto",
          minWidth: "30px",
        }}
      />

      {/* Left handle */}
      <div
        onPointerDown={handlePointerDown("l")}
        style={{
          position: "absolute",
          left: `${(cropBox.x - 5) * zoom}px`,
          top: `${(cropBox.y + 30) * zoom}px`,
          bottom: `${(nodeHeight - cropBox.y - cropBox.height + 30) * zoom}px`,
          width: `${10 * zoom}px`,
          backgroundColor: "#2563eb",
          cursor: "ew-resize",
          pointerEvents: "auto",
          minHeight: "30px",
        }}
      />

      {/* Right handle */}
      <div
        onPointerDown={handlePointerDown("r")}
        style={{
          position: "absolute",
          right: `${(nodeWidth - cropBox.x - cropBox.width - 5) * zoom}px`,
          top: `${(cropBox.y + 30) * zoom}px`,
          bottom: `${(nodeHeight - cropBox.y - cropBox.height + 30) * zoom}px`,
          width: `${10 * zoom}px`,
          backgroundColor: "#2563eb",
          cursor: "ew-resize",
          pointerEvents: "auto",
          minHeight: "30px",
        }}
      />
    </div>
  );
}
