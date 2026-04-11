import { z } from "zod";

export const createTasksSchema = z.object({
  tasks: z
    .array(
      z.object({
        title: z
          .string()
          .describe(
            "Actionable task title starting with a verb: e.g. 'Set up Postgres database'. If a note cannot be rephrased as a verb + noun action, do NOT include it."
          ),
        description: z
          .string()
          .describe("One sentence explaining what needs to be done"),
        priority: z
          .enum(["high", "medium", "low"])
          .describe("Task priority — distribute realistically, not everything is high"),
        effort: z
          .enum(["small", "medium", "large"])
          .describe(
            "Estimated effort: small (< 1h), medium (1-4h), large (4h+)"
          ),
      })
    )
    .describe(
      "3–5 concrete tasks. Only generate as many as genuinely needed. Empty if notes are not actionable."
    ),
  clarificationMessage: z
    .string()
    .nullable()
    .describe(
      "If notes are not actionable (mood boards, abstract ideas), explain why and suggest what to select instead. Null otherwise."
    ),
  summary: z
    .string()
    .describe("One-sentence summary, e.g. 'Created 4 tasks from your notes.'"),
});
