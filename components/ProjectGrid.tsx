"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Project } from "@/lib/db";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function NewProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setLoading(false);
        return;
      }
      onCreated(data.id);
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        backgroundColor: "rgba(26, 24, 20, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: "var(--klad-paper)",
          border: "1px solid var(--klad-ink)",
          boxShadow: "6px 6px 0 var(--klad-ink)",
          padding: "32px",
          width: "100%",
          maxWidth: "440px",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-playfair), ui-serif, Georgia, serif",
            fontStyle: "italic",
            fontSize: "22px",
            fontWeight: 700,
            color: "var(--klad-ink)",
            marginBottom: "24px",
          }}
        >
          New Project
        </h2>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            maxLength={100}
            disabled={loading}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
            style={{
              width: "100%",
              padding: "10px 12px",
              fontFamily: "var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif",
              fontSize: "15px",
              color: "var(--klad-ink)",
              backgroundColor: "#fff",
              border: "1px solid var(--klad-ink)",
              outline: "none",
              boxSizing: "border-box",
              marginBottom: error ? "8px" : "20px",
            }}
          />

          {error && (
            <p
              style={{
                fontFamily: "var(--font-ibm-plex-mono), ui-monospace, monospace",
                fontSize: "12px",
                color: "#c0392b",
                marginBottom: "20px",
              }}
            >
              {error}
            </p>
          )}

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              style={{
                flex: 1,
                padding: "10px 20px",
                fontFamily: "var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif",
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--klad-ink)",
                backgroundColor: loading || !name.trim() ? "var(--klad-paper3)" : "var(--klad-yellow)",
                border: "1px solid var(--klad-ink)",
                boxShadow: loading || !name.trim() ? "none" : "3px 3px 0 var(--klad-ink)",
                cursor: loading || !name.trim() ? "not-allowed" : "pointer",
                transition: "all 0.1s ease",
              }}
            >
              {loading ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: "10px 20px",
                fontFamily: "var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif",
                fontSize: "14px",
                color: "var(--klad-ink3)",
                backgroundColor: "transparent",
                border: "1px solid var(--klad-paper3)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={`/projects/${project.id}`}
      style={{
        display: "block",
        backgroundColor: "#fff",
        border: "1px solid var(--klad-ink)",
        boxShadow: hovered ? "6px 6px 0 var(--klad-ink)" : "4px 4px 0 var(--klad-ink)",
        transform: hovered ? "translate(-2px, -2px)" : "translate(0, 0)",
        transition: "all 0.12s ease",
        padding: "24px",
        textDecoration: "none",
        cursor: "pointer",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <p
        style={{
          fontFamily: "var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: 500,
          color: "var(--klad-ink)",
          marginBottom: "12px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {project.name}
      </p>
      <p
        style={{
          fontFamily: "var(--font-ibm-plex-mono), ui-monospace, monospace",
          fontSize: "11px",
          color: "var(--klad-ink3)",
        }}
      >
        {formatDate(project.created_at)}
      </p>
    </Link>
  );
}

interface ProjectGridProps {
  initialProjects: Project[];
}

export default function ProjectGrid({ initialProjects }: ProjectGridProps) {
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  function handleCreated(id: string) {
    setShowModal(false);
    router.push(`/projects/${id}`);
  }

  return (
    <>
      {/* Page header row */}
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "48px 24px 32px",
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-playfair), ui-serif, Georgia, serif",
            fontStyle: "italic",
            fontSize: "32px",
            fontWeight: 700,
            color: "var(--klad-ink)",
            letterSpacing: "-0.02em",
          }}
        >
          Your Projects
        </h1>

        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: "9px 20px",
            fontFamily: "var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif",
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--klad-ink)",
            backgroundColor: "var(--klad-yellow)",
            border: "1px solid var(--klad-ink)",
            boxShadow: "3px 3px 0 var(--klad-ink)",
            cursor: "pointer",
            transition: "all 0.1s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translate(-1px, -1px)";
            e.currentTarget.style.boxShadow = "4px 4px 0 var(--klad-ink)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translate(0, 0)";
            e.currentTarget.style.boxShadow = "3px 3px 0 var(--klad-ink)";
          }}
        >
          + New Project
        </button>
      </div>

      {/* Grid */}
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 24px 80px",
        }}
      >
        {initialProjects.length === 0 ? (
          <div
            style={{
              border: "1px dashed var(--klad-paper3)",
              padding: "80px 40px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-playfair), ui-serif, Georgia, serif",
                fontStyle: "italic",
                fontSize: "20px",
                color: "var(--klad-ink3)",
                marginBottom: "8px",
              }}
            >
              No projects yet
            </p>
            <p
              style={{
                fontFamily: "var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif",
                fontSize: "14px",
                color: "var(--klad-ink3)",
              }}
            >
              Create your first project to get started.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "20px",
            }}
          >
            {initialProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <NewProjectModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  );
}
