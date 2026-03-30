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

  const handleSize = 10;
  const handleStyle = {
    position: "absolute" as const,
    width: `${handleSize * 2}px`,
    height: `${handleSize * 2}px`,
    backgroundColor: "#2563eb",
    border: "2px solid white",
    borderRadius: "2px",
    cursor: "pointer",
  };

  const cornerHandleStyle = {
    ...handleStyle,
    width: `${handleSize * 2}px`,
    height: `${handleSize * 2}px`,
  };

  const sideHandleStyle = {
    ...handleStyle,
    width: `${handleSize}px`,
    height: `${handleSize * 2}px`,
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        left: `${nodeX}px`,
        top: `${nodeY}px`,
        width: `${nodeWidth}px`,
        height: `${nodeHeight}px`,
        pointerEvents: "none",
      }}
    >
      {/* Darkened areas outside crop box */}
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        {/* Top dark area */}
        {cropBox.y > 0 && (
          <rect x="0" y="0" width="100%" height={cropBox.y} fill="rgba(0,0,0,0.5)" />
        )}
        {/* Bottom dark area */}
        {cropBox.y + cropBox.height < nodeHeight && (
          <rect
            x="0"
            y={cropBox.y + cropBox.height}
            width="100%"
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
          strokeWidth="2"
          pointerEvents="none"
        />
      </svg>

      {/* Corner handles */}
      <div
        onMouseDown={handleMouseDown("tl")}
        style={{
          ...cornerHandleStyle,
          left: `${cropBox.x - handleSize}px`,
          top: `${cropBox.y - handleSize}px`,
          cursor: "nwse-resize",
          pointerEvents: "auto",
        }}
      />
      <div
        onMouseDown={handleMouseDown("tr")}
        style={{
          ...cornerHandleStyle,
          right: `${nodeWidth - (cropBox.x + cropBox.width) - handleSize}px`,
          top: `${cropBox.y - handleSize}px`,
          cursor: "nesw-resize",
          pointerEvents: "auto",
        }}
      />
      <div
        onMouseDown={handleMouseDown("bl")}
        style={{
          ...cornerHandleStyle,
          left: `${cropBox.x - handleSize}px`,
          bottom: `${nodeHeight - (cropBox.y + cropBox.height) - handleSize}px`,
          cursor: "nesw-resize",
          pointerEvents: "auto",
        }}
      />
      <div
        onMouseDown={handleMouseDown("br")}
        style={{
          ...cornerHandleStyle,
          right: `${nodeWidth - (cropBox.x + cropBox.width) - handleSize}px`,
          bottom: `${nodeHeight - (cropBox.y + cropBox.height) - handleSize}px`,
          cursor: "nwse-resize",
          pointerEvents: "auto",
        }}
      />

      {/* Side handles */}
      <div
        onMouseDown={handleMouseDown("t")}
        style={{
          ...sideHandleStyle,
          left: `${cropBox.x + cropBox.width / 2 - handleSize / 2}px`,
          top: `${cropBox.y - handleSize}px`,
          cursor: "ns-resize",
          pointerEvents: "auto",
        }}
      />
      <div
        onMouseDown={handleMouseDown("b")}
        style={{
          ...sideHandleStyle,
          left: `${cropBox.x + cropBox.width / 2 - handleSize / 2}px`,
          bottom: `${nodeHeight - (cropBox.y + cropBox.height) - handleSize}px`,
          cursor: "ns-resize",
          pointerEvents: "auto",
        }}
      />
      <div
        onMouseDown={handleMouseDown("l")}
        style={{
          ...sideHandleStyle,
          left: `${cropBox.x - handleSize}px`,
          top: `${cropBox.y + cropBox.height / 2 - handleSize}px`,
          width: `${handleSize * 2}px`,
          height: `${handleSize}px`,
          cursor: "ew-resize",
          pointerEvents: "auto",
        }}
      />
      <div
        onMouseDown={handleMouseDown("r")}
        style={{
          ...sideHandleStyle,
          right: `${nodeWidth - (cropBox.x + cropBox.width) - handleSize}px`,
          top: `${cropBox.y + cropBox.height / 2 - handleSize}px`,
          width: `${handleSize * 2}px`,
          height: `${handleSize}px`,
          cursor: "ew-resize",
          pointerEvents: "auto",
        }}
      />
    </div>
  );
}
