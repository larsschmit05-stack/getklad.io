"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--klad-paper, #f7f4ef)",
        fontFamily: "var(--font-dm-sans, sans-serif)",
        color: "var(--klad-ink, #1a1814)",
        padding: "24px",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-playfair, serif)",
          fontSize: "32px",
          marginBottom: "12px",
        }}
      >
        Something went wrong
      </h1>
      <p
        style={{
          fontSize: "16px",
          color: "var(--klad-ink3, #7a756e)",
          marginBottom: "24px",
        }}
      >
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        style={{
          padding: "10px 24px",
          fontSize: "14px",
          fontFamily: "var(--font-dm-sans, sans-serif)",
          backgroundColor: "var(--klad-yellow, #f5e642)",
          color: "var(--klad-ink, #1a1814)",
          border: "1px solid var(--klad-ink, #1a1814)",
          boxShadow: "3px 3px 0 var(--klad-ink, #1a1814)",
          borderRadius: "2px",
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </div>
  );
}
