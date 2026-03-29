"use client";

import type { Camera } from "@/lib/canvas/types";

interface BackgroundProps {
  camera: Camera;
  width: number;
  height: number;
}

/**
 * Warm cream dot-grid background that follows the camera transform.
 * Rendered as an SVG pattern for crisp rendering at all zoom levels.
 */
export default function Background({ camera, width, height }: BackgroundProps) {
  const spacing = 24;
  const dotRadius = 1.5;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={height}
      style={{ backgroundColor: "#fef9f3" }}
    >
      <defs>
        <pattern
          id="dot-grid"
          x={camera.x % (spacing * camera.zoom)}
          y={camera.y % (spacing * camera.zoom)}
          width={spacing * camera.zoom}
          height={spacing * camera.zoom}
          patternUnits="userSpaceOnUse"
        >
          <circle
            cx={spacing * camera.zoom / 2}
            cy={spacing * camera.zoom / 2}
            r={dotRadius}
            fill="#d9d4cc"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dot-grid)" />
    </svg>
  );
}
