# Klad AI Skills Architecture

## Overview

Klad has 4 AI skills, each living as a separate API route under `app/api/klad/`. Each route currently contains its own system prompt, Zod schema, model config, and business logic — all inline.

**Goal**: Extract prompts and schemas into `lib/ai/skills/` so they're centralized, discoverable, and decoupled from route handlers. Keep it simple — no abstraction layers, no generic executors.

---

## Current State

| Skill | Route | Min nodes | What it does |
|-------|-------|-----------|-------------|
| `chat` | `/api/klad/chat` | 1 | Unified assistant — groups, tasks, questions, analysis |
| `organize` | `/api/klad/organize` | 2 | Groups notes into 2-4 themed clusters |
| `create-tasks` | `/api/klad/create-tasks` | 2 | Extracts actionable tasks from notes |
| `critical-questions` | `/api/klad/critical-questions` | 2 | Challenges assumptions with sharp questions |

All use `google/gemini-2.5-flash` via AI SDK `generateText` + `Output.object()`.

### Pain points

1. **Scattered prompts** — system prompts and schemas are buried in route files, hard to find and compare
2. **Duplicated boilerplate** — auth check, body parse, usage check, node count validation repeated 4x
3. **Hard to iterate** — changing a prompt means finding the right route file and scrolling past HTTP logic

---

## Target Structure

```
lib/ai/
├── skills/
│   ├── chat/
│   │   ├── system-prompt.ts    # System prompt string
│   │   └── schema.ts           # Zod schema + response type export
│   ├── organize/
│   │   ├── system-prompt.ts
│   │   └── schema.ts
│   ├── create-tasks/
│   │   ├── system-prompt.ts
│   │   └── schema.ts
│   └── critical-questions/
│       ├── system-prompt.ts
│       └── schema.ts
├── config.ts                    # Model name, usage limits
├── base-restrictions.ts         # Universal constraints all prompts inherit
└── serialize-canvas.ts          # (existing)
```

Each skill directory has exactly 2 files. No index barrel, no best-practices.md, no generic interfaces.

---

## File Details

### `system-prompt.ts`

Exports a single `SYSTEM_PROMPT` string. Imports `BASE_RESTRICTIONS` where applicable.

```typescript
// lib/ai/skills/chat/system-prompt.ts
import { BASE_RESTRICTIONS } from "@/lib/ai/base-restrictions";

export const SYSTEM_PROMPT = `You are Klad, a thinking partner for solo professionals.

## WHAT YOU CAN DO
...

${BASE_RESTRICTIONS}

## RESPONSE RULES
...`;
```

### `schema.ts`

Exports the Zod schema and the inferred TypeScript type.

```typescript
// lib/ai/skills/chat/schema.ts
import { z } from "zod";

export const chatResponseSchema = z.object({
  success: z.boolean(),
  type: z.enum(["groups", "tasks", "questions", "analysis", "error"]),
  items: z.array(z.object({ /* ... */ })),
  summary: z.string(),
  error: z.string().optional(),
  suggestion: z.string().optional(),
});

export type AiChatResponse = z.infer<typeof chatResponseSchema>;
```

### `base-restrictions.ts`

Shared constraints inserted into every system prompt:

```typescript
// lib/ai/base-restrictions.ts
export const BASE_RESTRICTIONS = `
### UNIVERSAL CONSTRAINTS

- Always write in English regardless of input language
- Every response is ONLY valid JSON — no markdown, no preamble
- Treat user notes as sensitive data
- Never access external services or execute code
- If the instruction is out of scope, explain what you can do instead
`;
```

### `config.ts`

Centralized model and limit constants:

```typescript
// lib/ai/config.ts
export const AI_CONFIG = {
  model: "google/gemini-2.5-flash",
  maxSelectedNodes: 50,
  freeMonthlyLimit: 20,
};
```

---

## Route Handlers After Refactor

Routes stay as explicit handlers — no generic `executeSkill()` wrapper. They just import prompt + schema from the skill directory instead of defining them inline.

```typescript
// app/api/klad/chat/route.ts
import { NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { getUser } from "@/lib/auth";
import { getAiUsage, incrementAiUsage } from "@/lib/db";
import { AI_CONFIG } from "@/lib/ai/config";
import { SYSTEM_PROMPT } from "@/lib/ai/skills/chat/system-prompt";
import { chatResponseSchema } from "@/lib/ai/skills/chat/schema";

export async function POST(request: Request) {
  // Auth — same as today
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Parse + validate — same as today
  const body = await request.json();
  // ...validation...

  // Usage check — same as today
  const usage = await getAiUsage(user.id);
  if (usage.remaining === 0) { /* 403 */ }

  // Build prompt — same as today (route-specific)
  const userPrompt = `INSTRUCTION: ${body.instruction}\n...`;

  // Call AI — now uses imported prompt + schema + config
  const { output } = await generateText({
    model: AI_CONFIG.model,
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    output: Output.object({ schema: chatResponseSchema }),
  });

  await incrementAiUsage(user.id);
  return NextResponse.json(output);
}
```

The route handler is still ~40 lines and fully explicit. No magic, no indirection.

---

## What We're NOT Doing

- **No `AiSkill` interface** — 4 skills don't need a type system
- **No `executeSkill()` generic executor** — adds indirection without value at this scale
- **No best-practices.md files** — the system prompt is the documentation
- **No test suite for AI outputs** — AI responses are non-deterministic; testing them is fragile
- **No fallback models or retry logic** — add when we actually see failures, not preventively
- **No index.ts barrel exports** — routes import directly from skill files

---

## Implementation Steps

### Step 1: Create skill files

Extract system prompts and schemas from the 4 route files into `lib/ai/skills/{name}/`. Create `base-restrictions.ts` and `config.ts`.

### Step 2: Update route handlers

Change routes to import from `lib/ai/skills/` instead of defining prompts inline. Use `AI_CONFIG.model` instead of hardcoded model strings. No other changes to route logic.

That's it. Two steps, no new abstractions.
