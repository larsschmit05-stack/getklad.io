import { NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { getUser } from "@/lib/auth";
import { getAiUsage, incrementAiUsage } from "@/lib/db";
import { AI_CONFIG } from "@/lib/ai/config";
import { SYSTEM_PROMPT } from "@/lib/ai/skills/chat/system-prompt";
import { chatResponseSchema } from "@/lib/ai/skills/chat/schema";
import type { OrganizeRequest } from "@/lib/ai/serialize-canvas";

export type { AiChatResponse } from "@/lib/ai/skills/chat/schema";

// ---------------------------------------------------------------------------
// POST /api/klad/chat
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // Auth
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body
  let body: OrganizeRequest & { instruction: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  // Validate
  const { selectedNodes, canvasMetadata, instruction } = body;
  if (!instruction || typeof instruction !== "string" || instruction.trim().length === 0) {
    return NextResponse.json(
      { error: "Please type an instruction" },
      { status: 400 }
    );
  }
  if (!Array.isArray(selectedNodes) || selectedNodes.length < 1) {
    return NextResponse.json(
      { error: "Select at least 1 note" },
      { status: 400 }
    );
  }
  if (selectedNodes.length > AI_CONFIG.maxSelectedNodes) {
    return NextResponse.json(
      { error: `Too many notes selected. Try selecting fewer than ${AI_CONFIG.maxSelectedNodes}.` },
      { status: 400 }
    );
  }

  // Check usage limits
  const usage = await getAiUsage(user.id);
  if (usage.remaining === 0) {
    return NextResponse.json(
      {
        error:
          "You've used all your free AI calls this month. Upgrade to Pro for unlimited.",
      },
      { status: 403 }
    );
  }

  // Build user prompt
  const nodesDescription = selectedNodes
    .map((n, i) => `${i + 1}. [${n.type}] (id: ${n.id}) ${n.text || "(no text)"}`)
    .join("\n");

  const userPrompt = `INSTRUCTION: ${instruction.trim()}

SELECTED NOTES (${selectedNodes.length}):
${nodesDescription}

${
  body.visibleNodes && body.visibleNodes.length > 0
    ? `OTHER VISIBLE NOTES (context only, do NOT include in results):\n${body.visibleNodes
        .map((n) => `- [${n.type}] ${n.text || "(no text)"}`)
        .join("\n")}`
    : ""
}

CANVAS INFO: ${canvasMetadata?.totalNodes ?? "unknown"} total nodes on canvas.
Node IDs to reference: ${selectedNodes.map((n) => n.id).join(", ")}`;

  // Call AI
  try {
    const { output } = await generateText({
      model: AI_CONFIG.model,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      output: Output.object({ schema: chatResponseSchema }),
    });

    if (!output) {
      return NextResponse.json(
        { error: "AI returned no response. Try again." },
        { status: 500 }
      );
    }

    // Increment usage after successful AI call
    await incrementAiUsage(user.id);

    return NextResponse.json(output);
  } catch (err) {
    console.error("[POST /api/klad/chat]", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
