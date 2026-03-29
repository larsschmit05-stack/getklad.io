import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    console.log('[signup] request received');
    const { email } = await request.json();
    console.log('[signup] email parsed:', email);

    if (!email || typeof email !== "string") {
      console.log('[signup] email validation failed');
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // signInWithOtp creates the user if they don't exist, signs them in if they do
    console.log('[signup] creating supabase client');
    const supabase = await createServerSupabaseClient();
    console.log('[signup] calling signInWithOtp');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        shouldCreateUser: true,
      },
    });
    console.log('[signup] signInWithOtp completed', { error: error?.message });

    if (error) {
      console.log('[signup] otp error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log('[signup] success');
    return NextResponse.json({ message: "Check your email for a sign-in link" });
  } catch (e) {
    console.error('[signup] caught error:', e);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
