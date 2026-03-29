import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";

async function signOutAction() {
  "use server";
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

interface HeaderProps {
  email: string;
  onNewProject?: never; // new project is handled in ProjectGrid
}

export default function Header({ email }: HeaderProps) {
  return (
    <header
      style={{
        borderBottom: "1px solid var(--klad-ink)",
        backgroundColor: "var(--klad-paper)",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 24px",
          height: "56px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Wordmark */}
        <Link
          href="/projects"
          style={{
            fontFamily: "var(--font-playfair), ui-serif, Georgia, serif",
            fontStyle: "italic",
            fontSize: "24px",
            fontWeight: 700,
            color: "var(--klad-ink)",
            textDecoration: "none",
            letterSpacing: "-0.02em",
          }}
        >
          Klad
        </Link>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span
            style={{
              fontFamily: "var(--font-ibm-plex-mono), ui-monospace, monospace",
              fontSize: "12px",
              color: "var(--klad-ink3)",
            }}
          >
            {email}
          </span>

          <form action={signOutAction}>
            <button
              type="submit"
              style={{
                fontFamily: "var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif",
                fontSize: "13px",
                color: "var(--klad-ink3)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px 0",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
              }}
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
