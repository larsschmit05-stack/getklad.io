"use client";

import { useState, useEffect } from "react";

interface AiUsageCounterProps {
  refreshKey: number; // increment to re-fetch after an organize call
}

export default function AiUsageCounter({ refreshKey }: AiUsageCounterProps) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/klad/usage")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        // remaining === -1 means Pro (unlimited)
        setRemaining(data.remaining as number);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // Hide for Pro users or if not yet loaded
  if (remaining === null || remaining === -1) return null;

  // Only show when approaching limit (5 or fewer remaining)
  if (remaining > 5) return null;

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
        ? "No AI calls left"
        : `${remaining} call${remaining === 1 ? "" : "s"} left`}
    </div>
  );
}
