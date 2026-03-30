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
  initialCropBox?: CropBox;
  onCropChange: (cropBox: CropBox) => void;
  onCropEnd: (cropBox: CropBox) => void;
}

type Handle = "tl" | "tr" | "bl" | "br" | "t" | "b" | "l" | "r";

export default function ImageCropOverlay({
  nodeWidth,
  nodeHeight,
  nodeX,
  nodeY,
  zoom,
  initialCropBox,
  onCropChange,
  onCropEnd,
}: ImageCropOverlayProps) {
  const [cropBox, setCropBox] = useState<CropBox>(
    initialCropBox || { x: 0, y: 0, width: nodeWidth, height: nodeHeight }
  );
  const [draggingHandle, setDraggingHandle] = useState<Handle | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (handle: Handle) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingHandle(handle);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingHandle || !containerRef.current) return;

      const container = containerRef.current.getBoundingClientRect();
      const deltaX = e.movementX / zoom;
      const deltaY = e.movementY / zoom;

      const minSize = 20; // Minimum crop box size

      setCropBox((prev) => {
        let newBox = { ...prev };

        switch (draggingHandle) {
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
    },
    [draggingHandle, zoom, nodeWidth, nodeHeight, onCropChange]
  );

  const handleMouseUp = useCallback(() => {
    if (draggingHandle) {
      onCropEnd(cropBox);
      setDraggingHandle(null);
    }
  }, [draggingHandle, cropBox, onCropEnd]);

  // Add/remove event listeners
  const handleRef = useRef<Handle | null>(null);
  handleRef.current = draggingHandle;

  useEffect(() => {
    if (handleRef.current) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [handleMouseMove, handleMouseUp]);

  const handleScreenSize = 10; // Fixed screen pixels for easy grabbing
  const handleStyle = {
    position: "absolute" as const,
    width: `${handleScreenSize * 2}px`,
    height: `${handleScreenSize * 2}px`,
    backgroundColor: "#2563eb",
    border: "2px solid white",
    borderRadius: "2px",
    cursor: "pointer",
  };

  const cornerHandleStyle = {
    ...handleStyle,
    width: `${handleScreenSize * 2}px`,
    height: `${handleScreenSize * 2}px`,
  };

  const sideHandleStyle = {
    ...handleStyle,
    width: `${handleScreenSize}px`,
    height: `${handleScreenSize * 2}px`,
  };

  return (
    <div
      ref={containerRef}
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
      {/* Darkened areas outside crop box + blue outline as fixed SVG overlay */}
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
        {/* Blue outline on image border */}
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

      {/* Corner handles (L-shaped) */}
      {/* Top-left */}
      <svg
        onMouseDown={handleMouseDown("tl")}
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
        <line x1="10" y1="0" x2="10" y2="10" stroke="#2563eb" strokeWidth="3" />
        <line x1="0" y1="10" x2="10" y2="10" stroke="#2563eb" strokeWidth="3" />
      </svg>

      {/* Top-right */}
      <svg
        onMouseDown={handleMouseDown("tr")}
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
        <line x1="10" y1="0" x2="10" y2="10" stroke="#2563eb" strokeWidth="3" />
        <line x1="10" y1="10" x2="20" y2="10" stroke="#2563eb" strokeWidth="3" />
      </svg>

      {/* Bottom-left */}
      <svg
        onMouseDown={handleMouseDown("bl")}
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
        <line x1="10" y1="10" x2="10" y2="20" stroke="#2563eb" strokeWidth="3" />
        <line x1="0" y1="10" x2="10" y2="10" stroke="#2563eb" strokeWidth="3" />
      </svg>

      {/* Bottom-right */}
      <svg
        onMouseDown={handleMouseDown("br")}
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
        <line x1="10" y1="10" x2="10" y2="20" stroke="#2563eb" strokeWidth="3" />
        <line x1="10" y1="10" x2="20" y2="10" stroke="#2563eb" strokeWidth="3" />
      </svg>

      {/* Top handle (horizontal) */}
      <div
        onMouseDown={handleMouseDown("t")}
        style={{
          position: "absolute",
          left: `${(cropBox.x + 30) * zoom}px`,
          right: `${(nodeWidth - cropBox.x - cropBox.width + 30) * zoom}px`,
          top: `${(cropBox.y - handleScreenSize / 2) * zoom}px`,
          height: `${handleScreenSize * zoom}px`,
          backgroundColor: "#2563eb",
          borderRadius: "2px",
          cursor: "ns-resize",
          pointerEvents: "auto",
          minWidth: "30px",
        }}
      />

      {/* Bottom handle (horizontal) */}
      <div
        onMouseDown={handleMouseDown("b")}
        style={{
          position: "absolute",
          left: `${(cropBox.x + 30) * zoom}px`,
          right: `${(nodeWidth - cropBox.x - cropBox.width + 30) * zoom}px`,
          bottom: `${(nodeHeight - cropBox.y - cropBox.height - handleScreenSize / 2) * zoom}px`,
          height: `${handleScreenSize * zoom}px`,
          backgroundColor: "#2563eb",
          borderRadius: "2px",
          cursor: "ns-resize",
          pointerEvents: "auto",
          minWidth: "30px",
        }}
      />

      {/* Left handle (vertical) */}
      <div
        onMouseDown={handleMouseDown("l")}
        style={{
          position: "absolute",
          left: `${(cropBox.x - handleScreenSize / 2) * zoom}px`,
          top: `${(cropBox.y + 30) * zoom}px`,
          bottom: `${(nodeHeight - cropBox.y - cropBox.height + 30) * zoom}px`,
          width: `${handleScreenSize * zoom}px`,
          backgroundColor: "#2563eb",
          borderRadius: "2px",
          cursor: "ew-resize",
          pointerEvents: "auto",
          minHeight: "30px",
        }}
      />

      {/* Right handle (vertical) */}
      <div
        onMouseDown={handleMouseDown("r")}
        style={{
          position: "absolute",
          right: `${(nodeWidth - cropBox.x - cropBox.width - handleScreenSize / 2) * zoom}px`,
          top: `${(cropBox.y + 30) * zoom}px`,
          bottom: `${(nodeHeight - cropBox.y - cropBox.height + 30) * zoom}px`,
          width: `${handleScreenSize * zoom}px`,
          backgroundColor: "#2563eb",
          borderRadius: "2px",
          cursor: "ew-resize",
          pointerEvents: "auto",
          minHeight: "30px",
        }}
      />
    </div>
  );
}
