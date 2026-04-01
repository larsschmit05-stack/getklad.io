import { z } from "zod";

export const organizeSchema = z.object({
  groups: z.array(
    z.object({
      id: z.string().describe("Unique group ID, e.g. group-1"),
      label: z
        .string()
        .describe(
          "Clear, specific group label. Not generic like 'Ideas' or 'Other'."
        ),
      description: z
        .string()
        .optional()
        .describe("Short description of why these notes belong together"),
      nodeIds: z
        .array(z.string())
        .describe("IDs of the selected nodes that belong to this group"),
      suggestedColor: z
        .enum(["blue", "amber", "sage", "lavender", "red", "navy"])
        .describe("Color hint for the group label"),
      reasoning: z
        .string()
        .optional()
        .describe("Brief explanation of the grouping logic"),
    })
  ),
  orphans: z.array(
    z.object({
      nodeId: z.string(),
      text: z.string(),
      reason: z
        .string()
        .describe("Why this note does not fit any group"),
    })
  ),
  summary: z
    .string()
    .describe(
      "One-sentence summary of what you organized, e.g. 'Grouped 5 notes into 2 themes.'"
    ),
});
