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

Klad is a Next.js 16 app. The entry point (`app/page.tsx`) immediately redirects to `/projects` or `/auth/login` based on auth state.

### Route structure

```
app/
  (app)/projects/           → projects list (server component, needs auth)
  (app)/projects/[id]/      → canvas page (server component, needs auth)
  auth/login|signup/        → magic-link auth pages (outside route group = /auth/* URLs)
  auth/callback/            → Supabase PKCE code exchange
  api/projects/             → GET list, POST create (free-tier limit enforced)
  api/projects/[id]/        → GET, PUT, DELETE single project
  api/canvases/[projectId]/ → GET canvas state, POST save canvas state
  api/auth/login|signup/    → POST magic-link email dispatch
proxy.ts                    → route protection (Next.js 16 middleware, replaces middleware.ts)
```

The `(app)` route group strips the segment from URLs. The `auth/` directory (no parens) keeps `/auth/*` URLs.

### Auth flow

`proxy.ts` intercepts every non-static request. Public routes are `/`, `/auth/*`, `/api/auth/*`, `/shared/*` — everything else requires a valid session. The proxy calls `supabase.auth.getUser()` (never `getSession()`) to refresh and validate the JWT.

Magic-link signup creates a Supabase Auth user and auto-creates a `profiles` row via a DB trigger. The PKCE code from the email link is exchanged in `app/auth/callback/route.ts` → redirects to `/projects`.

All server-side auth calls go through `lib/auth.ts → getUser()`. Never use `getSession()` on the server — it doesn't validate with Supabase's servers.

### Data layer

`lib/db.ts` contains all Supabase queries. Every query uses `createServerSupabaseClient()` (RLS-enforced) and always filters by `user_id` explicitly — dual enforcement against unauthorized access.

`getCanvasState(projectId, userId)` throws `"Project not found"` if the project doesn't exist/isn't owned, and returns `null` if the project exists but has no canvas row yet. The canvas API (`app/api/canvases/[projectId]/route.ts`) distinguishes these: `null` → 200 with empty state, throw → 404.

The free-tier limit (3 projects) is enforced at two layers:
1. Application layer in `POST /api/projects` (checks plan + count before insert)
2. Database trigger `check_project_limit` (raises `'Free tier limited to 3 projects...'`)

The API catches the trigger error message prefix `"Free tier limited"` to return 403 instead of 500 on race conditions.

### Canvas (custom engine)

The canvas uses a custom SVG-based engine (no external canvas library). Core types live in `lib/canvas/types.ts`, state management in `lib/canvas/reducer.ts`, geometry helpers in `lib/canvas/geometry.ts`. The main `components/Canvas.tsx` is a `"use client"` orchestrator that composes sub-components from `components/canvas/`.

Supported node types: text, sticky, rect, ellipse, freehand, arrow, image. Tools: select, text, sticky, rect, ellipse, freehand, arrow, image. Pan/zoom via wheel/trackpad/spacebar+drag. Undo/redo via Cmd+Z/Cmd+Shift+Z (snapshot stack, 50 entries max).

The canvas background (`components/canvas/Background.tsx`) uses an adaptive multi-level dot grid: a logarithmic grid-level system picks a world-space spacing so screen-space dot spacing stays in the 18–36px range regardless of zoom. Near level transitions, two grid layers crossfade for smooth continuity. Dot radius is fixed at 1.2px screen-space.

The canvas autosaves with 2-second debounce. On save failure it retries up to 3 times (5-second delay). The autosave hook lives in `lib/canvas/hooks.ts`.

#### Text Editing in Nodes (rect, ellipse, sticky)

Text input in rect and ellipse nodes follows the same pattern as sticky nodes for consistency:
- Textarea is wrapped in a **centered flex container** (`display: flex; alignItems: center; justifyContent: center`) so text appears centered from the moment the user starts typing
- `useLayoutEffect` measures `textarea.scrollHeight` and dynamically adjusts height to show all content (no hidden rows)
- If text exceeds available space, the node auto-scales via an `onResize` callback passed from the parent; the callback dispatches an `UPDATE_NODE_SIZE` action to expand the node

This ensures visual consistency and prevents layout surprises when editing.

#### Shape Drag-to-Create Behavior

When creating a rect or ellipse via drag-to-create, the shape must behave exactly like resizing an existing shape via its edge/corner handles:
- **Free-form aspect ratio** — shapes are not forced into squares; width and height are independent
- **Drag from any direction** — drag right/down, left/up, or diagonally
- **Opposite corner/edge as anchor** — if dragging from top-left toward bottom-right, the bottom-right corner stays fixed (and vice versa)
- **Geometry normalized by `normalizeRect`** — `lib/canvas/geometry.ts:normalizeRect()` takes potentially negative width/height and returns a canonical AABB (axis-aligned bounding box). This function drives both the visual preview (via `shapePreview` state) and the final committed shape

Both `handlePointerMove` (for preview) and `handlePointerUp` (for commit) use `normalizeRect` output directly—do not override with forced square logic. The preview renders a semi-transparent rect/ellipse overlay on the canvas during drag.

