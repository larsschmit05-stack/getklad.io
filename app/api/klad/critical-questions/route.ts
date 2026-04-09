import { NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { incrementAiUsage } from "@/lib/db";
import { requireAuth, checkAiUsage } from "@/lib/ai/route-utils";
import { AI_CONFIG } from "@/lib/ai/config";
import { SYSTEM_PROMPT } from "@/lib/ai/skills/critical-questions/system-prompt";
import { criticalQuestionsSchema } from "@/lib/ai/skills/critical-questions/schema";
import type {
  OrganizeRequest,
  CriticalQuestionsResponse,
} from "@/lib/ai/serialize-canvas";

// ---------------------------------------------------------------------------
// POST /api/klad/critical-questions
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const user = authResult;

  // Parse body
  let body: OrganizeRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  // Validate input
  const { selectedNodes, canvasMetadata } = body;
  if (!Array.isArray(selectedNodes) || selectedNodes.length < 2) {
    return NextResponse.json(
      { error: "Select at least 2 nodes to ask questions" },
      { status: 400 }
    );
  }
  if (selectedNodes.length > AI_CONFIG.maxSelectedNodes) {
    return NextResponse.json(
      { error: `Too many nodes selected. Try selecting fewer than ${AI_CONFIG.maxSelectedNodes}.` },
      { status: 400 }
    );
  }

  const usageError = await checkAiUsage(user.id);
  if (usageError) return usageError;

  // Build user prompt from serialized nodes
  const nodesDescription = selectedNodes
    .map((n, i) => `${i + 1}. [${n.type}] ${n.text || "(no text)"}`)
    .join("\n");

  const userPrompt = `I have ${selectedNodes.length} notes on my canvas. Please analyze them and ask me critical questions.

SELECTED NOTES:
${nodesDescription}

${
  body.visibleNodes && body.visibleNodes.length > 0
    ? `\nOTHER VISIBLE NOTES (for context only, do NOT question these directly):\n${body.visibleNodes
        .map((n) => `- [${n.type}] ${n.text || "(no text)"}`)
        .join("\n")}`
    : ""
}

CANVAS INFO: ${canvasMetadata?.totalNodes ?? "unknown"} total nodes on canvas.`;

  // Call AI via gateway
  try {
    const { output } = await generateText({
      model: AI_CONFIG.model,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      output: Output.object({ schema: criticalQuestionsSchema }),
    });

    if (!output) {
      return NextResponse.json(
        { error: "AI returned no response. Try again." },
        { status: 500 }
      );
    }

    const response: CriticalQuestionsResponse = {
      mode: "critical-questions",
      domain: output.domain,
      questions: output.questions ?? [],
      clarificationMessage: output.clarificationMessage ?? null,
      summary:
        output.summary ??
        (output.domain === "mixed"
          ? "Mixed context detected."
          : `Asked ${output.questions?.length ?? 0} ${output.domain} questions.`),
    };

    // Increment usage after successful AI call
    await incrementAiUsage(user.id);

    return NextResponse.json(response);
  } catch (err) {
    console.error("[POST /api/klad/critical-questions]", err);
    return NextResponse.json(
      { error: "Failed to generate questions. Please try again." },
      { status: 500 }
    );
  }
}
