import { createServerSupabaseClient } from "./supabase-server";

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

export async function getProjectCount(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return count ?? 0;
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
// Profiles
// ---------------------------------------------------------------------------

export async function getUserPlan(
  userId: string
): Promise<"free" | "pro"> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data?.plan as "free" | "pro") ?? "free";
}

// ---------------------------------------------------------------------------
// AI Usage (monthly call counter)
// ---------------------------------------------------------------------------

const FREE_AI_LIMIT = 50;

function getCurrentMonthResetDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export type AiUsage = {
  used: number;
  limit: number;
  remaining: number;
};

export async function getAiUsage(userId: string): Promise<AiUsage> {
  const supabase = await createServerSupabaseClient();
  const monthDate = getCurrentMonthResetDate();

  const { data, error } = await supabase
    .from("ai_usage")
    .select("calls_count")
    .eq("user_id", userId)
    .eq("month_reset_date", monthDate)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const used = data?.calls_count ?? 0;
  const plan = await getUserPlan(userId);
  const limit = plan === "pro" ? Infinity : FREE_AI_LIMIT;

  return {
    used,
    limit: plan === "pro" ? -1 : FREE_AI_LIMIT, // -1 signals unlimited
    remaining: plan === "pro" ? -1 : Math.max(0, FREE_AI_LIMIT - used),
  };
}

export async function incrementAiUsage(userId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const monthDate = getCurrentMonthResetDate();

  // Try to increment existing row
  const { data, error: selectError } = await supabase
    .from("ai_usage")
    .select("id, calls_count")
    .eq("user_id", userId)
    .eq("month_reset_date", monthDate)
    .maybeSingle();

  if (selectError) throw new Error(selectError.message);

  if (data) {
    const { error } = await supabase
      .from("ai_usage")
      .update({
        calls_count: data.calls_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("ai_usage").insert({
      user_id: userId,
      month_reset_date: monthDate,
      calls_count: 1,
    });
    if (error) throw new Error(error.message);
  }
}
