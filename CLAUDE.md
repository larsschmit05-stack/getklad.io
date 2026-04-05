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
  (app)/projects/           → projects list (server component, needs auth)
  (app)/projects/[id]/      → canvas page (server component, needs auth)
  auth/                     → combined login/signup page (tabbed, email+password)
  auth/login|signup/        → redirects to /auth (legacy URLs)
  auth/callback/            → Supabase email confirmation code exchange
  api/projects/             → GET list, POST create (free-tier limit enforced)
  api/projects/[id]/        → GET, PUT, DELETE single project
  api/canvases/[projectId]/ → GET canvas state, POST save canvas state
  api/auth/login/           → POST email+password sign-in (signInWithPassword)
  api/auth/signup/          → POST email+password sign-up (signUp, sends confirmation email)
proxy.ts                    → route protection (Next.js 16 middleware, replaces middleware.ts)
```

The `(app)` route group strips the segment from URLs. The `auth/` directory (no parens) keeps `/auth/*` URLs.

### Auth flow

`proxy.ts` intercepts every non-static request. Public routes are `/`, `/auth`, `/auth/*`, `/api/auth/*`, `/shared/*` — everything else requires a valid session. The proxy calls `supabase.auth.getUser()` (never `getSession()`) to refresh and validate the JWT.

**Login**: `POST /api/auth/login` with `{ email, password }` → calls `supabase.auth.signInWithPassword()` → returns session directly (no email step). The client does a hard navigation (`window.location.href = "/projects"`) to ensure cookies propagate.

**Signup**: `POST /api/auth/signup` with `{ email, password }` → calls `supabase.auth.signUp()` with `emailRedirectTo` → sends confirmation email. The PKCE code from the email is exchanged in `app/auth/callback/route.ts` → redirects to `/projects`. Signup auto-creates a `profiles` row via a DB trigger.

The auth UI (`app/auth/page.tsx` + `app/auth/auth-form.tsx`) is a single page with tabbed login/signup forms, styled with the Klad editorial palette. The background (`app/auth/auth-background.tsx`) shows an animated SVG canvas scene with a cursor drag-selecting post-its and AI sorting them by theme.

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

#### Arrow Connections & Shape Creation

**Click vs Drag behavior (all creation tools):**
- **Click** (no drag) → element with fixed default size, independent of zoom
- **Drag** (>4px movement) → element sized by drag extent, use `normalizeRect()` to handle any direction
- Critical state: `hasMoved` flag must be set in `handlePointerMove` during "create-shape" mode when drag distance > 4px (bug pattern: was only set in "move" mode, breaking drag-to-create)

**Arrow snap zones & connection feedback:**
- Snap zone: 60px center-distance radius from target node
- When snapped: blue border highlight on target node + gray "×" marker at node center (not edge)
- Drop inside snap → connected arrow (fromNodeId + toNodeId set)
- Drop outside snap → free arrow with stored dx/dy vector (matches Figma behavior)

**Arrow preview consistency:**
- Endpoints calculated via `getBBoxEdgePoint(node, toward)` pointing toward final endpoint (not cursor)
- Use `strokeLinecap: "butt"` (not "round") to prevent optical warping on dashed arrows
- Preview and final must use identical geometry — divergence causes visual jump on commit

#### Canvas Menu (CanvasMenu.tsx)

The three-dot menu button (`components/canvas/CanvasMenu.tsx`) provides canvas-wide actions: edit (undo/redo/select all/delete/duplicate), view (zoom), and export (PNG/SVG). The button is positioned with `position: fixed; top: 12px; left: 110px;` to sit **right next to the Klad logo** (which occupies the top-left header area).

**Important layout note:** Fixed-position UI elements need to account for the header/logo area. The logo takes ~100px of horizontal space from the left. Any new fixed-position buttons should use `left >= 110px` to avoid collisions.

#### Image Crop Overlay (ImageCropOverlay.tsx)

The crop overlay renders as a fixed-position HTML layer on top of the canvas image node. It has two coordinate spaces:
- **World space** (`cropBox.x/y/width/height`): used in the SVG viewBox for dark overlay + blue outline
- **Screen space** (`cropBox * zoom` = `cx/cy/cw/ch`): used for HTML handle positioning

**Corner handles** use CSS border L-shapes that wrap the **outside** of each image corner like photo-mount brackets. Each corner uses two borders that match the corner's character shape:

| Corner | Borders | Position (left, top) | Arms extend |
|--------|---------|---------------------|-------------|
| TL `┌` | `border-top + border-left` | `cx - lineWidth, cy - lineWidth` | → right along top, ↓ down along left |
| TR `┐` | `border-top + border-right` | `cx + cw - armLength, cy - lineWidth` | ← left along top, ↓ down along right |
| BL `└` | `border-bottom + border-left` | `cx - lineWidth, cy + ch - armLength` | → right along bottom, ↑ up along left |
| BR `┘` | `border-bottom + border-right` | `cx + cw - armLength, cy + ch - armLength` | ← left along bottom, ↑ up along right |

Each div is `(armLength + lineWidth) × (armLength + lineWidth)` with `box-sizing: border-box`. The `lineWidth` offset in the position ensures the border sits on the **outside** of the image edge, not inside it.

**Edge handles** (T/B/L/R) are small bars flush against the outside of each edge, centered on the midpoint. Each has a larger invisible hit area (`hitArea` px) with the visible bar aligned toward the image edge via flexbox (`align-items: flex-end` for top, `flex-start` for bottom, etc.).

**Gotcha — CSS border direction vs. L-shape orientation:** CSS `border-top` draws at the **top** of the div and `border-left` at the **left**. The L-corner where they meet is at the **top-left** of the div. To wrap the outside of TL, you need `border-top + border-left` with the div offset by `-lineWidth` so the border's outer edge sits just outside the image. Do NOT swap border sides (e.g., using `border-bottom + border-right` for TL) — that puts the L-corner at the opposite end of the div, making it float away from the image corner.

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
NEXT_PUBLIC_APP_URL         # used for signup emailRedirectTo
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

### Shape Creation: hasMoved State Tracking

**Pattern:** ALL shape creation tools distinguish click (fixed size) from drag (custom size) via `hasMoved` state set in `handlePointerMove`:
- Calculate drag distance in screen-space: `dx = (clientX - dragStartX) / zoom; dy = (clientY - dragStartY) / zoom`
- Set `hasMoved = true` when `Math.abs(dx) > 4 || Math.abs(dy) > 4`
- On `pointerUp`: if hasMoved=false, create default size; if true, use drag-derived dimensions

**Gotcha:** `hasMoved` must be set in the SPECIFIC drag mode (create-shape, move, etc.), not just in one place. Bug pattern: hasMoved was only set in "move" mode, causing drag-to-create to always produce default-size shapes.

### Arrow Connection: Endpoint Consistency

**Pattern:** Arrow endpoints use `getBBoxEdgePoint(node, toward)` in both preview and final rendering, pointing toward the opposite endpoint (not cursor):
- Source: `getBBoxEdgePoint(fromNode, targetX, targetY)` — points toward target edge
- Target (snapped): `getBBoxEdgePoint(targetNode, sourceCenterX, sourceCenterY)` — points back toward source
- Stroke: `strokeLinecap: "butt"` (never "round" — prevents dashed arrow warping)

**Gotcha:** If preview uses different endpoint logic than final rendering, user sees jump/warp on commit. Always use `getBBoxEdgePoint` for both.

### Image Crop Handle Positioning

**Pattern:** Corner crop handles are CSS `div` elements with two borders forming an L-shape. The L wraps the **outside** of the image corner — arms run along the outer edges of the image. All positions are computed from `cropBox × zoom` so they're fully dynamic.

**Critical rule — border side = div side:** For TL corner (`┌`), use `border-top + border-left`. The CSS border is drawn at the **same side of the div as its name** — `border-top` is at the top, `border-left` is at the left. They meet at the div's **top-left** corner. Position the div at `(cx - lineWidth, cy - lineWidth)` so its top-left corner aligns with the image corner, with the border sitting just outside the image edge.

**Gotcha — swapping borders inverts the L:** Using `border-bottom + border-right` for TL puts the L-corner at the div's **bottom-right** — the opposite end from where the image corner is. This makes the handle float away from the corner entirely. Each corner must use the borders matching its position name (TL = top+left, TR = top+right, BL = bottom+left, BR = bottom+right).

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
