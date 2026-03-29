// ---------------------------------------------------------------------------
// Canvas Engine — Geometry & Coordinate Helpers
// ---------------------------------------------------------------------------

import type { Camera, CanvasNode } from "./types";

/** Convert screen (pixel) coordinates to world (canvas) coordinates. */
export function screenToWorld(
  screenX: number,
  screenY: number,
  camera: Camera
): { x: number; y: number } {
  return {
    x: (screenX - camera.x) / camera.zoom,
    y: (screenY - camera.y) / camera.zoom,
  };
}

/** Convert world coordinates to screen (pixel) coordinates. */
export function worldToScreen(
  worldX: number,
  worldY: number,
  camera: Camera
): { x: number; y: number } {
  return {
    x: worldX * camera.zoom + camera.x,
    y: worldY * camera.zoom + camera.y,
  };
}

/** Axis-aligned bounding box. */
export type AABB = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

/** Get AABB for a node (ignoring rotation for simplicity). */
export function getNodeBounds(node: CanvasNode): AABB {
  return {
    minX: node.x,
    minY: node.y,
    maxX: node.x + node.width,
    maxY: node.y + node.height,
  };
}

/** Check if a world-space point is inside a node's bounding box. */
export function pointInNode(
  worldX: number,
  worldY: number,
  node: CanvasNode
): boolean {
  // Arrows use line-proximity testing instead of bounding-box testing
  if (node.props.type === "arrow") {
    const { dx, dy } = node.props;
    const x1 = node.x, y1 = node.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(worldX - x1, worldY - y1) < 8;
    const t = Math.max(0, Math.min(1, ((worldX - x1) * dx + (worldY - y1) * dy) / lenSq));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    return Math.hypot(worldX - projX, worldY - projY) < 8;
  }
  const b = getNodeBounds(node);
  return worldX >= b.minX && worldX <= b.maxX && worldY >= b.minY && worldY <= b.maxY;
}

/** Check if two AABBs intersect. */
export function aabbIntersects(a: AABB, b: AABB): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

/** Get the AABB for a marquee rectangle (handles negative width/height). */
export function normalizeRect(
  x: number,
  y: number,
  width: number,
  height: number
): AABB {
  return {
    minX: width < 0 ? x + width : x,
    minY: height < 0 ? y + height : y,
    maxX: width < 0 ? x : x + width,
    maxY: height < 0 ? y : y + height,
  };
}

/** Clamp zoom to reasonable bounds. */
export function clampZoom(zoom: number): number {
  return Math.min(Math.max(zoom, 0.1), 5);
}

/** Get the bounding box of multiple nodes. Returns null if empty. */
export function getSelectionBounds(nodes: CanvasNode[]): AABB | null {
  if (nodes.length === 0) return null;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const node of nodes) {
    const b = getNodeBounds(node);
    if (b.minX < minX) minX = b.minX;
    if (b.minY < minY) minY = b.minY;
    if (b.maxX > maxX) maxX = b.maxX;
    if (b.maxY > maxY) maxY = b.maxY;
  }
  return { minX, minY, maxX, maxY };
}

export type ResizeHandle =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

/** Check if a screen point hits a resize handle. Returns handle name or null. */
export function hitTestResizeHandles(
  screenX: number,
  screenY: number,
  node: CanvasNode,
  camera: Camera,
  handleSize: number = 8
): ResizeHandle | null {
  const inset = Math.max(4, 6 / camera.zoom);
  const corners: [ResizeHandle, number, number][] = [
    ["top-left", node.x + inset, node.y + inset],
    ["top-right", node.x + node.width - inset, node.y + inset],
    ["bottom-left", node.x + inset, node.y + node.height - inset],
    ["bottom-right", node.x + node.width - inset, node.y + node.height - inset],
  ];

  const half = handleSize / 2;

  for (const [handle, wx, wy] of corners) {
    const s = worldToScreen(wx, wy, camera);
    if (
      Math.abs(screenX - s.x) <= half &&
      Math.abs(screenY - s.y) <= half
    ) {
      return handle;
    }
  }
  return null;
}