#### Canvas Menu (CanvasMenu.tsx)

The three-dot menu button (`components/canvas/CanvasMenu.tsx`) provides canvas-wide actions: edit (undo/redo/select all/delete/duplicate), view (zoom), and export (PNG/SVG). The button is positioned with `position: fixed; top: 12px; left: 110px;` to sit **right next to the Klad logo** (which occupies the top-left header area).

**Important layout note:** Fixed-position UI elements need to account for the header/logo area. The logo takes ~100px of horizontal space from the left. Any new fixed-position buttons should use `left >= 110px` to avoid collisions.

### Design system

The app uses the editorial palette defined in `app/globals.css`:

- `--klad-ink` (#1a1814) / `--klad-ink2` (#3d3a35) / `--klad-ink3` (#7a756e)
- `--klad-paper` (#f7f4ef) / `--klad-paper2` (#ede9e2) / `--klad-paper3` (#e3ddd5)
- `--klad-yellow` (#f5e642)
- Fonts: Playfair Display (`--font-playfair`, serif/headings), DM Sans (`--font-dm-sans`, body), IBM Plex Mono (`--font-ibm-plex-mono`, labels/metadata)
- Card style: 1px black border + 4px offset box-shadow (`box-shadow: 4px 4px 0 var(--klad-ink)`)

Cards, buttons, and modals use inline styles referencing these CSS variables rather than Tailwind classes, since the design is bespoke to the landing-page brand identity.

Tailwind v4 is configured via `@theme inline` in `globals.css` — there is no `tailwind.config.ts`.

### Database schema

Five tables: `profiles` (billing state, auto-created on signup), `projects`, `canvas_state` (one jsonb row per project, upserted on save), `ai_usage` (monthly counter), `share_links` (read-only shareable canvas links with tokens and expiration). All have RLS enabled. Migrations live in `lib/db/migrations/`.

`canvas_state` stores the custom canvas document as jsonb in the `canvas_data` column. `lib/canvas.ts:deserializeCanvasState()` validates the schema (version, camera, nodes, nodeOrder).

### Environment variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY   # server-only, admin client
NEXT_PUBLIC_APP_URL         # used for magic-link emailRedirectTo
```

## Common Patterns & Gotchas

### Text Input in Shapes (rect, ellipse)

**Pattern:** Text is rendered in a `foreignObject` container with a `<textarea>`. The textarea must:
- Be wrapped in a **flex container with centered alignment** (even if text appears single-line initially)
- Have its height adjusted dynamically in `useLayoutEffect` based on `textarea.scrollHeight`
- Trigger an `onResize` callback if content exceeds the node's bounds
- Use the node's `stroke` color (not a separate text color)

**Gotcha:** If the textarea is not centered initially, text appears above the node and "jumps" to center on blur. Always start with centered alignment.

### Shape Resizing & Creation Geometry

**Pattern:** Both resize handles and drag-to-create shapes use `normalizeRect(x, y, w, h)` from `lib/canvas/geometry.ts`. This function:
- Accepts potentially negative width/height (from dragging in any direction)
- Returns a canonical AABB with `{ x, y, width, height }` (all positive, top-left as origin)

**Gotcha:** Do NOT override `normalizeRect` output with forced constraints (e.g., `const side = Math.max(w, h)` for squares). The function already handles all drag directions. Only call `normalizeRect` and use its output directly.

### Canvas Preview Overlays

**Pattern:** When dragging to create or manipulate shapes, render a semi-transparent preview (via `shapePreview` state) before committing. The preview should:
- Update on every `pointerMove` (driven by preview geometry, not final state)
- Clear on `pointerUp` (after the commit is done)
- Use the same geometry calculation as the final shape (no separate preview logic)

**Gotcha:** Preview geometry and final geometry must be identical. If they diverge, the user sees the preview move/jump unexpectedly when the shape commits.

### Fixed-Position UI Layout

**Pattern:** Fixed-position UI elements (buttons, menus, controls) sit at the top-left or top-right of the viewport. The Klad logo occupies the top-left header area (~100px width).

**Gotcha:** Fixed-position elements must account for the logo. The three-dot menu uses `left: 110px` to sit next to the logo without collision. Any new fixed-position buttons should use:
- `left >= 110px` if placed in the top-left area (next to logo)
- Use `right: Xpx` for top-right area buttons (no collision risk)

**Prevention:** When adding new fixed-position UI, visualize where the logo is (top-left, ~100px wide) and position your element accordingly. Check for overlap on the actual running page.

## Before Starting Work

1. **Read the code you're about to modify** — don't propose changes to files you haven't read
2. **Understand the existing patterns** — this codebase has established conventions (centered text in nodes, normalized geometry, RLS-enforced queries)
3. **Test your changes** — run `npm run dev` and verify the dev server starts and the feature works
4. **Check for TypeScript errors** — run `npx tsc --noEmit` before committing
