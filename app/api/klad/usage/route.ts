import { getUser } from "@/lib/auth";
import { getAiUsage } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const usage = await getAiUsage(user.id);
    return NextResponse.json(usage);
  } catch (err) {
    console.error("[GET /api/klad/usage]", err);
    return NextResponse.json(
      { error: "Failed to fetch usage" },
      { status: 500 }
    );
  }
}
