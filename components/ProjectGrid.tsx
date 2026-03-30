"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import type { Project } from "@/lib/db";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ---------------------------------------------------------------------------
// New project modal
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Rename modal
// ---------------------------------------------------------------------------

function RenameModal({
  project,
  onClose,
  onRenamed,
}: {
  project: Project;
  onClose: () => void;
  onRenamed: (id: string, name: string) => void;
}) {
  const [name, setName] = useState(project.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed === project.name) {
      onClose();
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setLoading(false);
        return;
      }
      onRenamed(project.id, trimmed);
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
          Rename Project
        </h2>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
              {loading ? "Saving…" : "Save"}
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

// ---------------------------------------------------------------------------
// Delete confirmation modal
// ---------------------------------------------------------------------------

function DeleteConfirmModal({
  project,
  onClose,
  onConfirm,
}: {
  project: Project;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

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
            marginBottom: "16px",
          }}
        >
          Delete Project
        </h2>

        <p
          style={{
            fontFamily: "var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif",
            fontSize: "15px",
            color: "var(--klad-ink2)",
            marginBottom: "24px",
            lineHeight: 1.5,
          }}
        >
          Delete &ldquo;{project.name}&rdquo;? This can&rsquo;t be undone.
        </p>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: "10px 20px",
              fontFamily: "var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif",
              fontSize: "14px",
              fontWeight: 600,
              color: "#fff",
              backgroundColor: "#c44b3c",
              border: "1px solid var(--klad-ink)",
              boxShadow: "3px 3px 0 var(--klad-ink)",
              cursor: "pointer",
              transition: "all 0.1s ease",
            }}
          >
            Delete
          </button>
          <button
            type="button"
            onClick={onClose}
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
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Context menu
// ---------------------------------------------------------------------------

interface ContextMenuState {
  project: Project;
  x: number;
  y: number;
}

function ContextMenu({
  menu,
  onRename,
  onDelete,
  onClose,
}: {
  menu: ContextMenuState;
  onRename: (project: Project) => void;
  onDelete: (project: Project) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside or scroll
  useEffect(() => {
    function handleDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  // Nudge into viewport if near edge
  const menuWidth = 168;
  const menuHeight = 84;
  const x = Math.min(menu.x, window.innerWidth - menuWidth - 8);
  const y = Math.min(menu.y, window.innerHeight - menuHeight - 8);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: y,
        left: x,
        zIndex: 100,
        backgroundColor: "var(--klad-paper)",
        border: "1px solid var(--klad-ink)",
        boxShadow: "3px 3px 0 var(--klad-ink)",
        minWidth: `${menuWidth}px`,
        padding: "4px 0",
      }}
    >
      <ContextMenuItem
        icon={<Pencil size={13} />}
        label="Rename"
        onClick={() => {
          onClose();
          onRename(menu.project);
        }}
      />
      <div
        style={{
          height: "1px",
          backgroundColor: "var(--klad-paper3)",
          margin: "4px 0",
        }}
      />
      <ContextMenuItem
        icon={<Trash2 size={13} />}
        label="Delete"
        danger
        onClick={() => {
          onClose();
          onDelete(menu.project);
        }}
      />
    </div>
  );
}

function ContextMenuItem({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = danger ? "#c44b3c" : "var(--klad-ink)";

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        width: "100%",
        padding: "7px 14px",
        fontFamily: "var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif",
        fontSize: "13px",
        fontWeight: 500,
        color,
        backgroundColor: hovered ? "var(--klad-paper2)" : "transparent",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        transition: "background-color 0.08s",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Project card
// ---------------------------------------------------------------------------

function ProjectCard({
  project,
  onContextMenu,
}: {
  project: Project;
  onContextMenu: (project: Project, x: number, y: number) => void;
}) {
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
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(project, e.clientX, e.clientY);
      }}
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

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

interface ProjectGridProps {
  initialProjects: Project[];
}

export default function ProjectGrid({ initialProjects }: ProjectGridProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [showModal, setShowModal] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [renaming, setRenaming] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const router = useRouter();

  function handleCreated(id: string) {
    setShowModal(false);
    router.push(`/projects/${id}`);
  }

  const handleContextMenu = useCallback(
    (project: Project, x: number, y: number) => {
      setContextMenu({ project, x, y });
    },
    []
  );

  function handleRename(project: Project) {
    setRenaming(project);
  }

  function handleRenamed(id: string, name: string) {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name } : p))
    );
    setRenaming(null);
  }

  async function handleDelete(project: Project) {
    // Optimistic remove
    setProjects((prev) => prev.filter((p) => p.id !== project.id));
    try {
      await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    } catch {
      // Re-add on failure
      setProjects((prev) => [project, ...prev]);
    }
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
        {projects.length === 0 ? (
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
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onContextMenu={handleContextMenu}
              />
            ))}
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          menu={contextMenu}
          onRename={handleRename}
          onDelete={(project) => setDeleting(project)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Rename modal */}
      {renaming && (
        <RenameModal
          project={renaming}
          onClose={() => setRenaming(null)}
          onRenamed={handleRenamed}
        />
      )}

      {/* Delete confirmation modal */}
      {deleting && (
        <DeleteConfirmModal
          project={deleting}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            handleDelete(deleting);
            setDeleting(null);
          }}
        />
      )}

      {/* New project modal */}
      {showModal && (
        <NewProjectModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  );
}
