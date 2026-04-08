"use client";

import { useState, useRef, useEffect } from "react";
import { X, ArrowUp, CheckCircle2, AlertCircle } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: "assistant" | "user";
  text: string;
  isError?: boolean;
  isSuccess?: boolean;
}

interface AiSidebarProps {
  isOpen: boolean;
  isLoading: boolean;
  messages: ChatMessage[];
  selectedCount: number;
  totalNodes: number;
  onSend: (instruction: string) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Quick actions
// ---------------------------------------------------------------------------

const QUICK_ACTIONS = [
  { label: "Organize", instruction: "Organize these notes into logical themes with clear labels" },
  { label: "Critical questions", instruction: "Ask critical questions that challenge assumptions and expose blind spots in these notes" },
  { label: "Create tasks", instruction: "Create a task list from these notes" },
];

// ---------------------------------------------------------------------------
// Sidebar width constant (exported for Canvas layout)
// ---------------------------------------------------------------------------

export const AI_SIDEBAR_WIDTH = 360;

// ---------------------------------------------------------------------------
// AI avatar
// ---------------------------------------------------------------------------

function AiAvatar() {
  return (
    <div
      style={{
        width: 26,
        height: 26,
        borderRadius: "8px",
        backgroundColor: "#f5e642",
        border: "1px solid var(--klad-ink, #1a1814)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-playfair, serif)",
          fontSize: "13px",
          fontWeight: 700,
          fontStyle: "italic",
          color: "var(--klad-ink, #1a1814)",
          lineHeight: 1,
        }}
      >
        K
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AiSidebar({
  isOpen,
  isLoading,
  messages,
  selectedCount,
  totalNodes,
  onSend,
  onClose,
}: AiSidebarProps) {
  const [input, setInput] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  const contextText =
    selectedCount > 0
      ? `${selectedCount} note${selectedCount !== 1 ? "s" : ""} selected`
      : `${totalNodes} node${totalNodes !== 1 ? "s" : ""} on canvas`;

  const hasInput = input.trim().length > 0;

  return (
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: "50%",
          transform: "translateY(-50%)",
          right: 16,
          height: "min(680px, calc(100vh - 80px))",
          width: AI_SIDEBAR_WIDTH - 32,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#ffffff",
          border: "1px solid var(--klad-ink, #1a1814)",
          borderRadius: "16px",
          boxShadow: "4px 4px 0 var(--klad-ink, #1a1814)",
          overflow: "hidden",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.2s ease",
        }}
      >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid var(--klad-paper3, #e3ddd5)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <AiAvatar />
          <span
            style={{
              fontFamily: "var(--font-dm-sans, sans-serif)",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--klad-ink, #1a1814)",
              letterSpacing: "0.01em",
              lineHeight: 1,
            }}
          >
            Klad AI
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            border: "1px solid transparent",
            backgroundColor: "transparent",
            cursor: "pointer",
            color: "var(--klad-ink3, #7a756e)",
            borderRadius: "8px",
            transition: "background-color 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "var(--klad-paper2, #ede9e2)";
            (e.currentTarget as HTMLElement).style.color = "var(--klad-ink, #1a1814)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--klad-ink3, #7a756e)";
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Message area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {/* Empty state */}
        {messages.length === 0 && !isLoading && (
          <div style={{ position: "relative", flex: 1 }}>
            {/* Greeting — always anchored at vertical center, never moves */}
            <div style={{
              position: "absolute",
              top: "50%",
              left: 0,
              right: 0,
              transform: "translateY(-50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
              padding: "0 16px",
              textAlign: "center",
            }}>
              <p style={{
                fontFamily: "var(--font-playfair, serif)",
                fontSize: "28px",
                fontWeight: 400,
                fontStyle: "normal",
                color: "var(--klad-ink, #1a1814)",
                margin: 0,
                lineHeight: 1.25,
              }}>
                {"How can\nI help?"}
              </p>
              <p style={{
                fontFamily: "var(--font-dm-sans, sans-serif)",
                fontSize: "13px",
                color: "var(--klad-ink3, #7a756e)",
                margin: 0,
                lineHeight: 1.5,
                minHeight: "3em",
              }}>
                {selectedCount > 0
                  ? `${selectedCount} note${selectedCount !== 1 ? "s" : ""} selected`
                  : "Select notes to work with, or\nask me anything about your canvas."}
              </p>
            </div>

            {/* Quick action chips — positioned below center, independent of greeting */}
            {selectedCount > 0 && (
              <div style={{
                position: "absolute",
                top: "calc(50% + 90px)",
                left: 0,
                right: 0,
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                justifyContent: "center",
                padding: "0 16px",
              }}>
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => onSend(action.instruction)}
                    style={{
                      padding: "7px 13px",
                      border: "1px solid var(--klad-paper3, #e3ddd5)",
                      borderRadius: "20px",
                      backgroundColor: "#ffffff",
                      cursor: "pointer",
                      fontFamily: "var(--font-dm-sans, sans-serif)",
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "var(--klad-ink2, #3d3a35)",
                      transition: "border-color 0.15s, background-color 0.15s",
                      whiteSpace: "nowrap",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--klad-ink, #1a1814)";
                      (e.currentTarget as HTMLElement).style.backgroundColor = "var(--klad-paper2, #ede9e2)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--klad-paper3, #e3ddd5)";
                      (e.currentTarget as HTMLElement).style.backgroundColor = "#ffffff";
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div key={i}>
            {msg.role === "assistant" ? (
              /* AI message */
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <AiAvatar />
                <div style={{ flex: 1, paddingTop: "3px" }}>
                  {msg.isError ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "8px",
                        padding: "10px 12px",
                        backgroundColor: "#fef2f2",
                        border: "1px solid #fecaca",
                        borderRadius: "12px",
                      }}
                    >
                      <AlertCircle size={14} style={{ color: "#dc2626", flexShrink: 0, marginTop: 1 }} />
                      <span
                        style={{
                          fontFamily: "var(--font-dm-sans, sans-serif)",
                          fontSize: "13px",
                          lineHeight: 1.6,
                          color: "#991b1b",
                        }}
                      >
                        {msg.text}
                      </span>
                    </div>
                  ) : msg.isSuccess ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "8px",
                        padding: "10px 12px",
                        backgroundColor: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        borderRadius: "12px",
                      }}
                    >
                      <CheckCircle2 size={14} style={{ color: "#16a34a", flexShrink: 0, marginTop: 1 }} />
                      <span
                        style={{
                          fontFamily: "var(--font-dm-sans, sans-serif)",
                          fontSize: "13px",
                          lineHeight: 1.6,
                          color: "#166534",
                        }}
                      >
                        {msg.text}
                      </span>
                    </div>
                  ) : (
                    <p
                      style={{
                        fontFamily: "var(--font-dm-sans, sans-serif)",
                        fontSize: "13px",
                        lineHeight: 1.7,
                        color: "var(--klad-ink, #1a1814)",
                        margin: 0,
                      }}
                    >
                      {msg.text}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* User message */
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div
                  style={{
                    maxWidth: "80%",
                    fontFamily: "var(--font-dm-sans, sans-serif)",
                    fontSize: "13px",
                    lineHeight: 1.6,
                    color: "var(--klad-paper, #f7f4ef)",
                    backgroundColor: "var(--klad-ink, #1a1814)",
                    padding: "9px 14px",
                    borderRadius: "14px 14px 4px 14px",
                  }}
                >
                  {msg.text}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <AiAvatar />
            <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "5px" }}>
              <span
                style={{
                  fontFamily: "var(--font-dm-sans, sans-serif)",
                  fontSize: "13px",
                  color: "var(--klad-ink3, #7a756e)",
                }}
              >
                Thinking
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                {[0, 0.15, 0.3].map((delay, i) => (
                  <span
                    key={i}
                    style={{
                      display: "inline-block",
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      backgroundColor: "var(--klad-ink3, #7a756e)",
                      animation: `dot-pulse 1.2s ease-in-out ${delay}s infinite`,
                    }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--klad-paper3, #e3ddd5)",
          flexShrink: 0,
          backgroundColor: "#ffffff",
        }}
      >
        <div
          style={{
            border: inputFocused
              ? "1px solid var(--klad-ink, #1a1814)"
              : "1px solid var(--klad-paper3, #e3ddd5)",
            borderRadius: "12px",
            backgroundColor: "#ffffff",
            overflow: "hidden",
            transition: "border-color 0.15s",
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder={
              selectedCount > 0
                ? "What should I do with these notes?"
                : "Ask about your canvas…"
            }
            disabled={isLoading}
            rows={1}
            style={{
              width: "100%",
              resize: "none",
              border: "none",
              outline: "none",
              backgroundColor: "transparent",
              fontFamily: "var(--font-dm-sans, sans-serif)",
              fontSize: "13px",
              color: "var(--klad-ink, #1a1814)",
              lineHeight: 1.5,
              padding: "10px 12px 6px 12px",
              maxHeight: "160px",
              overflowY: "auto",
              boxSizing: "border-box",
              display: "block",
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 8px 8px 12px",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-ibm-plex-mono, monospace)",
                fontSize: "10px",
                color: "var(--klad-ink3, #7a756e)",
              }}
            >
              {contextText}
            </span>
            <button
              onClick={handleSubmit}
              disabled={isLoading || !hasInput}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 10px",
                border: hasInput && !isLoading
                  ? "1px solid var(--klad-ink, #1a1814)"
                  : "1px solid var(--klad-paper3, #e3ddd5)",
                borderRadius: "8px",
                backgroundColor: hasInput && !isLoading
                  ? "#f5e642"
                  : "var(--klad-paper2, #ede9e2)",
                color: "var(--klad-ink, #1a1814)",
                cursor: hasInput && !isLoading ? "pointer" : "default",
                fontFamily: "var(--font-dm-sans, sans-serif)",
                fontSize: "12px",
                fontWeight: 500,
                transition: "background-color 0.15s, border-color 0.15s",
                flexShrink: 0,
              }}
            >
              <ArrowUp size={12} />
              Send
            </button>
          </div>
        </div>
      </div>
      </div>
  );
}
