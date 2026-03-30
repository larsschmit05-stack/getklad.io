"use client";

import type { CanvasNode, Camera } from "@/lib/canvas/types";
import { worldToScreen } from "@/lib/canvas/geometry";

type CropHandle = "tl" | "tc" | "tr" | "ml" | "mr" | "bl" | "bc" | "br";

interface CropOverlayProps {
  node: CanvasNode;
  camera: Camera;
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  onApply: () => void;
  onCancel: () => void;
}

export default function CropOverlay({
  node,
  camera,
  cropX,
  cropY,
  cropW,
  cropH,
  onApply,
  onCancel,
}: CropOverlayProps) {
  const { zoom } = camera;

  // Crop window bounds in node-local world space
  const cropLeft = cropX * node.width;
  const cropTop = cropY * node.height;
  const cropRight = (cropX + cropW) * node.width;
  const cropBottom = (cropY + cropH) * node.height;
  const cropWidth = cropW * node.width;
  const cropHeight = cropH * node.height;

  // World coordinates of crop window corners
  const worldLeft = node.x + cropLeft;
  const worldTop = node.y + cropTop;
  const worldRight = node.x + cropRight;
  const worldBottom = node.y + cropBottom;
  const worldCx = (worldLeft + worldRight) / 2;
  const worldCy = (worldTop + worldBottom) / 2;

  // Handle positions in world space
  const handles: Record<CropHandle, { x: number; y: number }> = {
    tl: { x: worldLeft, y: worldTop },
    tc: { x: worldCx, y: worldTop },
    tr: { x: worldRight, y: worldTop },
    ml: { x: worldLeft, y: worldCy },
    mr: { x: worldRight, y: worldCy },
    bl: { x: worldLeft, y: worldBottom },
    bc: { x: worldCx, y: worldBottom },
    br: { x: worldRight, y: worldBottom },
  };

  // Screen-space constants
  const handleRadiusWorld = 8 / zoom; // 8px in screen space
  const handleDia = handleRadiusWorld * 2;
  const HANDLE_SIZE_SCREEN = 8;

  // Compute screen position of crop center for button placement
  const cropCenterScreen = worldToScreen(worldCx, worldCy, camera);

  return (
    <g>
      {/* Semi-transparent overlays on cropped-away regions */}

      {/* Top overlay */}
      <rect
        x={node.x}
        y={node.y}
        width={node.width}
        height={cropTop}
        fill="black"
        opacity={0.6}
        pointerEvents="none"
      />

      {/* Left overlay */}
      <rect
        x={node.x}
        y={worldTop}
        width={cropLeft}
        height={cropHeight}
        fill="black"
        opacity={0.6}
        pointerEvents="none"
      />

      {/* Right overlay */}
      <rect
        x={worldRight}
        y={worldTop}
        width={node.x + node.width - worldRight}
        height={cropHeight}
        fill="black"
        opacity={0.6}
        pointerEvents="none"
      />

      {/* Bottom overlay */}
      <rect
        x={node.x}
        y={worldBottom}
        width={node.width}
        height={node.y + node.height - worldBottom}
        fill="black"
        opacity={0.6}
        pointerEvents="none"
      />

      {/* Dashed border around crop window */}
      <rect
        x={worldLeft}
        y={worldTop}
        width={cropWidth}
        height={cropHeight}
        fill="none"
        stroke="#4a9ebe"
        strokeWidth={1.5 / zoom}
        strokeDasharray={`${4 / zoom},${4 / zoom}`}
        pointerEvents="none"
      />

      {/* Handles: 8 positions */}
      {(Object.keys(handles) as CropHandle[]).map((handleKey) => {
        const pos = handles[handleKey];
        const screenPos = worldToScreen(pos.x, pos.y, camera);

        return (
          <g key={handleKey}>
            {/* Invisible hit target (larger than visual) */}
            <rect
              x={pos.x - handleRadiusWorld}
              y={pos.y - handleRadiusWorld}
              width={handleDia}
              height={handleDia}
              fill="transparent"
              pointerEvents="auto"
              cursor={getCursorForHandle(handleKey)}
              data-crop-handle={handleKey}
              className="crop-handle"
            />
            {/* Visual handle (white square with blue border) */}
            <rect
              x={pos.x - handleRadiusWorld}
              y={pos.y - handleRadiusWorld}
              width={handleDia}
              height={handleDia}
              fill="white"
              stroke="#4a9ebe"
              strokeWidth={1.5 / zoom}
              pointerEvents="none"
            />
          </g>
        );
      })}

      {/* Helper text and buttons (in screen-space via foreignObject) */}
      <foreignObject
        x={cropCenterScreen.x - 150}
        y={cropCenterScreen.y + cropHeight / 2 + 24}
        width={300}
        height={80}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
            fontSize: "12px",
            color: "var(--klad-ink, #1a1814)",
            fontFamily: "var(--font-dm-sans), sans-serif",
          }}
        >
          <div style={{ opacity: 0.7 }}>Enter ✓ · Esc ✗</div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onApply();
              }}
              style={{
                padding: "4px 12px",
                fontSize: "12px",
                backgroundColor: "var(--klad-paper, #f7f4ef)",
                border: "1px solid var(--klad-ink, #1a1814)",
                borderRadius: "2px",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              Apply
            </button>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onCancel();
              }}
              style={{
                padding: "4px 12px",
                fontSize: "12px",
                backgroundColor: "var(--klad-paper, #f7f4ef)",
                border: "1px solid var(--klad-ink, #1a1814)",
                borderRadius: "2px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </foreignObject>
    </g>
  );
}

function getCursorForHandle(handle: CropHandle): string {
  switch (handle) {
    case "tl":
    case "br":
      return "nwse-resize";
    case "tr":
    case "bl":
      return "nesw-resize";
    case "tc":
    case "bc":
      return "ns-resize";
    case "ml":
    case "mr":
      return "ew-resize";
    default:
      return "default";
  }
}
