"use client";

// ---------------------------------------------------------------------------
// Canvas Engine — Hooks for autosave & interactions
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import type { CanvasDocument } from "./types";
import type { SaveStatus } from "@/components/canvas/SaveIndicator";

const DEBOUNCE_MS = 2000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

// Last-resort safety net: strips any base64 image `src` values from the doc
// before it goes to the server, so a leaked data URL can't blow the 4.5MB
// Vercel body limit. The pendingUploads gate is the primary defense; this
// catches edge cases (upload failure, future regressions, imported legacy
// state). Stripped images render as broken placeholders on reload.
function sanitizeDocForSave(doc: CanvasDocument): CanvasDocument {
  let stripped = 0;
  const nodes: CanvasDocument["nodes"] = {};
  for (const [id, node] of Object.entries(doc.nodes)) {
    if (
      node.props?.type === "image" &&
      typeof node.props.src === "string" &&
      node.props.src.startsWith("data:")
    ) {
      stripped += 1;
      nodes[id] = {
        ...node,
        props: { ...node.props, src: "" },
      };
    } else {
      nodes[id] = node;
    }
  }
  if (stripped > 0) {
    console.warn(
      `[autosave] stripped ${stripped} base64 image src(s) to avoid 413 — upload likely failed or pendingUploads gate was bypassed`
    );
  }
  return { ...doc, nodes };
}

/**
 * Autosave hook — same 2s debounce, 3 retries, 5s delay pattern as the
 * original Canvas component.
 *
 * Optionally accepts a `getThumbnail` function that produces a JPEG data URL
 * for the current view. If provided, the thumbnail is captured right before
 * the save request and included in the body. Failures are swallowed so the
 * canvas save itself never fails because of thumbnail capture.
 */
export function useAutosave(
  projectId: string,
  document: CanvasDocument,
  getThumbnail?: () => Promise<string | null>,
  pendingUploads?: MutableRefObject<number>
) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);
  const isSaving = useRef(false);
  const latestDoc = useRef(document);
  const attemptSaveRef = useRef<(doc: CanvasDocument) => Promise<void>>(
    async () => {}
  );
  const getThumbnailRef = useRef(getThumbnail);
  // Track whether the document has been changed by the user
  const isFirstRender = useRef(true);

  // Keep latest doc in ref (avoids stale closure) — must be in effect, not render
  useEffect(() => {
    latestDoc.current = document;
  }, [document]);

  useEffect(() => {
    getThumbnailRef.current = getThumbnail;
  }, [getThumbnail]);

  const saveToApi = useCallback(
    async (doc: CanvasDocument): Promise<boolean> => {
      let thumbnail: string | null = null;
      try {
        if (getThumbnailRef.current) {
          thumbnail = await getThumbnailRef.current();
        }
      } catch {
        thumbnail = null;
      }
      const safeDoc = sanitizeDocForSave(doc);
      try {
        const res = await fetch(`/api/canvases/${projectId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            thumbnail ? { canvasData: safeDoc, thumbnail } : { canvasData: safeDoc }
          ),
        });
        return res.ok;
      } catch {
        return false;
      }
    },
    [projectId]
  );

  const attemptSave = useCallback(
    async (doc: CanvasDocument) => {
      if (isSaving.current) return;
      // Don't save while image uploads are in progress — wait for the URL swap
      // dispatch to trigger a new debounce cycle with clean storage URLs.
      if (pendingUploads && pendingUploads.current > 0) return;
      isSaving.current = true;
      setSaveStatus("saving");

      const ok = await saveToApi(doc);
      isSaving.current = false;

      if (ok) {
        retryCount.current = 0;
        setSaveStatus("idle");
      } else {
        retryCount.current += 1;
        if (retryCount.current >= MAX_RETRIES) {
          setSaveStatus("fatal");
        } else {
          setSaveStatus("error");
          retryTimer.current = setTimeout(() => {
            attemptSaveRef.current(latestDoc.current);
          }, RETRY_DELAY_MS);
        }
      }
    },
    [saveToApi]
  );

  useEffect(() => {
    attemptSaveRef.current = attemptSave;
  }, [attemptSave]);

  // Debounced save whenever document changes
  useEffect(() => {
    // Skip autosave on initial load
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      attemptSaveRef.current(latestDoc.current);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [document]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []);

  return saveStatus;
}
