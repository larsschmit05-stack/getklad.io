import { NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { incrementAiUsage } from "@/lib/db";
import { requireAuth, checkAiUsage } from "@/lib/ai/route-utils";
import { AI_CONFIG } from "@/lib/ai/config";
import { SYSTEM_PROMPT } from "@/lib/ai/skills/chat/system-prompt";
import { chatResponseSchema } from "@/lib/ai/skills/chat/schema";
import type { ChatRequest } from "@/lib/ai/serialize-canvas";

export type { AiChatResponse } from "@/lib/ai/skills/chat/schema";

// ---------------------------------------------------------------------------
// POST /api/klad/chat
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const user = authResult;

  // Parse body
  let body: ChatRequest & { instruction: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  // Validate
  const { focusNodes, contextNodes, canvasMetadata, instruction } = body;
  if (!instruction || typeof instruction !== "string" || instruction.trim().length === 0) {
    return NextResponse.json(
      { error: "Please type an instruction" },
      { status: 400 }
    );
  }
  if ((canvasMetadata?.totalNodes ?? 0) === 0) {
    return NextResponse.json(
      { error: "Add some notes to the canvas first." },
      { status: 400 }
    );
  }
  if (focusNodes && focusNodes.length > AI_CONFIG.maxSelectedNodes) {
    return NextResponse.json(
      { error: `Too many notes selected. Try selecting fewer than ${AI_CONFIG.maxSelectedNodes}.` },
      { status: 400 }
    );
  }

  const usageError = await checkAiUsage(user.id);
  if (usageError) return usageError;

  // Build user prompt
  const hasFocus = Array.isArray(focusNodes) && focusNodes.length > 0;

  let userPrompt = `INSTRUCTION: ${instruction.trim()}\n\n`;

  if (hasFocus) {
    const focusDescription = focusNodes
      .map((n, i) => `${i + 1}. [${n.type}] (id: ${n.id}) ${n.text || "(no text)"}`)
      .join("\n");
    userPrompt += `FOCUS NOTES — user is working on these (${focusNodes.length}):\n${focusDescription}\n\n`;
    userPrompt += `Node IDs to reference: ${focusNodes.map((n) => n.id).join(", ")}\n\n`;
  } else {
    userPrompt += `No notes selected. The user is asking about the full canvas.\n\n`;
  }

  if (Array.isArray(contextNodes) && contextNodes.length > 0) {
    const contextDescription = contextNodes
      .map((n) => `- [${n.type}]${n.id ? ` (id: ${n.id})` : ""} ${n.text || "(no text)"}`)
      .join("\n");
    userPrompt += `CANVAS CONTEXT — other content on canvas (do NOT include in structured results unless asked):\n${contextDescription}\n\n`;
  }

  userPrompt += `CANVAS INFO: ${canvasMetadata?.totalNodes ?? "unknown"} total nodes on canvas.`;

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
