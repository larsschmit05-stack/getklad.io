import { createServerSupabaseClient } from "./supabase-server";
import { DAILY_AI_LIMIT } from "./constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Project = {
  id: string;
  user_id: string;
  name: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type CanvasState = {
  id: string;
  project_id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  canvas_data: Record<string, any>;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function getProjectsByUser(userId: string): Promise<Project[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, user_id, name, is_public, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createProject(
  userId: string,
  name: string
): Promise<Project> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({ user_id: userId, name })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Returns the project if the user owns it. Returns null if not found or not owned.
 * RLS + explicit user_id filter means unauthorized access returns null, not an error.
 */
export async function getProject(
  projectId: string,
  userId: string
): Promise<Project | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, user_id, name, is_public, created_at, updated_at")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateProject(
  projectId: string,
  userId: string,
  updates: { name?: string; is_public?: boolean }
): Promise<Project | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("projects")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .eq("user_id", userId)
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteProject(
  projectId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const { error, count } = await supabase
    .from("projects")
    .delete({ count: "exact" })
    .eq("id", projectId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Canvas state
// ---------------------------------------------------------------------------

/**
 * Returns the canvas state for a project, or null if the project has no canvas
 * row yet (first load). Throws if the project doesn't exist or isn't owned.
 */
export async function getCanvasState(
  projectId: string,
  userId: string
): Promise<CanvasState | null> {
  const project = await getProject(projectId, userId);
  if (!project) throw new Error("Project not found");

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("canvas_state")
    .select("id, project_id, canvas_data, updated_at")
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data; // null = project exists but no canvas row yet
}

export async function saveCanvasState(
  projectId: string,
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  canvasData: Record<string, any>
): Promise<CanvasState> {
  // Verify ownership before writing
  const project = await getProject(projectId, userId);
  if (!project) throw new Error("Project not found");

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("canvas_state")
    .upsert(
      {
        project_id: projectId,
        canvas_data: canvasData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id" }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ---------------------------------------------------------------------------
// AI Usage (daily call counter)
// ---------------------------------------------------------------------------

function getTodayResetDate(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

export type AiUsage = {
  used: number;
  limit: number; // -1 = unlimited
  remaining: number; // -1 = unlimited
};

export async function getAiUsage(userId: string): Promise<AiUsage> {
  const supabase = await createServerSupabaseClient();
  const resetDate = getTodayResetDate();

  // Fetch today's usage and per-user limit override in parallel
  const [usageResult, profileResult] = await Promise.all([
    supabase
      .from("ai_usage")
      .select("calls_count")
      .eq("user_id", userId)
      .eq("reset_date", resetDate)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("daily_ai_limit")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (usageResult.error) throw new Error(usageResult.error.message);
  if (profileResult.error) throw new Error(profileResult.error.message);

  const used = usageResult.data?.calls_count ?? 0;
  const effectiveLimit = profileResult.data?.daily_ai_limit ?? DAILY_AI_LIMIT;

  // -1 means unlimited
  if (effectiveLimit === -1) {
    return { used, limit: -1, remaining: -1 };
  }

  return {
    used,
    limit: effectiveLimit,
    remaining: Math.max(0, effectiveLimit - used),
  };
}

export async function incrementAiUsage(userId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const resetDate = getTodayResetDate();

  const { error } = await supabase.rpc("increment_ai_usage", {
    p_user_id: userId,
    p_reset_date: resetDate,
  });
  if (error) throw new Error(error.message);
}
