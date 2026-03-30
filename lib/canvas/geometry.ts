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

export function getSelectionFrameBounds(
  node: CanvasNode,
  camera: Camera
): AABB {
  if (
    node.props.type === "image" &&
    node.props.originalWidth &&
    node.props.originalHeight
  ) {
    const imageAspect = node.props.originalWidth / node.props.originalHeight;
    const nodeAspect = node.width / Math.max(node.height, 1);

    if (nodeAspect > imageAspect) {
      const contentWidth = node.height * imageAspect;
      const insetX = (node.width - contentWidth) / 2;
      return {
        minX: node.x + insetX,
        minY: node.y,
        maxX: node.x + insetX + contentWidth,
        maxY: node.y + node.height,
      };
    }

    const contentHeight = node.width / imageAspect;
    const insetY = (node.height - contentHeight) / 2;
    return {
      minX: node.x,
      minY: node.y + insetY,
      maxX: node.x + node.width,
      maxY: node.y + insetY + contentHeight,
    };
  }

  if (node.props.type !== "freehand" || node.props.points.length === 0) {
    return getNodeBounds(node);
  }

  let minPX = Infinity;
  let minPY = Infinity;
  let maxPX = -Infinity;
  let maxPY = -Infinity;

  for (const [px, py] of node.props.points) {
    if (px < minPX) minPX = px;
    if (py < minPY) minPY = py;
    if (px > maxPX) maxPX = px;
    if (py > maxPY) maxPY = py;
  }

  const padding = Math.max(8 / camera.zoom, node.props.strokeWidth * 1.5);

  return {
    minX: node.x + minPX - padding,
    minY: node.y + minPY - padding,
    maxX: node.x + maxPX + padding,
    maxY: node.y + maxPY + padding,
  };
}

/** Check if a world-space point is inside a node's bounding box. */
export function pointInNode(
  worldX: number,
  worldY: number,
  node: CanvasNode,
  hitPadding: number = 0
): boolean {
  // Arrows use line-proximity testing instead of bounding-box testing
  if (node.props.type === "arrow") {
    const { dx, dy } = node.props;
    const x1 = node.x, y1 = node.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(worldX - x1, worldY - y1) < 8 + hitPadding;
    const t = Math.max(0, Math.min(1, ((worldX - x1) * dx + (worldY - y1) * dy) / lenSq));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    return Math.hypot(worldX - projX, worldY - projY) < 8 + hitPadding;
  }
  if (node.props.type === "freehand") {
    const threshold = Math.max(node.props.strokeWidth / 2 + hitPadding, 8 + hitPadding);
    const points = node.props.points;
    if (points.length === 1) {
      return (
        Math.hypot(worldX - (node.x + points[0][0]), worldY - (node.y + points[0][1])) <
        threshold
      );
    }
    for (let i = 0; i < points.length - 1; i++) {
      const ax = node.x + points[i][0];
      const ay = node.y + points[i][1];
      const bx = node.x + points[i + 1][0];
      const by = node.y + points[i + 1][1];
      const dx = bx - ax;
      const dy = by - ay;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) continue;
      const t = Math.max(
        0,
        Math.min(1, ((worldX - ax) * dx + (worldY - ay) * dy) / lenSq)
      );
      const projX = ax + t * dx;
      const projY = ay + t * dy;
      if (Math.hypot(worldX - projX, worldY - projY) < threshold) {
        return true;
      }
    }
    return false;
  }
  const b = getNodeBounds(node);
  return (
    worldX >= b.minX - hitPadding &&
    worldX <= b.maxX + hitPadding &&
    worldY >= b.minY - hitPadding &&
    worldY <= b.maxY + hitPadding
  );
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
  | "right"
  | "bottom-left"
  | "bottom-right"
  | "bottom"
  | "left"
  | "top";

/** Check if a screen point hits a resize handle. Returns handle name or null. */
export function hitTestResizeHandles(
  screenX: number,
  screenY: number,
  node: CanvasNode,
  camera: Camera,
  handleSize: number = 12
): ResizeHandle | null {
  const frame = getSelectionFrameBounds(node, camera);
  const corners: [ResizeHandle, number, number][] = [
    ["top-left", frame.minX, frame.minY],
    ["top-right", frame.maxX, frame.minY],
    ["bottom-left", frame.minX, frame.maxY],
    ["bottom-right", frame.maxX, frame.maxY],
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

  const edgeTolerance = Math.max(handleSize / 2, 6);
  const left = worldToScreen(frame.minX, frame.minY, camera).x;
  const right = worldToScreen(frame.maxX, frame.minY, camera).x;
  const top = worldToScreen(frame.minX, frame.minY, camera).y;
  const bottom = worldToScreen(frame.minX, frame.maxY, camera).y;
  if (
    Math.abs(screenY - top) <= edgeTolerance &&
    screenX >= left + handleSize &&
    screenX <= right - handleSize
  ) {
    return "top";
  }

  if (
    Math.abs(screenY - bottom) <= edgeTolerance &&
    screenX >= left + handleSize &&
    screenX <= right - handleSize
  ) {
    return "bottom";
  }

  if (
    Math.abs(screenX - left) <= edgeTolerance &&
    screenY >= top + handleSize &&
    screenY <= bottom - handleSize
  ) {
    return "left";
  }

  if (
    Math.abs(screenX - right) <= edgeTolerance &&
    screenY >= top + handleSize &&
    screenY <= bottom - handleSize
  ) {
    return "right";
  }
  return null;
}
