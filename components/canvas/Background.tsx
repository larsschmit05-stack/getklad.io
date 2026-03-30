"use client";

import { useMemo } from "react";
import type { Camera } from "@/lib/canvas/types";

interface BackgroundProps {
  camera: Camera;
  width: number;
  height: number;
}

const BASE_SPACING = 24;
const DOT_RADIUS = 1.2;
const DOT_COLOR = "#cfc7b8";
const BG_COLOR = "#fef9f3";
const FADE_ZONE = 0.35;

interface GridLayer {
  worldSpacing: number;
  opacity: number;
}

function computeGridLayers(zoom: number): {
  primary: GridLayer;
  secondary: GridLayer | null;
} {
  const rawLevel = -Math.log2(zoom);
  const level = Math.round(rawLevel);
  const fractional = rawLevel - level;
  const absFrac = Math.abs(fractional);

  const primary: GridLayer = {
    worldSpacing: BASE_SPACING * Math.pow(2, level),
    opacity:
      absFrac < FADE_ZONE
        ? 1.0
        : 1.0 - (absFrac - FADE_ZONE) / (0.5 - FADE_ZONE),
  };

  if (absFrac <= FADE_ZONE) {
    return { primary, secondary: null };
  }

  const secondaryLevel = fractional > 0 ? level + 1 : level - 1;
  const secondary: GridLayer = {
    worldSpacing: BASE_SPACING * Math.pow(2, secondaryLevel),
    opacity: (absFrac - FADE_ZONE) / (0.5 - FADE_ZONE),
  };

  return { primary, secondary };
}

function DotPattern({
  id,
  worldSpacing,
  camera,
}: {
  id: string;
  worldSpacing: number;
  camera: Camera;
}) {
  const screenSpacing = worldSpacing * camera.zoom;
  const offsetX =
    ((camera.x % screenSpacing) + screenSpacing) % screenSpacing;
  const offsetY =
    ((camera.y % screenSpacing) + screenSpacing) % screenSpacing;

  return (
    <pattern
      id={id}
      x={offsetX}
      y={offsetY}
      width={screenSpacing}
      height={screenSpacing}
      patternUnits="userSpaceOnUse"
    >
      <circle
        cx={screenSpacing / 2}
        cy={screenSpacing / 2}
        r={DOT_RADIUS}
        fill={DOT_COLOR}
      />
    </pattern>
  );
}

/**
 * Adaptive dot-grid background that maintains consistent visual dot size
 * and spacing across all zoom levels. Uses logarithmic grid-level selection
 * with opacity crossfade for smooth transitions between levels.
 */
export default function Background({ camera, width, height }: BackgroundProps) {
  const { primary, secondary } = useMemo(
    () => computeGridLayers(camera.zoom),
    [camera.zoom]
  );

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={height}
    >
      <defs>
        <DotPattern
          id="dot-primary"
          worldSpacing={primary.worldSpacing}
          camera={camera}
        />
        {secondary && (
          <DotPattern
            id="dot-secondary"
            worldSpacing={secondary.worldSpacing}
            camera={camera}
          />
        )}
      </defs>
      <rect width="100%" height="100%" fill={BG_COLOR} />
      <rect
        width="100%"
        height="100%"
        fill="url(#dot-primary)"
        opacity={primary.opacity}
      />
      {secondary && (
        <rect
          width="100%"
          height="100%"
          fill="url(#dot-secondary)"
          opacity={secondary.opacity}
        />
      )}
    </svg>
  );
}
