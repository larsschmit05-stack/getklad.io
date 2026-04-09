"use client";

import { useState } from "react";
import Link from "next/link";
import type { Project } from "@/lib/db";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ProjectCard({
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
