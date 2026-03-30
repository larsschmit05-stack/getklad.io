"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string | null;
  onDismiss: () => void;
}

export default function Toast({ message, onDismiss }: ToastProps) {
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (!message) return;
    setOpacity(1);

    const fadeTimer = setTimeout(() => setOpacity(0), 2200);
    const dismissTimer = setTimeout(onDismiss, 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        backgroundColor: "var(--klad-paper, #f7f4ef)",
        border: "1px solid var(--klad-ink, #1a1814)",
        boxShadow: "3px 3px 0 var(--klad-ink, #1a1814)",
        padding: "8px 16px",
        fontSize: "13px",
        fontFamily: "var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif",
        color: "var(--klad-ink, #1a1814)",
        pointerEvents: "none",
        opacity,
        transition: "opacity 0.3s ease-out",
        whiteSpace: "nowrap",
      }}
    >
      {message}
    </div>
  );
}
