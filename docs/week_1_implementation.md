# Week 1 Implementation Plan — Detailed Steps
## Canvas Foundations & Authentication

**Target:** Deploy a working Next.js app on Vercel with user authentication, database persistence, and a basic tldraw canvas.

**Estimated Pace:** 5–6 days with AI coding assistant
**Status:** Ready to assign to Claude Code
**Key Constraint:** All steps must result in working, deployed code (no partial implementations).

---

## Step 1: Project Setup & Environment Configuration

### Objective
Create a new Next.js 16 project, link it to Vercel, configure environment variables, and establish the project structure for rapid AI-assisted development.

### What We Want

#### 1.1 Next.js App Creation
- Fresh Next.js 16 project using TypeScript
- Project name: `klad`
- Directory structure ready for Week 1 features
- Git initialized and first commit made

#### 1.2 Vercel Project Linking
- Project linked to Vercel
- Environment variables synced locally via `vercel env pull`
- Deployment pipeline ready (no deploy yet, just verified it works)

#### 1.3 Environment Variables Setup
Local and Vercel environments configured with stubs for:
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Anthropic: `ANTHROPIC_API_KEY`
- Stripe: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`
- App: `NEXT_PUBLIC_APP_URL` (for redirects, share links)

All keys initially set to placeholder values (to be filled in as infrastructure is set up).

#### 1.4 Configuration Files
- `vercel.ts` — Vercel config (Next.js framework, no environment variable overrides yet)
- `tailwind.config.ts` — Tailwind extended with Klad brand colors/tokens
- `tsconfig.json` — Strict TypeScript (strictNullChecks, noImplicitAny enabled)
- `.env.local` — Git-ignored, contains local dev keys

#### 1.5 Project Structure Ready for Week 1
```
klad/
├── app/
│   ├── (auth)/              # Auth routes (created in Step 3)
│   ├── (app)/               # App routes (created in Step 5-6)
│   ├── api/                 # API routes (created in Step 4)
│   ├── layout.tsx           # Root layout (created in Step 6)
│   └── page.tsx             # Landing (redirect to /projects or /auth/login)
├── components/              # UI components (created in Step 5-6)
├── lib/
│   ├── supabase.ts          # Supabase clients (created in Step 2)
│   ├── db.ts                # Database helpers (created in Step 4)
│   ├── auth.ts              # Auth helpers (created in Step 3)
│   └── canvas.ts            # Canvas utilities (created in Step 5)
├── middleware.ts / proxy.ts # Auth middleware (created in Step 3)
├── vercel.ts                # Vercel config
├── tailwind.config.ts       # Tailwind config
├── tsconfig.json            # TypeScript config
├── package.json             # Dependencies (tailwind, supabase, tldraw, etc.)
└── docs/                    # Documentation folder (already created)
```

### How It Must Work

**Step 1 Output:**
- `npm install` succeeds (all dependencies resolved)
- `npm run dev` starts without errors
- `vercel link` completes and connects to a Vercel project
- `vercel env pull` retrieves environment variable stubs
- `.env.local` exists with all required keys (placeholder values OK)
- Git repo initialized with clean initial commit
- No TypeScript errors in IDE

### Dependencies
None (this is the bootstrap step).

### Success Criteria
- [ ] `npm run dev` starts and loads `http://localhost:3000` (blank page OK)
- [ ] `vercel link` confirms Vercel project created
- [ ] `.env.local` has all 7 required keys (SUPABASE_URL, SUPABASE_KEY, ANTHROPIC_API_KEY, STRIPE_PUBLISHABLE, STRIPE_SECRET, APP_URL, and one placeholder)
- [ ] `npm run build` completes without TypeScript errors
- [ ] Git log shows initial commit
- [ ] Project structure matches expected layout above (folders may be empty)

### Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| `npm install` fails (peer dependency conflict) | Low | Review error message, try `npm install --legacy-peer-deps` if needed |
| TypeScript strict mode errors | Low | Ensure `tsconfig.json` uses recommended settings; fix later if needed |
| Vercel linking fails (no account/org) | Low | Ensure Vercel account exists and user is logged in (`vercel login`) |
| `.env.local` accidentally committed | Medium | Verify `.gitignore` includes `.env.local` before first commit |

### Time Estimate
**0.5 day** with AI coding assistant

---

## Step 2: Supabase Infrastructure Setup

### Objective
Set up Supabase project, create database schema (profiles, projects, canvas_state, ai_usage, share_links), implement RLS policies, and establish database migration strategy.

### What We Want

