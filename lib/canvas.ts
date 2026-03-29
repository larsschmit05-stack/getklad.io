// Canvas state serialization/validation helpers.
// Safe to import in Server Components — no runtime canvas dependencies.

import type { CanvasDocument } from "./canvas/types";

/**
 * Parses a raw JSON blob from the database back into a typed CanvasDocument.
 * Returns null if the value is empty or doesn't match our schema.
 */
export function deserializeCanvasState(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: Record<string, any> | null | undefined
): CanvasDocument | null {
  if (!raw || typeof raw !== "object") return null;
  // Validate it looks like our custom canvas format
  if (raw.version !== 1) return null;
  if (!raw.camera || typeof raw.camera !== "object") return null;
  if (!raw.nodes || typeof raw.nodes !== "object") return null;
  if (!Array.isArray(raw.nodeOrder)) return null;
  // Ensure connectors field exists (may be missing in older saves)
  if (!raw.connectors) {
    raw.connectors = {};
  }
  return raw as CanvasDocument;
}

/**
 * Returns true if the canvas has no user-created nodes.
 */
export function canvasStateIsEmpty(
  snapshot: CanvasDocument | null
): boolean {
  if (!snapshot) return true;
  return Object.keys(snapshot.nodes).length === 0;
}
