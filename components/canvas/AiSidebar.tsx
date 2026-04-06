"use client";

import { useState, useRef, useEffect } from "react";
import { X, ArrowUp, Loader2, Wand2, CheckCircle2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Types (reuse from AiChatWindow)
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
  { label: "Critical Questions", instruction: "Ask critical questions that challenge assumptions and expose blind spots in these notes" },
  { label: "Create Tasks", instruction: "Create a task list from these notes" },
  { label: "Find Patterns", instruction: "Identify patterns, narrative structure, or missing pieces in these notes" },
  { label: "Summarize", instruction: "Summarize these notes in a few sentences" },
];

// ---------------------------------------------------------------------------
// Sidebar width constant (exported for Canvas layout)
// ---------------------------------------------------------------------------

export const AI_SIDEBAR_WIDTH = 360;

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus input when sidebar opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to let transition start before focusing
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Scroll to bottom when messages change
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

  const handleQuickAction = (instruction: string) => {
    if (isLoading) return;
    onSend(instruction);
  };

  // Context badge text
  const contextText =
    selectedCount > 0
      ? `${selectedCount} note${selectedCount !== 1 ? "s" : ""} selected`
      : `${totalNodes} node${totalNodes !== 1 ? "s" : ""} on canvas`;

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        width: isOpen ? AI_SIDEBAR_WIDTH : 0,
        minWidth: isOpen ? AI_SIDEBAR_WIDTH : 0,
        height: "100%",
        flexShrink: 0,
        backgroundColor: "var(--klad-paper, #f7f4ef)",
        borderLeft: isOpen ? "1px solid var(--klad-ink, #1a1814)" : "none",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: "width 0.25s ease, min-width 0.25s ease",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          borderBottom: "1px solid var(--klad-paper3, #e3ddd5)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Wand2 size={14} style={{ color: "var(--klad-ink, #1a1814)" }} />
          <span
            style={{
              fontFamily: "var(--font-dm-sans, sans-serif)",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--klad-ink, #1a1814)",
              letterSpacing: "0.01em",
            }}
          >
            Klad AI
          </span>
          <span
            style={{
              fontFamily: "var(--font-ibm-plex-mono, monospace)",
              fontSize: "10px",
              fontWeight: 400,
              color: "var(--klad-ink3, #7a756e)",
              padding: "2px 6px",
              border: "1px solid var(--klad-paper3, #e3ddd5)",
              borderRadius: "2px",
            }}
          >
            {contextText}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
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
          <X size={14} />
        </button>
      </div>

      {/* Message area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "14px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {/* Empty state with quick actions */}
        {messages.length === 0 && !isLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <p
              style={{
                fontFamily: "var(--font-dm-sans, sans-serif)",
                fontSize: "12px",
                color: "var(--klad-ink3, #7a756e)",
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {selectedCount > 0
                ? "What should I do with these notes?"
                : "Select some notes, or ask me about your canvas."}
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
              }}
            >
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleQuickAction(action.instruction)}
                  disabled={selectedCount === 0}
                  style={{
                    padding: "10px 12px",
                    border: "1px solid var(--klad-paper3, #e3ddd5)",
                    borderRadius: "2px",
                    backgroundColor: "transparent",
                    cursor: selectedCount > 0 ? "pointer" : "default",
                    fontFamily: "var(--font-dm-sans, sans-serif)",
                    fontSize: "12px",
                    fontWeight: 500,
                    color:
                      selectedCount > 0
                        ? "var(--klad-ink2, #3d3a35)"
                        : "var(--klad-ink3, #7a756e)",
                    textAlign: "left",
                    opacity: selectedCount > 0 ? 1 : 0.5,
                    transition: "border-color 0.15s, background-color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (selectedCount > 0) {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "var(--klad-ink, #1a1814)";
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        "var(--klad-paper2, #ede9e2)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "var(--klad-paper3, #e3ddd5)";
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      "transparent";
                  }}
                >
                  {action.label}
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
                fontSize: "13px",
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
                    ? "8px 10px"
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
                  size={12}
                  style={{
                    color: "#16a34a",
                    display: "inline",
                    verticalAlign: "text-bottom",
                    marginRight: "5px",
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
                padding: "8px 10px",
                borderRadius: "2px",
                backgroundColor: "var(--klad-paper2, #ede9e2)",
                border: "1px solid var(--klad-paper3, #e3ddd5)",
              }}
            >
              <Loader2
                size={12}
                style={{
                  animation: "spin 1s linear infinite",
                  color: "var(--klad-ink3, #7a756e)",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-dm-sans, sans-serif)",
                  fontSize: "12px",
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
          gap: "8px",
          padding: "12px 16px",
          borderTop: "1px solid var(--klad-paper3, #e3ddd5)",
          flexShrink: 0,
          backgroundColor: "var(--klad-paper, #f7f4ef)",
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
          placeholder={
            selectedCount > 0
              ? "What should I do with these notes?"
              : "Ask about your canvas…"
          }
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
            fontSize: "13px",
            color: "var(--klad-ink, #1a1814)",
            lineHeight: 1.5,
            padding: "8px 10px",
            maxHeight: "200px",
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
            width: 30,
            height: 30,
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
          <ArrowUp size={14} />
        </button>
      </div>
    </div>
  );
}
