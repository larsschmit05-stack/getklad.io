import { z } from "zod";

export const chatResponseSchema = z.object({
  success: z.boolean().describe("Whether the instruction was valid and executed"),
  type: z
    .enum(["groups", "tasks", "questions", "analysis", "error"])
    .describe("Type of result produced"),
  items: z.array(
    z.object({
      id: z.string().optional().describe("Unique item ID, e.g. group-1 or task-1"),
      label: z.string().describe("Title or label for this item"),
      description: z.string().optional().describe("Description or body text"),
      nodeIds: z.array(z.string()).optional().describe("Referenced node IDs (for groups)"),
      color: z
        .enum(["blue", "amber", "sage", "lavender", "red", "navy", "green", "pink"])
        .optional()
        .describe("Color hint for the item"),
      priority: z
        .enum(["high", "medium", "low"])
        .optional()
        .describe("Priority level (for tasks)"),
      effort: z
        .enum(["small", "medium", "large"])
        .optional()
        .describe("Effort estimate (for tasks)"),
      sourceNodeId: z
        .string()
        .optional()
        .describe("ID of the selected note this task was extracted from (for tasks only, when there is a clear 1:1 mapping)"),
    })
  ).describe("Result items — groups, tasks, questions, or analysis points"),
  summary: z.string().describe("1-2 sentence explanation of what was done"),
  error: z.string().optional().describe("Error explanation if success is false"),
  suggestion: z.string().optional().describe("Suggested alternative if request was invalid"),
});

export type AiChatResponse = z.infer<typeof chatResponseSchema>;
