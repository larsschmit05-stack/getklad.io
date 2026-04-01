# Klad AI Mode 3: Create Tasks
## Product Requirements Document

**Version:** v0.1 — MVP Feature
**Owner:** Lars (solo founder)
**Status:** Not Started
**Domain:** useklad.com
**Stack:** Next.js · Supabase · Google Gemini API (via Vercel AI Gateway)

---

## One-Line Purpose

> **"AI reads your organized thinking and converts it into executable task cards — right on your canvas, no context switching."**

---

## 1. Feature Overview

**Create Tasks** is the third Klad AI mode. When you select organized notes (or any action-oriented stickies) and click "Create Tasks," Gemini extracts the actionable items and generates 3–5 task cards directly on your canvas. Each task card includes a title, priority level, estimated effort, and a checkbox for tracking completion.

This closes the critical gap between **organized thinking** and **execution**. Your tasks live on the same canvas as your reasoning, so you always know *why* a task exists — no copying context to Linear, no syncing between tools, no losing the thread.

---

## 2. Problem This Solves

### The Gap

Solo founders organize their thinking (using Organize mode), challenge it (using Critical Questions), and then... open a separate tool to create tasks. That's where context dies.

1. **Context loss** — copying tasks from a canvas to Linear/Asana strips away the reasoning that created them
2. **Tool fragmentation** — two places to manage work = confusion, sync problems, and things falling through cracks
3. **Overhead** — setting up a project management tool for 5 tasks is overkill; founders need lightweight execution tracking
4. **Disconnection** — tasks in external tools lose their link to source thinking; a week later you forget *why* "Set up Postgres" matters

### Why This Matters

- Founders waste time context-switching between thinking tools and execution tools
- Tasks created without visible reasoning get deprioritized or misunderstood
- Simple execution tracking (just a checkbox) is all most solo founders need — not Gantt charts and sprint planning
- Keeping everything on the canvas means your plan, your questions, and your tasks are always one glance away

---

## 3. Target User

Same as the core Klad product: **indie SaaS founders, vibecoders, and solo creative builders** who think visually and need lightweight execution without heavy project management.

### When They Use This Mode

- After organizing notes into groups ("OK, now what do I actually *do*?")
- After answering critical questions ("Now that I've thought harder, what's the plan?")
- When converting a brainstorm into next steps
- When scoping a sprint or a week of work from scattered ideas

---

## 4. How It Works

### Step 1: Selection

User selects notes on the canvas — typically an organized group from Organize mode, but any selection of 2+ notes works. The AI uses the content to extract actionable items.

### Step 2: Task Extraction

Gemini analyzes the selected notes and extracts **3–5 concrete, actionable tasks**. Each task:
- Has a clear, specific title (verb + noun, e.g. "Set up Postgres database")
- Is assigned a **priority**: high, medium, or low
- Is assigned an **estimated effort**: small (< 1 hour), medium (1–4 hours), or large (4+ hours)
- Is scoped to be completable by one person

If the selected notes don't contain actionable content (e.g., purely abstract ideas or mood boards), Gemini returns a clarification message instead of tasks.

### Step 3: Canvas Output

Task cards appear on the canvas as a new node type or styled sticky notes:
- Positioned to the right of the selected notes (same pattern as Critical Questions)
- Each card shows: checkbox, title, priority badge, effort badge
- Cards are arranged in a vertical list (single column)
- Header node above the list: "Tasks" (32px bold, same style as other AI headers)

### Task Card Anatomy

```
+----------------------------------+
|  [ ]  Set up Postgres database   |
|       Priority: High             |
|       Effort: Medium             |
+----------------------------------+
```

- **Checkbox**: clickable, toggles between unchecked and checked (strikethrough text when checked)
- **Title**: the actionable task, 1 sentence max
- **Priority**: high (red dot) / medium (amber dot) / low (green dot)
- **Effort**: small / medium / large — helps the user sequence their work

---

## 5. Example Flow

### Input: Organized "Technical Setup" group

Selected notes:
- "Need a database for user data and projects"
- "Payment integration for pro tier"
- "Auth system — magic links preferred"
- "Deploy to Vercel, connect custom domain"

### Output: 4 task cards

> 1. **Set up Postgres database** — Priority: High · Effort: Medium
>    _Create tables for users, projects, and billing. Set up RLS policies._
>
> 2. **Integrate Stripe for payments** — Priority: High · Effort: Large
>    _Connect Stripe checkout for pro tier subscriptions. Handle webhooks for payment events._
>
> 3. **Build magic link authentication** — Priority: High · Effort: Medium
>    _Implement passwordless auth flow using Supabase magic links. Add session management._
>
> 4. **Configure Vercel deployment** — Priority: Medium · Effort: Small
>    _Connect repo to Vercel, set environment variables, attach custom domain._

