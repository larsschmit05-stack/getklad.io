"use client";

// ---------------------------------------------------------------------------
// Canvas Engine — Hooks for autosave & interactions
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";
import type { CanvasDocument } from "./types";
import type { SaveStatus } from "@/components/canvas/SaveIndicator";

const DEBOUNCE_MS = 2000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

/**
 * Autosave hook — same 2s debounce, 3 retries, 5s delay pattern as the
 * original Canvas component.
 */
export function useAutosave(projectId: string, document: CanvasDocument) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);
  const isSaving = useRef(false);
  const latestDoc = useRef(document);
  const attemptSaveRef = useRef<(doc: CanvasDocument) => Promise<void>>(
    async () => {}
  );
  // Track whether the document has been changed by the user
  const isFirstRender = useRef(true);

  // Keep latest doc in ref (avoids stale closure) — must be in effect, not render
  useEffect(() => {
    latestDoc.current = document;
  }, [document]);

  const saveToApi = useCallback(
    async (doc: CanvasDocument): Promise<boolean> => {
      try {
        const res = await fetch(`/api/canvases/${projectId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ canvasData: doc }),
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
