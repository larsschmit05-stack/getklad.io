"use client";

import { useState, useRef, useEffect } from "react";

interface FeedbackButtonProps {
  variant?: "canvas" | "floating";
}

export default function FeedbackButton({ variant = "floating" }: FeedbackButtonProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [open]);

  async function submit() {
    if (!message.trim() || status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, pageUrl: window.location.href }),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus("sent");
      setMessage("");
      setTimeout(() => {
        setOpen(false);
        setStatus("idle");
      }, 2000);
    } catch {
      setStatus("error");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Stop canvas keyboard shortcuts (tool switching, delete, etc.) from
    // firing while the user is typing in this form.
    e.stopPropagation();
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const isCanvas = variant === "canvas";

  // Modal position: below the trigger for canvas, above for floating
  const modalStyle: React.CSSProperties = isCanvas
    ? { position: "fixed", top: "52px", left: "130px", zIndex: 10001, width: "300px" }
    : { position: "fixed", bottom: "70px", right: "20px", zIndex: 10001, width: "320px" };

  return (
    <>
      {/* Trigger button */}
      {isCanvas ? (
        <button
          ref={buttonRef}
          onClick={() => { setOpen(!open); setStatus("idle"); }}
          title="Report a bug or share feedback"
          onMouseEnter={(e) => {
            if (!open) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--klad-paper2, #ede9e2)";
          }}
          onMouseLeave={(e) => {
            if (!open) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--klad-paper, #f7f4ef)";
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "31.5px",
            height: "31.5px",
            backgroundColor: open ? "var(--klad-yellow, #f5e642)" : "var(--klad-paper, #f7f4ef)",
            border: "1px solid var(--klad-ink, #1a1814)",
            boxShadow: "3px 3px 0 var(--klad-ink, #1a1814)",
            borderRadius: "2px",
            cursor: "pointer",
            color: open ? "var(--klad-ink, #1a1814)" : "var(--klad-ink3, #7a756e)",
            transition: "background-color 0.1s, color 0.1s",
            padding: 0,
            outline: "none",
          }}
        >
          <BugIcon />
        </button>
      ) : (
        <button
          ref={buttonRef}
          onClick={() => { setOpen(true); setStatus("idle"); }}
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            background: "var(--klad-paper)",
            color: "var(--klad-ink)",
            border: "1px solid var(--klad-ink)",
            boxShadow: "3px 3px 0 var(--klad-ink)",
            borderRadius: "6px",
            fontSize: "13px",
            fontFamily: "var(--font-dm-sans)",
            fontWeight: 500,
            cursor: "pointer",
            userSelect: "none",
          }}
          title="Report a bug or share feedback"
        >
          <BugIcon />
          Feedback
        </button>
      )}

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 10000 }}
        />
      )}

      {/* Modal */}
      {open && (
        <div
          style={{
            ...modalStyle,
            background: "var(--klad-paper, #f7f4ef)",
            border: "1px solid var(--klad-ink, #1a1814)",
            boxShadow: "4px 4px 0 var(--klad-ink, #1a1814)",
            borderRadius: "8px",
            padding: "20px",
            fontFamily: "var(--font-dm-sans, system-ui, sans-serif)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontWeight: 600, fontSize: "14px", color: "var(--klad-ink)" }}>
              Report a bug / feedback
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--klad-ink3)", fontSize: "18px", lineHeight: 1, padding: "2px" }}
            >
              ×
            </button>
          </div>

          {status === "sent" ? (
            <p style={{ fontSize: "14px", color: "var(--klad-ink2)", textAlign: "center", padding: "16px 0" }}>
              Thanks! We got your report.
            </p>
          ) : (
            <>
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe the bug or feedback…"
                rows={5}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  resize: "vertical",
                  border: "1px solid var(--klad-paper3, #e3ddd5)",
                  borderRadius: "4px",
                  padding: "10px",
                  fontSize: "13px",
                  fontFamily: "var(--font-dm-sans, system-ui, sans-serif)",
                  color: "var(--klad-ink)",
                  background: "var(--klad-paper2, #ede9e2)",
                  outline: "none",
                  marginBottom: "10px",
                }}
              />
              {status === "error" && (
                <p style={{ fontSize: "12px", color: "#dc2626", marginBottom: "8px" }}>
                  Something went wrong — please try again.
                </p>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "var(--klad-ink3)" }}>⌘ + Enter to send</span>
                <button
                  onClick={submit}
                  disabled={!message.trim() || status === "sending"}
                  style={{
                    padding: "7px 16px",
                    background: message.trim() ? "var(--klad-ink)" : "var(--klad-paper3, #e3ddd5)",
                    color: message.trim() ? "var(--klad-paper)" : "var(--klad-ink3)",
                    border: "1px solid var(--klad-ink)",
                    boxShadow: message.trim() ? "2px 2px 0 var(--klad-ink2)" : "none",
                    borderRadius: "4px",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: message.trim() ? "pointer" : "default",
                  }}
                >
                  {status === "sending" ? "Sending…" : "Send"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

function BugIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2l1.5 1.5"/>
      <path d="M14.5 3.5L16 2"/>
      <path d="M9 9h6"/>
      <path d="M9 13h6"/>
      <path d="M9 17h3"/>
      <path d="M6.5 8.5C5.5 7.5 4 7 4 7s1 2 1 5-1 5-1 5 1.5-.5 2.5-1.5"/>
      <path d="M17.5 8.5c1-1 2.5-1.5 2.5-1.5s-1 2-1 5 1 5 1 5-1.5-.5-2.5-1.5"/>
      <rect x="8" y="5" width="8" height="15" rx="3"/>
    </svg>
  );
}
