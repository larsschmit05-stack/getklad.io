import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "./supabase-server";

/**
 * Returns the authenticated user from the Supabase server.
 * Uses getUser() which validates the JWT with Supabase's servers — safe for
 * server-side auth decisions. Never use getSession() for authorization.
 */
export async function getUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return { user, profile };
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
}

export async function redirectIfNotAuthenticated() {
  const user = await getUser();
  if (!user) {
    redirect("/auth/login");
  }
  return user;
}