### Input: Non-actionable content

Selected notes (mood board):
- "Minimalist aesthetic, lots of whitespace"
- "Earth tones, warm palette"
- "Inspiration: Linear, Notion"

### Output: Clarification message

> "These notes describe a design direction, not actionable tasks. Try selecting notes that describe things you need to *build*, *set up*, or *decide* — then I can turn them into tasks."

---

## 6. User Story

### Acceptance Scenario

```
Given: User has selected 4 sticky notes about their technical setup
When: User clicks "Create Tasks" button
Then: Within 3 seconds, Gemini responds with:
  - Extracts 4 concrete tasks from the notes
  - Each task has title, priority, and effort estimate
  - Renders as styled sticky notes on canvas in a vertical list
  - Header "Tasks" appears above the list (32px bold)
  - Usage counter increments by 1
  - Toast shows: "4 tasks created"
```

### Edge Case: Non-Actionable Content

```
Given: User selects 3 notes that are purely descriptive (mood, aesthetic, inspiration)
When: User clicks "Create Tasks"
Then: Within 3 seconds:
  - Detects non-actionable content
  - Returns clarification message
  - Renders as single sticky note on canvas
  - Usage counter increments by 1
```

---

## 7. Technical Specification

### API Route

**Endpoint:** `POST /api/klad/create-tasks`

**Request Payload:** Reuses `OrganizeRequest` type from `lib/ai/serialize-canvas.ts`
```json
{
  "selectedNodes": [...],
  "visibleNodes": [...],
  "canvasMetadata": {
    "totalNodes": 12,
    "selectedCount": 4
  }
}
```

**Response Payload:**
```json
{
  "mode": "create-tasks",
  "tasks": [
    {
      "title": "Set up Postgres database",
      "description": "Create tables for users, projects, and billing. Set up RLS policies.",
      "priority": "high",
      "effort": "medium"
    }
  ],
  "clarificationMessage": null,
  "summary": "Created 4 tasks from your notes."
}
```

### Implementation Notes

- **Reuse serialization:** Use existing `serializeForOrganize()` from `lib/ai/serialize-canvas.ts` (same 1,200 token budget)
- **Model:** `google/gemini-2.5-flash` (consistent with other AI modes)
- **Auth:** Gate via `getUser()` — unauthenticated requests return 401
- **Usage limit:**
  - Free tier: 50 calls/month (shared with other AI modes)
  - Pro tier: unlimited
  - Route checks `getAiUsage()` before calling Gemini, returns 403 if exhausted
  - Route calls `incrementAiUsage()` after successful response
- **Timeout:** 10 seconds (same as other modes)
- **Structured output:** Use `Output.object()` from AI SDK v6 to enforce schema

### Task Card Implementation Options

Two approaches for rendering task cards on the canvas:

**Option A: Styled Sticky Notes (recommended for MVP)**
- Reuse existing sticky node type
- Task metadata (priority, effort, checked state) stored in sticky text as formatted content
- Checkbox behavior added to sticky interaction (new capability)
- Pro: no new node type needed, faster to ship
- Con: limited visual differentiation, metadata in text is fragile

**Option B: New "task" Node Type**
- Add `TaskProps` to `lib/canvas/types.ts`
- New `TaskNode` component in `components/canvas/nodes/`
- Structured data: `title`, `description`, `priority`, `effort`, `checked` as typed fields
- Pro: clean data model, rich rendering, proper checkbox state
- Con: more work (new type, renderer, serialization, reducer updates)

**Recommendation:** Start with Option A for MVP speed. Migrate to Option B if task cards gain traction and need richer interaction.

### Canvas Integration

- **Positioning:** Same pattern as Critical Questions — to the right of selection bounding box + 80px offset
- **Layout:** Vertical stack, single column
- **Header node:** "Tasks" label (32px bold text node, same style as Organize/Critical Questions headers)
- **Atomic undo:** `PASTE_NODES` action (creating new sticky nodes only)
- **Fade-in animation:** Reuse `fadeInNodeIds` pattern

### Gemini Prompt Strategy

The system prompt should:
1. Instruct Gemini to extract actionable items from notes
2. Define the task format (title as verb+noun, 1 sentence description)
3. Define priority and effort scales with clear criteria
4. Instruct to generate only 3–5 tasks — no padding, only genuine tasks
5. Handle non-actionable content gracefully (return clarification message)
6. Enforce English-only output
7. Each task description should be exactly 1 sentence explaining what needs to be done

