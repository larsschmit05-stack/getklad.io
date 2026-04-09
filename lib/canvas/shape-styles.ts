// Shared style helpers used by shape nodes (rect, ellipse, etc.)

export function strokeDashArray(style: string | undefined, width: number): string | undefined {
  if (style === "dashed") return `${width * 6} ${width * 4}`;
  if (style === "dotted") return `${width} ${width * 3}`;
  return undefined;
}

export function resolveFill(
  fill: string,
  fillStyle: string | undefined
): { fill: string; fillOpacity: number } {
  if (fillStyle === "none") return { fill: "transparent", fillOpacity: 0 };
  if (fillStyle === "semi") return { fill, fillOpacity: 0.25 };
  return { fill, fillOpacity: 1 };
}
