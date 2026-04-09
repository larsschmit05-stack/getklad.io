import { z } from "zod";

export const criticalQuestionsSchema = z.object({
  domain: z
    .enum(["business", "design", "project", "mixed"])
    .describe("Detected domain of the selected notes"),
  questions: z
    .array(z.string())
    .describe(
      "1–4 sharp, specific questions. Each question is a single concise sentence (max ~15 words) that implies the tension and asks the pointed question in one go. Only generate as many as genuinely needed — if 1 question covers the gap, don't pad with filler. Empty if domain is mixed."
    ),
  clarificationMessage: z
    .string()
    .nullable()
    .describe(
      "If domain is mixed, a message explaining why questions can't be generated. Null otherwise."
    ),
  summary: z
    .string()
    .describe(
      "One-sentence summary, e.g. 'Asked 5 business questions.' or 'Mixed context detected.'"
    ),
});