---

## 8. UI/UX Design

### Trigger

- **"Create Tasks"** option in the KladAiButton dropdown menu (alongside Organize and Critical Questions)
- Icon suggestion: `ListChecks` from Lucide

### Disabled States

- Button disabled if < 2 nodes selected (same as other modes)
- Button disabled if user has exhausted free tier limit

### Loading State

- Wand icon shows spinner while request is in flight
- Loading label: "Creating tasks..."
- Button disabled during request
- 10-second timeout, then error toast

### Success State

- Task cards appear on canvas to the right of selection
- Fade-in animation (same timing as other modes)
- Toast notification: "4 tasks created" (or "1 task created")

### Error States

- **Auth failed:** 401, app handles session refresh
- **Usage exhausted:** 403, toast shows upgrade message
- **Gemini API down:** 500, toast shows retry message
- **Non-actionable content:** clarification sticky, not an error

---

## 9. Acceptance Criteria

### Functional

- Given actionable notes, generates 3–5 task cards with title, priority, and effort
- Given non-actionable notes, returns a helpful clarification message
- Tasks are specific and scoped (verb + noun titles, not vague)
- Priority assignments are reasonable (not everything is "high")
- Effort estimates are calibrated for a solo developer
- All outputs land on canvas within 3 seconds
- Usage counter increments exactly once per successful call

### Technical

- Route requires valid JWT (auth gated)
- Route validates 2–50 selected nodes
- Route uses `serializeForOrganize()` for context serialization
- Route calls Gemini with structured output schema
- Route handles timeouts gracefully (10s max)

### UX

- Task cards appear to the right of selection, no overlap
- Header "Tasks" is visible above the list
- Fade-in animation on new cards
- Loading spinner visible during request
- Error messages are clear and actionable
- Toast shows task count on success

---

## 10. Out of Scope — v1

- Checkbox interaction (checking/unchecking tasks) — separate implementation task
- Task reordering or drag-to-reprioritize
- Task dependencies or blocking relationships
- Due dates or time estimates in hours
- Syncing tasks to external tools (Linear, Asana, Notion)
- Task progress tracking or burndown
- Subtasks or nested task hierarchies
- Linking tasks back to source notes visually (arrows, references)

---

## 11. Success Metrics

| Metric | Target | Why |
|--------|--------|-----|
| **Task relevance** | >90% of generated tasks are genuinely actionable | Validates AI is extracting real work, not filler |
| **Adoption rate** | >30% of users who organize also create tasks | Shows the organize → tasks pipeline works |
| **Task completion rate** | >50% of created tasks get checked off (once checkboxes ship) | Proves tasks are scoped well and useful |
| **Time to first task** | <3 seconds from button click | Maintains the fast, fluid Klad experience |

---

## 12. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Tasks are too vague ("Do the thing") | Medium | High | Strong prompt engineering with verb+noun examples; iterate on prompt |
| Everything marked "high priority" | Medium | Medium | Prompt instructs to distribute priorities realistically |
| Non-actionable content not detected | Low | Low | Clarification message fallback; teach users to select action-oriented notes |
| Users want checkbox interaction immediately | High | Medium | Ship task creation first; checkbox is a fast follow-up (separate PR) |
| Effort estimates feel arbitrary | Medium | Low | Frame as rough sizing, not commitments; use T-shirt sizes not hours |

---

## 13. Recommended Build Sequence

1. **Add response type** to `lib/ai/serialize-canvas.ts`
2. **Define Gemini system prompt** with task extraction logic + examples
3. **Wire new API route** `POST /api/klad/create-tasks` with structured output schema
4. **Add "Create Tasks" menu item** to `KladAiButton.tsx` dropdown
5. **Implement `handleCreateTasks`** in `Canvas.tsx` — call API, create styled stickies, position & animate
6. **Test end-to-end** — select organized notes, click Create Tasks, verify output quality
7. **Type-check** — `npx tsc --noEmit` passes

---

## 14. Future: Task Checkbox Interaction (v1.1)

Once task creation ships, the next step is making task cards interactive:
- Click checkbox → toggle checked/unchecked state
- Checked tasks get strikethrough text styling
- State persists in canvas save (stored in sticky text or as node metadata)
- This is a separate implementation task, not part of this PRD

---

## Document Maintenance

This document is the **living spec** for the Create Tasks feature. Update it as decisions change during implementation.

**Last rule:** _Keep tasks simple. If it feels like project management software, you've gone too far. Klad is a thinking tool that happens to track execution — not the other way around._
