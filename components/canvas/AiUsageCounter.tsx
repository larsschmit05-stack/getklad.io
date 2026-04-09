"use client";

import { useState, useEffect } from "react";

interface AiUsageCounterProps {
  refreshKey: number; // increment to re-fetch after an AI call
}

export default function AiUsageCounter({ refreshKey }: AiUsageCounterProps) {
  const [used, setUsed] = useState<number | null>(null);
  const [limit, setLimit] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/klad/usage")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setUsed(data.used as number);
        setLimit(data.limit as number);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // Hide if not yet loaded or unlimited (-1)
  if (used === null || limit === null || limit === -1) return null;

  const remaining = Math.max(0, limit - used);

  return (
    <div
      style={{
        padding: "4px 10px",
        borderRadius: "2px",
        border: "1px solid var(--klad-ink, #1a1814)",
        backgroundColor:
          remaining === 0
            ? "var(--klad-ink, #1a1814)"
            : "var(--klad-paper, #f7f4ef)",
        color:
          remaining === 0
            ? "var(--klad-paper, #f7f4ef)"
            : "var(--klad-ink3, #7a756e)",
        fontFamily: "var(--font-ibm-plex-mono, monospace)",
        fontSize: "11px",
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      {remaining === 0
        ? "No AI calls left today"
        : `${used}/${limit} AI calls today`}
    </div>
  );
}
