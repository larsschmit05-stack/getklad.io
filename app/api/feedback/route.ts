import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { MAX_FEEDBACK_LENGTH } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const user = await getUser();

  const { message, pageUrl } = await req.json();
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }
  if (message.trim().length > MAX_FEEDBACK_LENGTH) {
    return NextResponse.json(
      { error: `Message must be ${MAX_FEEDBACK_LENGTH} characters or fewer` },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const { error: dbError } = await supabase.from("feedback").insert({
    user_id: user?.id ?? null,
    email: user?.email ?? null,
    message: message.trim(),
    page_url: pageUrl ?? null,
  });

  if (dbError) {
    console.error("Feedback insert error:", dbError);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
