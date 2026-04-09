# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server (localhost:3000)
npm run build     # production build (also type-checks)
npm run lint      # ESLint
npx tsc --noEmit  # type-check only
```

There are no automated tests.

## Architecture

Klad is a Next.js 16 app. The entry point (`app/page.tsx`) immediately redirects to `/projects` or `/auth` based on auth state.

### Route structure

```
app/
  (app)/projects/              → projects list (server component, needs auth)
  (app)/projects/[id]/         → canvas page (server component, needs auth)
  auth/                        → combined login/signup page (tabbed, email+password)
  auth/login|signup/           → redirects to /auth (legacy URLs)
  auth/callback/               → Supabase email confirmation code exchange
  api/projects/                → GET list, POST create
  api/projects/[id]/           → PUT, DELETE single project
  api/canvases/[projectId]/    → POST save canvas state
  api/auth/login/              → POST email+password sign-in
  api/auth/signup/             → POST email+password sign-up
  api/feedback/                → POST user feedback
  api/klad/chat/               → POST general AI instruction (any skill type)
  api/klad/organize/           → POST organize notes into groups
  api/klad/critical-questions/ → POST generate critical questions
  api/klad/create-tasks/       → POST extract tasks from notes
  api/klad/usage/              → GET remaining AI calls
proxy.ts                       → route protection (Next.js 16 middleware)
```

The `(app)` route group strips the segment from URLs. The `auth/` directory (no parens) keeps `/auth/*` URLs.

### Auth flow

`proxy.ts` intercepts every non-static request. Public routes are `/`, `/auth`, `/auth/*`, `/api/auth/*`, `/shared/*` — everything else requires a valid session. The proxy calls `supabase.auth.getUser()` (never `getSession()`) to refresh and validate the JWT.

**Login**: `POST /api/auth/login` with `{ email, password }` → `supabase.auth.signInWithPassword()` → returns session. Client does hard navigation (`window.location.href = "/projects"`) to ensure cookies propagate.

**Signup**: `POST /api/auth/signup` → `supabase.auth.signUp()` with `emailRedirectTo` → sends confirmation email. PKCE code exchanged in `app/auth/callback/route.ts` → redirects to `/projects`. Signup auto-creates a `profiles` row via a DB trigger.

All server-side auth calls go through `lib/auth.ts → getUser()`. Never use `getSession()` on the server.

### Data layer

`lib/db.ts` contains all Supabase queries. Every query uses `createServerSupabaseClient()` (RLS-enforced) and always filters by `user_id` explicitly.

`getCanvasState(projectId, userId)` throws `"Project not found"` if the project doesn't exist/isn't owned, and returns `null` if the project exists but has no canvas row yet. The canvas API distinguishes these: `null` → 200 with empty state, throw → 404.

AI usage is limited to 20 calls/day by default (`DAILY_AI_LIMIT` in `lib/constants.ts`). Per-user overrides are stored in `profiles.daily_ai_limit` (NULL = default 20, -1 = unlimited, N = custom limit). The `increment_ai_usage` RPC function provides atomic daily counter increments. No project creation limits are enforced.

Input length limits: `MAX_PROJECT_NAME_LENGTH = 200`, `MAX_AI_INSTRUCTION_LENGTH = 2000`, `MAX_FEEDBACK_LENGTH = 5000`.

### Canvas (custom engine)

The canvas uses a custom SVG-based engine (no external canvas library). Core types live in `lib/canvas/types.ts`, state management in `lib/canvas/reducer.ts`, geometry helpers in `lib/canvas/geometry.ts`. The main `components/Canvas.tsx` is a `"use client"` orchestrator that composes sub-components from `components/canvas/`.

Supported node types: text, sticky, rect, ellipse, freehand, arrow, image. Tools: select, text, sticky, rect, ellipse, freehand, arrow, image. Pan/zoom via wheel/trackpad/spacebar+drag. Undo/redo via Cmd+Z/Cmd+Shift+Z (snapshot stack, 50 entries max).

The canvas background (`components/canvas/Background.tsx`) uses an adaptive multi-level dot grid: a logarithmic grid-level system picks a world-space spacing so screen-space dot spacing stays in the 18–36px range regardless of zoom. Near level transitions, two grid layers crossfade for smooth continuity. Dot radius is fixed at 1.2px screen-space.

The canvas autosaves with 2-second debounce. On save failure it retries up to 3 times (5-second delay). The autosave hook lives in `lib/canvas/hooks.ts`.

#### Canvas document structure

```typescript
type CanvasDocument = {
  version: 1;
  camera: { x, y, zoom };
  nodes: Record<string, CanvasNode>;
  nodeOrder: string[];     // z-order back → front
  connectors: Record<string, Connector>;
};
```

`lib/canvas.ts:deserializeCanvasState()` validates the schema on load. `nodeOrder` drives z-order — use the reducer's `BRING_TO_FRONT` / `SEND_TO_BACK` actions rather than mutating it directly.

#### Key reducer actions

`lib/canvas/reducer.ts` handles: `CREATE_NODE`, `UPDATE_NODE_PROPS`, `UPDATE_NODE_TEXT`, `UPDATE_NODE_SIZE`, `MOVE_NODES`, `RESIZE_NODE`, `DUPLICATE_NODES`, `DELETE_NODES`, `ALIGN_NODES`, `BRING_TO_FRONT`, `SEND_TO_BACK`, `SELECT_NODES`, `SET_MARQUEE`, `APPLY_ORGANIZE` (AI results), `UNDO`, `REDO`, `PUSH_UNDO`.

#### Text Editing in Nodes (rect, ellipse, sticky)

Text input in rect and ellipse nodes follows the same pattern as sticky nodes:
- Textarea is wrapped in a **centered flex container** so text appears centered from the moment typing starts
- `useLayoutEffect` measures `textarea.scrollHeight` and dynamically adjusts height
- If text exceeds available space, the node auto-scales via an `onResize` callback that dispatches `UPDATE_NODE_SIZE`

**Gotcha:** If the textarea is not centered initially, text appears above the node and "jumps" to center on blur. Always start with centered alignment.

#### Shape Drag-to-Create Behavior

When creating a rect or ellipse via drag-to-create:
- **Free-form aspect ratio** — width and height are independent
- **Geometry normalized by `normalizeRect`** — `lib/canvas/geometry.ts:normalizeRect()` takes potentially negative width/height and returns a canonical AABB. This drives both the visual preview (`shapePreview` state) and the final committed shape

**Gotcha:** Do NOT override `normalizeRect` output with forced square logic. Both `handlePointerMove` (preview) and `handlePointerUp` (commit) use `normalizeRect` output directly.

#### Arrow Connections & Shape Creation

**Click vs Drag behavior (all creation tools):**
- **Click** (no drag) → element with fixed default size, independent of zoom
- **Drag** (>4px movement) → element sized by drag extent
- `hasMoved` flag must be set in `handlePointerMove` during "create-shape" mode when drag distance > 4px (bug pattern: if only set in "move" mode, drag-to-create always produces default-size shapes)

**Arrow snap zones:**
- Snap zone: 60px center-distance radius from target node
- Drop inside snap → connected arrow (`fromNodeId` + `toNodeId` set); drop outside → free arrow with `dx/dy` vector
- Endpoints use `getBBoxEdgePoint(node, toward)` in both preview and final rendering — divergence causes a visible jump on commit
- Use `strokeLinecap: "butt"` (not "round") to prevent optical warping on dashed arrows

#### Canvas Menu (CanvasMenu.tsx)

The three-dot menu (`components/canvas/CanvasMenu.tsx`) is at `position: fixed; top: 12px; left: 110px`. The Klad logo takes ~100px of horizontal space from the left.

**Gotcha:** Any new fixed-position buttons in the top-left area must use `left >= 110px`. Use `right: Xpx` for top-right elements.

#### Image Crop Overlay (ImageCropOverlay.tsx)

The crop overlay has two coordinate spaces:
- **World space** (`cropBox.x/y/width/height`): SVG viewBox for dark overlay + blue outline
- **Screen space** (`cropBox × zoom`): HTML handle positioning

Corner handles are CSS L-shapes. **Each corner uses the borders matching its position name** (TL = `border-top + border-left`, TR = `border-top + border-right`, BL = `border-bottom + border-left`, BR = `border-bottom + border-right`). The div is offset by `-lineWidth` so the border sits outside the image edge.

**Gotcha:** Swapping border sides (e.g., `border-bottom + border-right` for TL) puts the L-corner at the opposite end of the div — the handle floats away from the image corner entirely.

### AI system

The AI system runs on **Google Gemini 2.5 Flash** via Vercel AI SDK. Model and per-request limits are in `lib/ai/config.ts` (`AI_CONFIG.model`, `AI_CONFIG.maxSelectedNodes = 50`). All AI routes share two middleware helpers from `lib/ai/route-utils.ts`: `requireAuth()` and `checkAiUsage()`.

#### Skills

Each skill lives in `lib/ai/skills/<name>/` with two files:
- `system-prompt.ts` — exports `SYSTEM_PROMPT`
- `schema.ts` — exports a Zod schema for structured output

| Skill | Route | Output |
|-------|-------|--------|
| chat | `/api/klad/chat` | `type` + `items[]` + optional `editNodes[]` + `chatMessage` |
| organize | `/api/klad/organize` | `groups[]` (with `nodeIds`, `label`, `color`) + `orphans[]` |
| critical-questions | `/api/klad/critical-questions` | `domain`, `questions[]` (single sentence each), `clarificationMessage` |
| create-tasks | `/api/klad/create-tasks` | `tasks[]` (title, description, priority, effort) |
| summarize | (via chat) | summary text |

The **chat skill** is the most general — it can return `type: "groups" | "tasks" | "questions" | "analysis" | "summary" | "edit" | "error"` and handles all freeform instructions from the AI sidebar.

#### Canvas serialization for AI

`lib/ai/serialize-canvas.ts` produces a compact text representation of canvas state. Token budgets:
- **Chat** (`serializeForChat`): focus nodes (selected, up to 500 chars each) + context nodes (rest, abbreviated). Budget: ~2000 tokens.
- **Organize/tasks/questions** (`serializeForOrganize`): selected nodes (500 chars) + visible nodes (50/20 chars). Budget: ~1200 tokens.

Token estimation: `0.3 tokens/char + 30 char overhead per node`. Nodes are truncated aggressively to stay within budget.

#### Placement on canvas

`lib/ai/place-on-canvas.ts` converts AI responses into `CanvasNode[]` positioned to avoid overlapping existing content. `findFreeArea()` searches for a collision-free position (80px gap, max 50 attempts).

Placement functions:
- `placeGroups()` — groups with colored headers + sticky grid (3 columns per group)
- `placeTasks()` — Kanban board with 4 columns (On hold / To-do / In progress / Done)
- `placeSummary()` — 400px text box with title + wrapped body
- `placeQuestionsOrAnalysis()` — sticky cards at 200×200px with custom layouts:
  - 1: single · 2: side by side · 3: reversed triangle · 4: 2×2 · 5: 2×2 + 5th right-middle · 6: 2×3
- `applyEdits()` — in-place text updates on existing nodes

All functions return `PlacementResult { newNodes, stickyUpdates, outputBounds, useOrganize }`.

#### AI sidebar

`components/canvas/AiSidebar.tsx` is a floating chat window (360px wide). It shows three quick-action buttons ("Organize", "Critical questions", "Create tasks") and a freeform chat input. Selected nodes are the "focus" context; all other visible nodes are "context."

`components/canvas/AiUsageCounter.tsx` shows remaining daily AI calls (e.g. "5/20 AI calls today"). Hidden for unlimited users (`daily_ai_limit = -1`).

### Design system

`app/globals.css` defines all design tokens:

- `--klad-ink` (#1a1814) / `--klad-ink2` (#3d3a35) / `--klad-ink3` (#7a756e)
- `--klad-paper` (#f7f4ef) / `--klad-paper2` (#ede9e2) / `--klad-paper3` (#e3ddd5)
- `--klad-yellow` (#f5e642)
- Fonts: Playfair Display (`--font-playfair`, headings), DM Sans (`--font-dm-sans`, body), IBM Plex Mono (`--font-ibm-plex-mono`, labels)
- Card style: 1px black border + `box-shadow: 4px 4px 0 var(--klad-ink)`

Cards, buttons, and modals use inline styles referencing these CSS variables rather than Tailwind. Tailwind v4 is configured via `@theme inline` in `globals.css` — there is no `tailwind.config.ts`.

The canvas node color palette (12 tones) is defined as `PALETTE` in `lib/canvas/types.ts`.

### Database schema

Five tables: `profiles` (auto-created on signup, has `daily_ai_limit` override column), `projects`, `canvas_state` (one jsonb row per project, upserted on save), `ai_usage` (daily counter with `reset_date`), `share_links` (read-only shareable canvas links). All have RLS enabled. Migrations live in `lib/db/migrations/`.

`canvas_state` stores the canvas document as jsonb in the `canvas_data` column.

### Environment variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY   # server-only (used by migration RPC)
NEXT_PUBLIC_APP_URL         # used for signup emailRedirectTo
```

## Common Patterns & Gotchas

### Shape Resizing & Creation Geometry

`normalizeRect(x, y, w, h)` from `lib/canvas/geometry.ts` accepts potentially negative width/height (from dragging any direction) and returns a canonical AABB. Both resize handles and drag-to-create use it — never override its output with forced constraints like `Math.max(w, h)`.

### Canvas Preview Overlays

Shape creation previews use `shapePreview` state updated every `pointerMove`, cleared on `pointerUp`. Preview and final geometry must use identical calculations — divergence causes a visible jump when the shape commits.

### Arrow Endpoint Consistency

Use `getBBoxEdgePoint(node, toward)` for both preview and final rendering. Source points toward target; target points back toward source. Always `strokeLinecap: "butt"`.

### AI Route Pattern

Every AI route follows this structure:
```typescript
const { userId } = await requireAuth(req);
await checkAiUsage(userId);            // throws 429 if over limit
// ... call AI with generateObject() ...
await incrementAiUsage(userId);
```

### Adding a New AI Skill

1. Create `lib/ai/skills/<name>/system-prompt.ts` and `schema.ts`
2. Add route at `app/api/klad/<name>/route.ts` following the pattern above
3. Add placement logic in `lib/ai/place-on-canvas.ts` if the output appears on canvas
4. Wire into `AiSidebar.tsx` quick actions or chat handler as needed
