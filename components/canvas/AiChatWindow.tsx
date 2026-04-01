"use client";

import { useState, useRef, useEffect } from "react";
import { X, ArrowUp, Loader2, Wand2, CheckCircle2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: "assistant" | "user";
  text: string;
  isError?: boolean;
  isSuccess?: boolean;
}

interface AiChatWindowProps {
  isLoading: boolean;
  messages: ChatMessage[];
  selectedCount: number;
  onSend: (instruction: string) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Suggestion chips
// ---------------------------------------------------------------------------

const SUGGESTIONS = [
  "Create a task list",
  "Challenge my assumptions",
  "Sort by themes",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AiChatWindow({
  isLoading,
  messages,
  selectedCount,
  onSend,
  onClose,
}: AiChatWindowProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll to bottom when messages change or loading state changes
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

  const handleSuggestion = (text: string) => {
    if (isLoading) return;
    onSend(text);
  };

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "var(--klad-paper, #f7f4ef)",
        border: "1px solid var(--klad-ink, #1a1814)",
        boxShadow: "4px 4px 0 var(--klad-ink, #1a1814)",
        borderRadius: "2px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        cursor: "default",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 10px",
          borderBottom: "1px solid var(--klad-paper3, #e3ddd5)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Wand2 size={13} style={{ color: "var(--klad-ink, #1a1814)" }} />
          <span
            style={{
              fontFamily: "var(--font-dm-sans, sans-serif)",
              fontSize: "11px",
              fontWeight: 600,
              color: "var(--klad-ink, #1a1814)",
              letterSpacing: "0.01em",
            }}
          >
            AI Assistant
          </span>
          <span
            style={{
              fontFamily: "var(--font-ibm-plex-mono, monospace)",
              fontSize: "9px",
              fontWeight: 400,
              color: "var(--klad-ink3, #7a756e)",
              padding: "1px 5px",
              border: "1px solid var(--klad-paper3, #e3ddd5)",
              borderRadius: "2px",
            }}
          >
            {selectedCount} note{selectedCount !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 20,
            height: 20,
            border: "none",
            backgroundColor: "transparent",
            cursor: "pointer",
            color: "var(--klad-ink3, #7a756e)",
            borderRadius: "2px",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color =
              "var(--klad-ink, #1a1814)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color =
              "var(--klad-ink3, #7a756e)";
          }}
        >
          <X size={13} />
        </button>
      </div>

      {/* Message area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {/* Empty state with suggestions */}
        {messages.length === 0 && !isLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <p
              style={{
                fontFamily: "var(--font-dm-sans, sans-serif)",
                fontSize: "11px",
                color: "var(--klad-ink3, #7a756e)",
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              What would you like me to do with your notes?
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestion(s)}
                  style={{
                    padding: "4px 8px",
                    border: "1px solid var(--klad-paper3, #e3ddd5)",
                    borderRadius: "2px",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                    fontFamily: "var(--font-dm-sans, sans-serif)",
                    fontSize: "10px",
                    color: "var(--klad-ink2, #3d3a35)",
                    transition: "border-color 0.15s, background-color 0.15s",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "var(--klad-ink, #1a1814)";
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      "var(--klad-paper2, #ede9e2)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "var(--klad-paper3, #e3ddd5)";
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      "transparent";
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "88%",
                fontFamily: "var(--font-dm-sans, sans-serif)",
                fontSize: "11px",
                lineHeight: 1.55,
                color: msg.isError
                  ? "#991b1b"
                  : msg.role === "user"
                    ? "var(--klad-ink, #1a1814)"
                    : "var(--klad-ink2, #3d3a35)",
                backgroundColor:
                  msg.role === "user"
                    ? "var(--klad-paper2, #ede9e2)"
                    : msg.isError
                      ? "#fef2f2"
                      : msg.isSuccess
                        ? "#f0fdf4"
                        : "transparent",
                padding:
                  msg.role === "user" || msg.isError || msg.isSuccess
                    ? "6px 8px"
                    : "0",
                borderRadius: "2px",
                border:
                  msg.isError
                    ? "1px solid #fecaca"
                    : msg.isSuccess
                      ? "1px solid #bbf7d0"
                      : msg.role === "user"
                        ? "1px solid var(--klad-paper3, #e3ddd5)"
                        : "none",
              }}
            >
              {msg.isSuccess && (
                <CheckCircle2
                  size={11}
                  style={{
                    color: "#16a34a",
                    display: "inline",
                    verticalAlign: "text-bottom",
                    marginRight: "4px",
                  }}
                />
              )}
              {msg.text}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 8px",
                borderRadius: "2px",
                backgroundColor: "var(--klad-paper2, #ede9e2)",
                border: "1px solid var(--klad-paper3, #e3ddd5)",
              }}
            >
              <Loader2
                size={11}
                style={{
                  animation: "spin 1s linear infinite",
                  color: "var(--klad-ink3, #7a756e)",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-dm-sans, sans-serif)",
                  fontSize: "11px",
                  color: "var(--klad-ink3, #7a756e)",
                }}
              >
                Thinking…
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "6px",
          padding: "8px 10px",
          borderTop: "1px solid var(--klad-paper3, #e3ddd5)",
          flexShrink: 0,
          backgroundColor: "var(--klad-paper, #f7f4ef)",
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about your notes…"
          disabled={isLoading}
          rows={1}
          style={{
            flex: 1,
            resize: "none",
            border: "1px solid var(--klad-paper3, #e3ddd5)",
            borderRadius: "2px",
            outline: "none",
            backgroundColor: "var(--klad-paper, #f7f4ef)",
            fontFamily: "var(--font-dm-sans, sans-serif)",
            fontSize: "11px",
            color: "var(--klad-ink, #1a1814)",
            lineHeight: 1.5,
            padding: "5px 7px",
            maxHeight: "48px",
            overflowY: "auto",
            transition: "border-color 0.15s",
          }}
          onFocus={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor =
              "var(--klad-ink, #1a1814)";
          }}
          onBlur={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor =
              "var(--klad-paper3, #e3ddd5)";
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={isLoading || input.trim().length === 0}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 26,
            height: 26,
            border: "1px solid var(--klad-ink, #1a1814)",
            borderRadius: "2px",
            backgroundColor:
              isLoading || input.trim().length === 0
                ? "var(--klad-paper2, #ede9e2)"
                : "var(--klad-ink, #1a1814)",
            color:
              isLoading || input.trim().length === 0
                ? "var(--klad-ink3, #7a756e)"
                : "var(--klad-paper, #f7f4ef)",
            cursor:
              isLoading || input.trim().length === 0
                ? "default"
                : "pointer",
            flexShrink: 0,
            transition: "background-color 0.15s, color 0.15s",
          }}
        >
          <ArrowUp size={13} />
        </button>
      </div>
    </div>
  );
}
