"use client";

import { useState, useRef, useEffect } from "react";
import { Wand2, Loader2 } from "lucide-react";

interface KladAiButtonProps {
  disabled: boolean;
  isLoading: boolean;
  isOpen: boolean;
  onClick: () => void;
}

export default function KladAiButton({
  disabled,
  isLoading,
  isOpen,
  onClick,
}: KladAiButtonProps) {
  const inactive = disabled || isLoading;
  const [hovered, setHovered] = useState(false);
  const wandRef = useRef<SVGSVGElement | null>(null);
  const animRef = useRef<Animation | null>(null);

  // Wand animation
  useEffect(() => {
    const el = wandRef.current;
    if (!el) return;

    if (hovered && !inactive) {
      animRef.current = el.animate(
        [
          { transform: "rotate(0deg) scale(1)" },
          { transform: "rotate(-14deg) scale(1.15)" },
          { transform: "rotate(10deg) scale(1)" },
          { transform: "rotate(-6deg) scale(1.08)" },
          { transform: "rotate(0deg) scale(1)" },
        ],
        {
          duration: 650,
          iterations: Infinity,
          easing: "ease-in-out",
        }
      );
    } else {
      if (animRef.current) {
        animRef.current.cancel();
        animRef.current = null;
      }
    }

    return () => {
      if (animRef.current) {
        animRef.current.cancel();
        animRef.current = null;
      }
    };
  }, [hovered, inactive]);

  return (
    <button
      title="AI Assistant"
      aria-disabled={inactive}
      onClick={() => {
        if (!inactive) onClick();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        height: "35px",
        padding: "0 10px",
        borderRadius: "2px",
        border: "1px solid var(--klad-ink, #1a1814)",
        boxShadow: inactive
          ? "none"
          : "3px 3px 0 var(--klad-ink, #1a1814)",
        cursor: inactive ? "default" : "pointer",
        backgroundColor: inactive
          ? "var(--klad-paper2, #ede9e2)"
          : hovered || isOpen
            ? "var(--klad-yellow, #f5e642)"
            : "var(--klad-paper, #f7f4ef)",
        color: inactive
          ? "var(--klad-ink3, #7a756e)"
          : "var(--klad-ink, #1a1814)",
        opacity: inactive && !isLoading ? 0.5 : 1,
        transition: "background-color 0.15s, box-shadow 0.15s, opacity 0.15s",
        fontFamily: "var(--font-dm-sans, sans-serif)",
        fontSize: "12px",
        fontWeight: 500,
        letterSpacing: "0.01em",
        whiteSpace: "nowrap",
      }}
    >
      {isLoading ? (
        <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
      ) : (
        <Wand2 ref={wandRef} size={16} />
      )}
    </button>
  );
}
