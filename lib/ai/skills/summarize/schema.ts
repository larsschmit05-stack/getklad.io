import { z } from "zod";

export const summarizeSchema = z.object({
  success: z.boolean().describe("Whether the summarization was successful"),
  summary: z
    .string()
    .describe("The summary text — 2 to 4 concise sentences capturing the essence of the selected notes"),
  error: z
    .string()
    .optional()
    .describe("Error explanation if success is false"),
});

export type SummarizeResponse = z.infer<typeof summarizeSchema>;
