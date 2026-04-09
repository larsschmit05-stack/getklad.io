"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Project } from "@/lib/db";
import { NewProjectModal } from "./projects/NewProjectModal";
import { RenameModal } from "./projects/RenameModal";
import { DeleteConfirmModal } from "./projects/DeleteConfirmModal";
import { ContextMenu, type ContextMenuState } from "./projects/ContextMenu";
import { ProjectCard } from "./projects/ProjectCard";

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
    setProjects((prev) => prev.filter((p) => p.id !== project.id));
    try {
      await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    } catch {
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

      {contextMenu && (
        <ContextMenu
          menu={contextMenu}
          onRename={handleRename}
          onDelete={(project) => setDeleting(project)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {renaming && (
        <RenameModal
          project={renaming}
          onClose={() => setRenaming(null)}
          onRenamed={handleRenamed}
        />
      )}

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

      {showModal && (
        <NewProjectModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  );
}
