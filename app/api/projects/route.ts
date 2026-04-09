import { createProject, getProjectsByUser } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { MAX_PROJECT_NAME_LENGTH } from "@/lib/constants";

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

  if (name.trim().length > MAX_PROJECT_NAME_LENGTH) {
    return NextResponse.json(
      { error: `Project name must be ${MAX_PROJECT_NAME_LENGTH} characters or fewer` },
      { status: 400 }
    );
  }

  try {
    const project = await createProject(user.id, name.trim());
    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    console.error("[POST /api/projects]", err);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