#### 2.1 Supabase Project Provisioning
- Supabase project created in the Klad organization
- Project URL noted: `https://<project>.supabase.co`
- Service role key generated and stored securely
- Anon key generated (for client access, if needed later)

#### 2.2 Database Schema Creation
Complete SQL schema with:
- `auth.users` table (managed by Supabase Auth, read-only from our code)
- `public.profiles` table (user_id PK FK, email, plan, stripe_customer_id, stripe_subscription_id, timestamps)
- `public.projects` table (id, user_id FK, name, is_public, timestamps)
- `public.canvas_state` table (id, project_id FK UNIQUE, tldraw_state JSONB, updated_at)
- `public.ai_usage` table (id, user_id FK, month_reset_date, calls_count, UNIQUE constraint on user+month)
- `public.share_links` table (id, project_id FK, share_token UUID UNIQUE, expires_at, deprecated_at, created_by FK, view_count, last_accessed_at)
- All tables have proper timestamps, indexes on FKs, and constraints

#### 2.3 Row-Level Security (RLS) Policies
All tables have RLS enabled with policies enforcing:
- Users see only their own profiles
- Users see only their own projects, projects they created
- Users can create/update/delete only their own data
- Share links can be read via share_token (no auth required for reading public canvas)
- AI usage queries are user-scoped

#### 2.4 Database Triggers
- `handle_new_user()` trigger: creates profiles row when auth.users row created
- `enforce_free_project_limit()` trigger: prevents free-tier users from creating 4th project

#### 2.5 Migration Strategy
- SQL migrations stored in `lib/db/migrations/` folder
- Each migration numbered and versioned (001_init_schema.sql, 002_add_triggers.sql)
- Migration script or manual execution process documented
- Supabase Studio can verify schema visually

#### 2.6 Supabase Client Setup in Code
- `lib/supabase.ts` exports two clients:
  - `createClient()` for server components (uses service role key for admin operations)
  - `createBrowserClient()` for client components (uses anon key, respects RLS)
- Both clients initialized with project URL and keys from environment

### How It Must Work

**Detailed Requirements:**

**Schema Integrity:**
- All tables use UUIDs for IDs (except user_id which FK to auth.users)
- Foreign keys use `ON DELETE CASCADE` for data cleanup
- Text/Email fields have constraints (NOT NULL, UNIQUE where appropriate)
- Timestamps default to NOW() and auto-update
- JSONB columns (tldraw_state) unindexed by default (can add GIN index later)

**RLS Policies Behavior:**
- SELECT on profiles: `auth.uid() = user_id` (users see only self)
- INSERT on projects: `auth.uid() = user_id` (enforce on creation)
- SELECT on projects: `auth.uid() = user_id` (users see only their projects)
- UPDATE on canvas_state: only if project is user's
- DELETE on projects: cascade deletes canvas_state and ai_usage
- Share links: public read (no auth required), but only if not deprecated and not expired

**Triggers Behavior:**
- When user signs up (auth.users created), profiles row auto-created with plan='free'
- When user tries to INSERT into projects with plan='free' and already has 3 projects, trigger raises error (prevents creation)

**Database Consistency:**
- No orphaned records (all FKs enforced)
- No data leakage between users (RLS blocks all cross-user access)
- Month_reset_date always UTC format (YYYY-MM-01)
- Share tokens are UUIDs (cryptographically secure, no guessing)

### Dependencies
- Step 1 must be complete (env vars must exist, even if placeholder)
- Supabase account/organization must exist

### Success Criteria
- [ ] Supabase project created and accessible
- [ ] All 6 tables exist in Supabase Studio
- [ ] All foreign keys have correct constraints (ON DELETE CASCADE)
- [ ] All RLS policies applied and enabled (verified in Studio)
- [ ] `handle_new_user()` trigger exists and fires on auth.users INSERT
- [ ] `enforce_free_project_limit()` trigger exists
- [ ] Query test: INSERT auth.users → profiles row auto-created
- [ ] Query test: Try to create 4th project as free user → error raised
- [ ] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY added to `.env.local`
- [ ] `lib/supabase.ts` compiles without TypeScript errors
- [ ] `createClient()` and `createBrowserClient()` exported and ready to use

### Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| RLS policies too permissive → users see each other's data | Medium | Write and test with 2+ auth.users. Use Studio to verify row visibility. |
| FK constraint breaks data deletion → orphaned records | Low | Test cascade deletion: delete project → verify canvas_state also deleted |
| Trigger doesn't fire → profiles not created on sign-up | Medium | Manually test: insert into auth.users → check profiles table |
| Month_reset_date in wrong timezone → usage counter off by a day | Low | Always use UTC format (YYYY-MM-01). Never rely on local time. |
| Share token collision → multiple links with same token | Very Low | UUID UNIQUE constraint prevents this. |

