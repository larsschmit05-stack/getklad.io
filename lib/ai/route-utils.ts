import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getAiUsage } from "@/lib/db";
import type { User } from "@supabase/supabase-js";

/**
 * Returns the authenticated user, or a 401 NextResponse if unauthenticated.
 *
 * Usage:
 *   const authResult = await requireAuth();
 *   if (authResult instanceof NextResponse) return authResult;
 *   const user = authResult;
 */
export async function requireAuth(): Promise<User | NextResponse> {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return user;
}

/**
 * Returns a 403 NextResponse if the user has exhausted their free AI calls,
 * or null if they have remaining usage.
 *
 * Usage:
 *   const usageError = await checkAiUsage(user.id);
 *   if (usageError) return usageError;
 */
export async function checkAiUsage(userId: string): Promise<NextResponse | null> {
  const usage = await getAiUsage(userId);
  if (usage.remaining === 0) {
    return NextResponse.json(
      { error: "You've used all your free AI calls this month. Upgrade to Pro for unlimited." },
      { status: 403 }
    );
  }
  return null;
}
