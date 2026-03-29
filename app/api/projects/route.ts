import {
  createProject,
  getProjectsByUser,
  getProjectCount,
  getUserPlan,
} from "@/lib/db";
import { getUser } from "@/lib/auth";
import { NextResponse } from "next/server";

const FREE_PROJECT_LIMIT = 3;

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const projects = await getProjectsByUser(user.id);
    return NextResponse.json({ projects });
  } catch (err) {
    console.error("[GET /api/projects]", err);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let name: string;
  try {
    const body = await request.json();
    name = body?.name;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Project name is required" }, { status: 400 });
  }

  try {
    const [plan, count] = await Promise.all([
      getUserPlan(user.id),
      getProjectCount(user.id),
    ]);

    if (plan === "free" && count >= FREE_PROJECT_LIMIT) {
      return NextResponse.json(
        { error: `Free tier is limited to ${FREE_PROJECT_LIMIT} projects. Upgrade to Pro for unlimited projects.` },
        { status: 403 }
      );
    }

    const project = await createProject(user.id, name.trim());
    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    // The DB trigger raises this exact message when the free-tier limit is hit.
    // Catch it here so a race condition (two concurrent creates) still returns 403.
    if (message.startsWith("Free tier limited")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("[POST /api/projects]", err);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