### Time Estimate
**1 day** with AI coding assistant

---

## Step 3: Authentication System (Sign-Up, Login, Logout, Middleware)

### Objective
Implement email-based magic link authentication using Supabase Auth, create UI flows for sign-up and login, set up Next.js 16 auth middleware (proxy.ts), and enable authenticated user access throughout the app.

### What We Want

#### 3.1 Supabase Auth Configuration
- Email provider enabled (magic links, no passwords)
- Confirmation emails configured (or disabled for dev, enabled for prod)
- Email templates customized with Klad branding (optional for MVP, can be default)
- Redirect URLs configured: `http://localhost:3000/auth/callback` (dev) and production domain

#### 3.2 Auth Middleware (proxy.ts for Next.js 16)
- Middleware at project root (`proxy.ts`, NOT in `app/` directory)
- Checks session on every request
- Redirects unauthenticated users to `/auth/login`
- Exempts public routes: `/auth/login`, `/auth/signup`, `/auth/callback`, `/`, `/shared/*` (read-only canvas)
- Sets `auth` context available in Server Components and Route Handlers
- No console errors, silent redirect (user sees login page)

#### 3.3 Auth Helpers (lib/auth.ts)
Functions:
- `getSession()` — returns current session or null
- `getCurrentUser()` — returns user profile (from profiles table) or null
- `signOut()` — signs user out and clears session
- `redirectIfNotAuthenticated()` — helper for Server Components (throws redirect if no session)
- All helpers are async

#### 3.4 Sign-Up Page (`app/(auth)/signup/page.tsx`)
- Form with single email input
- Submit button labeled "Send Magic Link"
- Loading state during submission
- Success message: "Check your email for a sign-in link"
- Link to login page at bottom (for existing users)
- Basic styling (Tailwind, dark mode, matches Klad branding)
- No TypeScript errors
- Sends POST to `/api/auth/signup`

#### 3.5 Login Page (`app/(auth)/login/page.tsx`)
- Form with single email input
- Submit button labeled "Send Magic Link"
- Loading state during submission
- Success message: "Check your email for a sign-in link"
- Link to sign-up page at bottom (for new users)
- Basic styling (matches sign-up page)
- Sends POST to `/api/auth/login` (or shared `/api/auth/magic-link`)

#### 3.6 Auth Callback Handler (`app/(auth)/callback/page.tsx`)
- Handles OAuth callback from Supabase (magic link verification)
- Extracts session from URL query params
- Sets session cookie
- Redirects to `/projects` on success
- Shows error message if callback fails
- Silent redirect (user sees minimal UI)

#### 3.7 API Routes
- `app/api/auth/signup/route.ts` — Accepts POST with email, calls `supabase.auth.signUp()`, returns JSON
- `app/api/auth/login/route.ts` — Accepts POST with email, calls `supabase.auth.signInWithOtp()`, returns JSON
- Both routes handle errors gracefully (return 400 with error message, not 500)
- No sensitive data in responses (never return API keys or tokens)

#### 3.8 Auth Layout (`app/(auth)/layout.tsx`)
- Centered card layout (400px wide)
- Klad logo or title at top
- Form renders inside centered card
- Dark background (matches landing page if available)
- Responsive (card stays centered on mobile)

#### 3.9 Logout Button
- Added to header (created in Step 6)
- Calls `signOut()` and redirects to `/auth/login`
- Visible only when authenticated
- Labeled "Sign Out"

### How It Must Work

**Sign-Up Flow:**
1. User visits `/auth/signup`
2. Enters email and clicks "Send Magic Link"
3. Frontend calls POST `/api/auth/signup` with { email }
4. Backend calls `supabase.auth.signUp({ email })`
5. Supabase sends magic link email to user
6. Page shows success message: "Check your email"
7. User clicks link in email
8. Redirected to `/auth/callback?code=XXX`
9. Callback page verifies session and redirects to `/projects`
10. User sees projects list (authenticated)

**Login Flow:**
- Identical to sign-up, but uses `signInWithOtp()` instead of `signUp()`

**Middleware Behavior:**
- User navigates to `/projects` without being authenticated
- `proxy.ts` intercepts, checks session
- Session missing → redirects to `/auth/login`
- User sees login page
- After authentication, proxy allows access to `/projects`

