import Link from "next/link";

export default function NotFound() {
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
        Page not found
      </h1>
      <p
        style={{
          fontSize: "16px",
          color: "var(--klad-ink3, #7a756e)",
          marginBottom: "24px",
        }}
      >
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/projects"
        style={{
          padding: "10px 24px",
          fontSize: "14px",
          fontFamily: "var(--font-dm-sans, sans-serif)",
          backgroundColor: "var(--klad-yellow, #f5e642)",
          color: "var(--klad-ink, #1a1814)",
          border: "1px solid var(--klad-ink, #1a1814)",
          boxShadow: "3px 3px 0 var(--klad-ink, #1a1814)",
          borderRadius: "2px",
          textDecoration: "none",
        }}
      >
        Go to projects
      </Link>
    </div>
  );
}
