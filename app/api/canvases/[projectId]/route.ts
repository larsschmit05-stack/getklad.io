import { getCanvasState, saveCanvasState } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  try {
    const canvas = await getCanvasState(projectId, user.id);
    // canvas === null means project exists but has no saved state yet — return empty
    return NextResponse.json({
      projectId,
      canvasData: canvas?.canvas_data ?? {},
      updatedAt: canvas?.updated_at ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Project not found") {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    console.error("[GET /api/canvases/[projectId]]", err);
    return NextResponse.json(
      { error: "Failed to fetch canvas state" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  let canvasData: Record<string, unknown>;
  try {
    const body = await request.json();
    canvasData = body?.canvasData;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!canvasData || typeof canvasData !== "object" || Array.isArray(canvasData)) {
    return NextResponse.json(
      { error: "canvasData must be an object" },
      { status: 400 }
    );
  }

  try {
    const canvas = await saveCanvasState(projectId, user.id, canvasData);
    return NextResponse.json({
      projectId,
      canvasData: canvas.canvas_data,
      updatedAt: canvas.updated_at,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "Project not found") {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    console.error("[POST /api/canvases/[projectId]]", err);
    return NextResponse.json(
      { error: "Failed to save canvas state" },
      { status: 500 }
    );
  }
}
