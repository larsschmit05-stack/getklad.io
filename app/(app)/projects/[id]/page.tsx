import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getProject, getCanvasState } from "@/lib/db";
import { deserializeCanvasState } from "@/lib/canvas";
import Canvas from "@/components/Canvas";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CanvasPage({ params }: Props) {
  const { id } = await params;

  const user = await getUser();
  if (!user) redirect("/auth/login");

  const project = await getProject(id, user.id);
  if (!project) notFound();

  let initialSnapshot = null;
  let loadError = false;
  try {
    const canvasRow = await getCanvasState(id, user.id);
    if (canvasRow?.canvas_data && Object.keys(canvasRow.canvas_data).length > 0) {
      initialSnapshot = deserializeCanvasState(canvasRow.canvas_data);
      // Data exists in DB but failed validation — don't silently discard it
      if (!initialSnapshot) {
        loadError = true;
      }
    }
    // canvasRow is null or canvas_data is empty → new canvas, not an error
  } catch {
    loadError = true;
  }

  if (loadError) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-zinc-50">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-red-900">
            Failed to load canvas
          </h2>
          <p className="mt-2 text-sm text-red-700">
            Your canvas data could not be loaded. This may be a temporary issue.
            Reload the page to try again.
          </p>
          <p className="mt-3 text-xs text-red-500">
            Your existing work has not been overwritten.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Canvas
      projectId={id}
      initialSnapshot={initialSnapshot}
    />
  );
}
