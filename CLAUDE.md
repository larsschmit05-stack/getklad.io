# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

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

Supported node types: text, sticky, rect, ellipse, freehand. Tools: select, text, sticky, rect, ellipse, draw. Pan/zoom via wheel/trackpad/spacebar+drag. Undo/redo via Cmd+Z/Cmd+Shift+Z (snapshot stack, 50 entries max).

The canvas autosaves with 2-second debounce. On save failure it retries up to 3 times (5-second delay). The autosave hook lives in `lib/canvas/hooks.ts`.

### Design system

The app uses the editorial palette defined in `app/globals.css`:

- `--klad-ink` (#1a1814) / `--klad-paper` (#f7f4ef) / `--klad-yellow` (#f5e642)
- Fonts: Playfair Display (`--font-playfair`, serif/headings), DM Sans (`--font-dm-sans`, body), IBM Plex Mono (`--font-ibm-plex-mono`, labels/metadata)
- Card style: 1px black border + 4px offset box-shadow (`box-shadow: 4px 4px 0 var(--klad-ink)`)

Cards, buttons, and modals use inline styles referencing these CSS variables rather than Tailwind classes, since the design is bespoke to the landing-page brand identity.

Tailwind v4 is configured via `@theme inline` in `globals.css` — there is no `tailwind.config.ts`.

### Database schema

Four tables: `profiles` (billing state, auto-created on signup), `projects`, `canvas_state` (one jsonb row per project, upserted on save), `ai_usage` (monthly counter). All have RLS enabled. Migrations live in `lib/db/migrations/`.

`canvas_state` stores the custom canvas document as jsonb in the `canvas_data` column. `lib/canvas.ts:deserializeCanvasState()` validates the schema (version, camera, nodes, nodeOrder).

### Environment variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY   # server-only, admin client
NEXT_PUBLIC_APP_URL         # used for magic-link emailRedirectTo
```