**Logout Behavior:**
- User clicks "Sign Out" in header
- Calls `signOut()` → clears session
- Redirects to `/auth/login`
- Session removed, next request to `/projects` redirects to login

### Dependencies
- Step 1: Project structure exists
- Step 2: Supabase project created, profiles table ready

### Success Criteria
- [ ] Can sign up with new email → receives magic link email
- [ ] Magic link in email is clickable and redirects to callback
- [ ] After callback, session is set and user can access `/projects`
- [ ] Unauthenticated users cannot access `/projects` (redirected to `/auth/login`)
- [ ] Sign-in with existing email works (magic link received)
- [ ] Logout button clears session and redirects to `/auth/login`
- [ ] No TypeScript errors in IDE
- [ ] `proxy.ts` is at project root (same level as `app/`)
- [ ] Public routes (/, /shared/*, /auth/*) accessible without authentication
- [ ] `lib/auth.ts` exports all helper functions
- [ ] No console errors during auth flow
- [ ] User profile (from profiles table) accessible via `getCurrentUser()`

### Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Middleware in wrong location → `auth()` fails | Medium | Double-check `proxy.ts` is at project root, NOT in `app/` |
| Supabase magic link email goes to spam | Low | Test with real email. Check Supabase email logs. |
| Session persists after logout → user still authenticated | Low | Verify `signOut()` clears cookie. Test in incognito window. |
| CORS errors on auth requests | Low | Supabase handles CORS automatically. If error, check URL config. |
| Callback page crashes → infinite redirect loop | Low | Test callback URL manually. Verify session extraction works. |
| TypeScript errors in auth flow | Low | Ensure Supabase client is properly typed. Import from correct package. |

### Time Estimate
**1.5 days** with AI coding assistant

---

## Step 4: Projects & Canvas Data Layer (API Routes)

### Objective
Create REST API endpoints for managing projects and canvas state, implement database queries using Supabase client, and ensure all endpoints enforce user ownership and return proper error codes.

### What We Want

#### 4.1 Projects CRUD API
**GET `/api/projects`**
- Returns list of all projects for authenticated user
- Response: `{ projects: [{ id, name, is_public, createdAt, updatedAt }] }`
- Status 200 on success, 401 if not authenticated

**POST `/api/projects`**
- Accepts JSON: `{ name: string }`
- Creates new project for authenticated user
- Checks freemium limit (app-level, before DB insert)
- If free tier and already has 3 projects: returns 403 with message
- On success: returns created project object with id
- Status 201 on success, 403 on limit, 400 on bad input, 401 if not authenticated

**GET `/api/projects/[id]`**
- Returns single project details
- Verifies ownership (only user who created project can view)
- Returns 404 if project not found or not owned by user
- Response: `{ id, name, is_public, createdAt, updatedAt }`

**PUT `/api/projects/[id]`**
- Accepts JSON: `{ name?: string, is_public?: boolean }`
- Updates project metadata
- Verifies ownership
- Returns updated project object
- Status 200 on success, 403 if not owned, 404 if not found

**DELETE `/api/projects/[id]`**
- Deletes project and all related data (cascade)
- Verifies ownership
- Returns 204 (no content) on success
- Returns 403 if not owned, 404 if not found

#### 4.2 Canvas State API
**GET `/api/canvases/[projectId]`**
- Returns canvas state for a project
- Verifies user owns project
- Response: `{ projectId, tldrawState: {...}, updatedAt }`
- Returns null/empty state if no canvas_state row yet (first load)
- Status 200, 401, 403, 404

**POST `/api/canvases/[projectId]`**
- Accepts JSON: `{ tldrawState: object }`
- Saves/updates canvas state (upsert)
- Verifies user owns project
- Large payloads should work (tldraw state can be several MB)
- Returns saved state object
- Status 200 on success, 401, 403, 404

#### 4.3 API Route Patterns
All endpoints:
- Check authentication (get session via `auth()`)
- Check resource ownership (if accessing a project/canvas, verify user_id matches)
- Return proper HTTP status codes (200, 201, 400, 401, 403, 404, 429)
- Return JSON responses (even errors: `{ error: "message" }`)
- Log errors to console (for debugging)
- Handle Supabase errors gracefully (no stack traces in response)

#### 4.4 Database Query Helpers (lib/db.ts)
Functions:
- `getProjectsByUser(userId)` — returns all projects for user
- `createProject(userId, name)` — creates project (no free tier check here, app-level only)
- `getProject(projectId, userId)` — returns project if user owns it, throws error otherwise
- `deleteProject(projectId, userId)` — deletes project and cascading data
- `getCanvasState(projectId, userId)` — returns canvas state or empty object
- `saveCanvasState(projectId, userId, state)` — upsert canvas state
- `getProjectCount(userId)` — returns total projects for user (for freemium check)
- All async, all throw errors with descriptive messages

#### 4.5 Ownership Verification Helper (lib/auth-middleware.ts)
Function:
- `verifyOwnership(resourceId, resourceType, userId)` — generic helper
- Verifies user owns the resource (project, canvas, etc.)
- Returns resource object if owned, throws error if not
- Used by multiple endpoints to reduce duplication

### How It Must Work

**Project Creation Example Flow:**
1. Authenticated user POSTs to `/api/projects` with `{ name: "Q1 Plan" }`
2. Route handler calls `auth()` to get session
3. Calls `getProjectCount(userId)` → returns 3 (user has 3 projects already)
4. User is free tier (checked from profiles table)
5. Limit reached → returns 403: `{ error: "Free tier limited to 3 projects" }`
6. If user was Pro or had <3 projects, calls `createProject(userId, name)`
7. Supabase creates row in projects table
8. Returns 201: `{ id: "uuid", name: "Q1 Plan", is_public: false, createdAt, updatedAt }`

**Canvas Save Example Flow:**
1. User (authenticated) POSTs to `/api/canvases/[projectId]` with large tldraw state JSON
2. Route handler verifies user owns project (calls `verifyOwnership()`)
3. If not owned, returns 403
4. Calls `saveCanvasState(projectId, userId, state)`
5. Supabase upserts into canvas_state table
6. Returns 200: `{ projectId, tldrawState: {...}, updatedAt }`

**Ownership Verification:**
- Every endpoint that accesses a user's resource explicitly checks ownership
- Example: GET `/api/projects/abc123` for user xyz
  - Query: `SELECT * FROM projects WHERE id = 'abc123' AND user_id = 'xyz'`
  - If no result, return 404 (not found)
  - If result found, return project data

### Dependencies
- Step 1: Project structure exists
- Step 2: Database schema with projects, canvas_state, ai_usage tables
- Step 3: Authentication working, `auth()` available in route handlers

### Success Criteria
- [ ] GET `/api/projects` returns user's projects list (empty on first call)
- [ ] POST `/api/projects` creates new project and returns 201
- [ ] POST `/api/projects` with 4th project on free tier returns 403
- [ ] GET `/api/projects/[id]` returns project details
- [ ] GET `/api/projects/[wrong-id]` returns 404
- [ ] PUT `/api/projects/[id]` updates project name
- [ ] DELETE `/api/projects/[id]` removes project and cascades (verify canvas_state deleted)
- [ ] POST `/api/canvases/[projectId]` saves large JSON state (>1MB)
- [ ] GET `/api/canvases/[projectId]` returns saved state
- [ ] Unauthenticated requests return 401
- [ ] Cross-user access attempts (user A accessing user B's project) return 403 or 404
- [ ] No sensitive data in error responses (never return API keys)
- [ ] All endpoints return proper JSON content-type
- [ ] `lib/db.ts` exports all helper functions
- [ ] No TypeScript errors

### Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| User A accesses User B's project (ownership check missing) | Medium | Test every endpoint with 2 auth.users. Try accessing other user's data. |
| Canvas state truncated on save (payload too large) | Low | Test with 5MB+ tldraw state. Supabase handles this, but verify. |
| Freemium check bypassed (user creates 4th project) | Medium | Test: sign up, create 3 projects, try 4th → should fail. |
| Cascade delete doesn't work (orphaned canvas_state after project delete) | Low | Delete project, verify canvas_state row is gone. |
| Supabase queries slow (no indexes) | Low | Add indexes on user_id FKs (done in Step 2 schema). |
| API returns 500 errors (unhandled exceptions) | Low | Wrap Supabase calls in try-catch. Return proper error responses. |

### Time Estimate
**1 day** with AI coding assistant

---

## Step 5: Canvas UI & tldraw Integration

### Objective
Build the canvas editor component using tldraw, create the canvas editor page (`/projects/[id]`), implement real-time canvas state syncing, and establish the core interaction model.

### What We Want

#### 5.1 tldraw Canvas Component (`components/Canvas.tsx`)
- Renders `<Tldraw>` component with dark theme
- Loads initial canvas state from props
- Syncs changes to Supabase (debounced, 2 seconds)
- Shows loading indicator during sync
- Shows error toast if sync fails (allows user to retry)
- Gracefully handles missing state (renders empty canvas on first load)
- User can:
  - Create sticky notes (text, free-form)
  - Add images (upload or paste)
  - Draw connector lines between nodes
  - Delete/move/resize nodes
  - Select multiple nodes
  - Zoom and pan
- Canvas persists across page reload (loads from Supabase)

#### 5.2 Canvas Editor Page (`app/(app)/projects/[id]/page.tsx`)
- Fetches project details (name, ownership)
- Fetches canvas state from `/api/canvases/[id]`
- Renders `<Canvas>` component
- Passes initial state and projectId as props
- Handles 404 if project doesn't exist
- Handles 403 if user doesn't own project
- Shows loading state while fetching
- Returns to project list if unauthorized

#### 5.3 Canvas Auto-Save Logic
- Debounced (2 seconds) — multiple rapid edits coalesce into one save
- After user stops editing for 2s, sends POST to `/api/canvases/[id]`
- Optimistic update (UI updates immediately, no wait for server response)
- On save failure:
  - Shows error toast: "Failed to save canvas. Retrying..."
  - Queues failed save in memory
  - Retries silently after 5 seconds
  - If 3 retries fail, shows persistent alert asking user to reload page
- No data loss (save queue persists failed updates)

#### 5.4 Canvas Serialization Utilities (lib/canvas.ts)
Functions:
- `serializeCanvasState(tlState)` — takes tldraw state object, returns JSON-serializable copy
- `deserializeCanvasState(json)` — takes JSON from database, returns tldraw state object
- `canvasStateIsEmpty(state)` — checks if canvas has no nodes
- Handles edge cases (missing shapes, malformed state, etc.)

#### 5.5 Styling & Theming
- Dark background (matches Klad branding)
- tldraw toolbar visible and functional
- No jarring white flashes on load
- Error toasts styled consistently
- Loading spinner visible during save

#### 5.6 Error Handling
- Network error while loading → show "Failed to load canvas. Refresh page."
- Network error while saving → show "Failed to save. Will retry." (auto-retry)
- Project not found → show 404 page
- User not authorized → show 403 page (redirect to /projects)
- No console errors on normal usage

### How It Must Work

**First Load:**
1. User navigates to `/projects/abc123`
2. Page fetches project details and canvas state
3. tldraw component mounts with empty state
4. User can immediately start adding nodes
5. After 2s of inactivity, canvas state is synced to `/api/canvases/abc123`
6. Success → silent (no notification)
7. Failure → toast: "Failed to save. Retrying..."
8. On refresh, canvas state reloads from database (persistence works)

**Editing & Saving:**
1. User adds sticky note "Buy milk"
2. tldraw state object changes
3. Component's onChange triggers debounce timer (2s)
4. User adds second sticky note "Fix bug"
5. Debounce resets (timer extends to 2s from now)
6. User stops editing
7. After 2s, debounce fires → POST /api/canvases/abc123 with full tldraw state
8. Request succeeds (200) → silent
9. If request fails (500) → toast and auto-retry

**Zoom/Pan:**
- User can zoom in/out via mouse wheel or toolbar
- Canvas stays responsive (no lag)
- Zoom level is preserved in tldraw state and persisted

**Image Upload:**
- User clicks "Add image" or pastes image into canvas
- Browser file dialog opens
- User selects image file
- Image uploaded (where? to Supabase Storage? or as data URL?)
  - **For MVP:** Store as data URL in tldraw state (simpler, works, not ideal for large images)
  - **Risk:** Large canvases with many images become slow
  - **Future:** Move to Supabase Storage and store URL in state
- Image appears on canvas
- On save, full tldraw state (including image data URL) persists

### Dependencies
- Step 1: Project structure exists
- Step 2: Database schema ready
- Step 3: Authentication working
- Step 4: API routes for canvas state working

### Success Criteria
- [ ] Canvas loads and renders empty on first visit to `/projects/[id]`
- [ ] Can create sticky notes by clicking canvas
- [ ] Can draw connector lines between nodes
- [ ] Can upload and paste images
- [ ] Can move/delete/resize nodes
- [ ] Canvas automatically saves after 2 seconds of inactivity
- [ ] On page reload, canvas state persists (loads from database)
- [ ] Multiple rapid edits coalesce into single save (debounce works)
- [ ] Network error shows toast and auto-retries
- [ ] 3 failed retries show persistent alert to user
- [ ] No TypeScript errors in IDE
- [ ] No console errors during normal use
- [ ] Dark theme is applied (matches Klad branding)
- [ ] Large state objects (>1MB) save successfully

### Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Canvas doesn't save (no POST to API) | Medium | Check browser Network tab. Verify debounce timer. Test manually. |
| tldraw state corrupts on serialize/deserialize | Low | Test with various shapes (text, images, connectors). Verify JSON round-trip. |
| Images cause memory issues (large data URLs) | Low | Limit to MVP (data URL). Add migration to Supabase Storage in v1.1. |
| Debounce fires too frequently (too many saves) | Low | Test with rapid edits. Monitor API calls in Network tab. Adjust debounce time if needed. |
| User loses work (save fails and user refreshes) | Medium | Implement save queue. Show persistent error if 3 retries fail. Document to user. |
| tldraw library breaks on upgrade | Low | Pin tldraw version in package.json. Test before upgrading. |

### Time Estimate
**1.5 days** with AI coding assistant

---

## Step 6: Projects Management UI & App Layout

### Objective
Create the projects list page, implement the app header, build the root layout with navigation, and establish the visual foundation for the entire app.

### What We Want

#### 6.1 Projects List Page (`app/(app)/projects/page.tsx`)
- Displays all user's projects in a grid or list
- Each project card shows:
  - Project name (editable via click or modal)
  - Last modified date
  - "Edit Canvas" button
  - "Delete" button (with confirmation)
  - "Share" button (opens share link modal, or navigates to settings)
- "New Project" button at top
  - If user at project limit (3 on free tier), button is disabled with tooltip
  - On click, opens modal to enter project name
  - Creates project via POST `/api/projects`
  - Navigates to canvas editor on success
- Empty state: "No projects yet. Create one to get started."
- Loading state while fetching projects
- Error state: "Failed to load projects. Refresh page."

#### 6.2 Header Component (`components/Header.tsx`)
- Fixed at top of page
- Dark background, clean design
- Left side: Klad logo (clickable, goes to `/projects`)
- Center: Project name (if on canvas editor page)
- Right side:
  - Link to Account/Billing page (or "Account" button)
  - "Sign Out" button
- Responsive: hamburger menu on mobile (out of scope for MVP, but structure ready)
- Logout calls `signOut()` and redirects to `/auth/login`

#### 6.3 Root App Layout (`app/(app)/layout.tsx`)
- Wraps all authenticated pages
- Renders `<Header>` component
- Renders `<main>` area for page content
- Implements global styles and dark theme
- Breadcrumb or navigation context (if needed)

#### 6.4 Root Layout (`app/layout.tsx`)
- Wraps entire app (auth + app routes)
- Sets up Tailwind, fonts, global styles
- Renders `<html>` and `<body>` tags
- Includes any global providers (if needed later)
- No layout code here (delegated to child layouts)

#### 6.5 Home Page Redirect (`app/page.tsx`)
- If user is authenticated: redirect to `/projects`
- If user is not authenticated: redirect to `/auth/login`
- This handles `/` landing page traffic

#### 6.6 Branding & Styling
- Dark mode as default (dark background, light text)
- Klad brand colors in Tailwind config (already done in Step 1)
- Consistent spacing and typography
- Buttons, inputs, cards styled with Tailwind
- No hardcoded colors (use Tailwind tokens)
- Responsive design (mobile-friendly, not perfect but usable)

#### 6.7 UI Components (as needed)
- `components/Button.tsx` — reusable button with variants (primary, secondary, danger)
- `components/Card.tsx` — project card with grid layout
- `components/Modal.tsx` — modal dialog (for create project, confirm delete)
- `components/Toast.tsx` — toast notifications (for errors, success)
- `components/Spinner.tsx` — loading indicator
- All components unstyled initially (use Tailwind), can add shadcn/ui later

### How It Must Work

**Projects List Page:**
1. User signs in and navigates to `/projects`
2. Page loads, shows spinner while fetching
3. Projects list appears (empty on first user)
4. User clicks "New Project"
5. Modal opens: "Enter project name"
6. User types "My First Canvas"
7. Clicks "Create"
8. POST `/api/projects` is called
9. If successful (free tier check passes):
   - Modal closes
   - New project appears in list
   - Page navigates to `/projects/[id]` (canvas editor)
10. If failed (project limit reached):
    - Toast shows: "Free tier limited to 3 projects. Upgrade to Pro."
    - Modal stays open
    - "New Project" button is disabled

**Project Card Actions:**
- "Edit Canvas" → navigates to `/projects/[id]`
- "Delete" → shows confirmation modal "Delete project? This cannot be undone."
  - "Cancel" or "Delete" button
  - On confirm, calls DELETE `/api/projects/[id]`
  - On success, card disappears from list
  - On failure, toast shows error
- "Share" → navigates to `/projects/[id]/settings` (created later, or link not active yet)

**Header Logout:**
1. User clicks "Sign Out"
2. Calls `signOut()` → clears session
3. Redirects to `/auth/login`
4. Session is gone, navigation to `/projects` redirects back to login

### Dependencies
- Step 1: Project structure exists
- Step 3: Authentication working
- Step 4: API routes for projects CRUD working
- Step 5: Canvas editor page working (so "Edit Canvas" link works)

### Success Criteria
- [ ] Projects list page loads and displays user's projects
- [ ] "New Project" button creates project and navigates to editor
- [ ] "New Project" button disabled if user at limit (free tier)
- [ ] "Delete" button removes project from list
- [ ] "Delete" shows confirmation modal
- [ ] "Edit Canvas" button navigates to `/projects/[id]`
- [ ] Header displays on all authenticated pages
- [ ] "Sign Out" button clears session and redirects to login
- [ ] Dark theme is applied globally
- [ ] Responsive on mobile (basic mobile layout works)
- [ ] No TypeScript errors in IDE
- [ ] No console errors during normal use
- [ ] Empty state displays when user has no projects
- [ ] Error state displays if projects fetch fails

### Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Navigation doesn't work (links broken) | Low | Test all links: "New Project", "Edit Canvas", "Delete", "Sign Out" |
| Freemium button disable logic wrong (user can create 4th) | Low | Test with 3 projects. Try clicking "New Project" button. Should be disabled. |
| Delete confirmation doesn't work (project deletes without prompt) | Low | Test delete. Modal must appear and require confirmation. |
| Header doesn't persist (visible on one page, not another) | Low | Verify Header is in `app/(app)/layout.tsx`, not in individual pages. |
| Logout doesn't work (user still authenticated) | Low | After logout, refresh page. Should redirect to `/auth/login`. |
| Mobile layout broken (overflowing text, tiny buttons) | Low | Test on mobile view (DevTools). Buttons should be tappable (44px+). |

### Time Estimate
**1 day** with AI coding assistant

---

## Summary of Week 1

**Total Estimated Time:** 5–6 days with AI coding assistant

**Completion Criteria:**
- [ ] Step 1: Project scaffold deployed to Vercel
- [ ] Step 2: Database schema created with RLS policies
- [ ] Step 3: Authentication flow working (sign-up, login, logout)
- [ ] Step 4: API routes for projects and canvas CRUD working
- [ ] Step 5: Canvas editor with tldraw integration working
- [ ] Step 6: Projects list and app layout complete
- [ ] All 6 success criteria checklists completed
- [ ] No critical TypeScript errors
- [ ] App is deployable to production (npm run build succeeds)
- [ ] Can sign up, create project, use canvas, log out, and return to login

**What Works by End of Week 1:**
✅ User can sign up with email
✅ User can log in with magic link
✅ User can create up to 3 projects (free tier)
✅ User can open canvas and edit
✅ Canvas auto-saves every 2 seconds
✅ Canvas persists across page reload
✅ User can delete projects
✅ User can log out
✅ All data isolated by user (RLS)
✅ App is deployed to Vercel (production-like)

**What Does NOT Work Yet (for Week 2+):**
❌ AI features (Organize, To Tasks, Critical Questions, Free Prompt)
❌ Monetization (Stripe, freemium gating, usage tracking)
❌ Sharing (shareable links)
❌ Accounts/Billing page

---

## Notes for AI Coding Assistant

When Claude Code takes on these steps:

1. **Work step-by-step** — don't skip steps or combine them further
2. **Test as you go** — after each major feature (auth, CRUD, UI), test manually before moving on
3. **Follow the spec exactly** — if something isn't in "What We Want", don't add it
4. **Ask for clarification** — if requirements are ambiguous, ask before implementing
5. **Commit frequently** — commit after each step completes (e.g., "Step 3: Authentication system complete")
6. **Use the success criteria** — check off each item as you verify
7. **Report risks** — if you encounter any risk from the risk register, let Lars know

**Recommended Workflow:**
- Step 1: 0.5 day
- Step 2: 1 day
- Step 3: 1.5 days
- Step 4: 1 day
- Step 5: 1.5 days
- Step 6: 1 day
- **Total: 6.5 days** (can compress to 5–6 with parallelization)

If stuck, refer back to `implementation_plan.md` for Week 1 details and `corrections_and_clarifications.md` for technical decisions.
