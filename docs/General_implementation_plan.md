# Klad Implementation Plan
## MVP — 4 Week Build (Solo with AI Coding Assistant)

**Last Updated:** 2026-03-29
**Status:** Ready to build (corrections merged from review feedback)
**AI Assistant:** Claude Code (Anthropic)
**Stack:** Next.js 16 · Supabase · tldraw · Anthropic API · Stripe

> **⚠️ Version 2:** This document incorporates all 8 corrections from the implementation review:
> - ✅ Canvas-first UX (Organize/To Tasks/Critical Questions on canvas; Free Prompt in sidebar)
> - ✅ Unified billing limit (50/month, not 50/day)
> - ✅ Strict canvas context policy (priority order, 8K token budget, no image binary)
> - ✅ Complete privacy/data policy (included in PRD 7.1)
> - ✅ Explicit auth.users + profiles data model with RLS
> - ✅ Fixed Stripe packages, proper CSRF, Upstash rate limiting
> - ✅ Database trigger for project gating + app-level check
> - ✅ Complete share link security (expiry, rotation, revocation, noindex)

---

## Overview

This document translates the Klad PRD into **actionable implementation tasks**. It assumes heavy reliance on AI-assisted coding for rapid iteration. Each week has clear deliverables, risk mitigations, and specific file/feature targets.

### Key Assumptions
- ✅ PRD validated — waitlist has 50+ signups (go signal received)
- ✅ Infrastructure provisioned — Supabase project, Vercel linked, Stripe account created
- ✅ Design complete — landing page exists (reuse styling, color scheme)
- 🚀 Speed priority — ship working MVP in 4 weeks, polish in v1.1

---

## Week 1: Canvas Foundations & Auth

### Goal
**A deployed Next.js app with working canvas, user auth, and basic persistence.**

### Feature Checklist

#### 1.1 Project Scaffold
- [ ] Create Next.js 16 app: `npx create-next-app@latest klad --typescript`
- [ ] Link to Vercel: `vercel link`
- [ ] Enable environment variable syncing: `vercel env pull`
- [ ] Initialize git + commit scaffold

**Files to create:**
- `vercel.ts` — Vercel config (framework: nextjs)
- `.env.local` — Supabase keys, Anthropic API key
- `tailwind.config.ts` — extend with Klad brand colors (from landing page)

**Risk:** None at scaffold stage. Move fast.

---

#### 1.2 Supabase Integration & Data Model
- [ ] Initialize Supabase client in `lib/supabase.ts`
  - Export `createClient()` for server components
  - Export `createBrowserClient()` for client components
- [ ] Create database schema with explicit `auth.users + public.profiles` pattern:
  - `auth.users` (managed by Supabase Auth, read-only)
  - `public.profiles` (your app's user table: user_id FK, email, plan, stripe fields)
  - `public.projects` (id, user_id FK, name, is_public, created_at, updated_at)
  - `public.canvas_state` (id, project_id FK, tldraw_state JSONB, updated_at)
  - `public.ai_usage` (id, user_id FK, month_reset_date DATE, calls_count INT)
  - `public.share_links` (id, project_id FK, share_token UUID, expires_at, created_by FK, deprecated_at)
- [ ] Set up RLS policies (users can only see their own data, share_links checked via token)
- [ ] Create sign-up trigger: after user created in auth.users, create profiles row
- [ ] Create `app/api/projects` and `app/api/canvases` route handlers for CRUD

**Files to create:**
- `lib/supabase.ts` — Supabase client setup (with helpers)
- `lib/db/schema.sql` — complete database schema with RLS policies and triggers
- `app/api/projects/route.ts` — project CRUD
- `app/api/canvases/[id]/route.ts` — canvas save/load
- `lib/db.ts` — helper functions (getProjects, saveCanvas, checkOwnership, etc.)
- `lib/auth-middleware.ts` — reusable ownership verification helper

**Schema requirements:**
- `public.profiles` is the app-level source of truth for user metadata and billing state
- `public.ai_usage` stores one row per user per UTC calendar month, with a uniqueness constraint on `(user_id, month_reset_date)`
- `public.projects` stores project metadata and ownership
- `public.canvas_state` stores exactly one persisted tldraw document per project
- `public.share_links` stores share tokens, expiry, revocation state, and access counters
- Add an index optimized for monthly usage lookups by `user_id` and `month_reset_date`
- Enable RLS on all user-owned tables
- Add policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE` where needed so users can only access their own records
- `canvas_state` must explicitly allow first-write `INSERT` and later `UPDATE`
- Add a sign-up trigger so creating a row in `auth.users` automatically creates the matching `public.profiles` row

**Risk:** RLS policies wrong → users see each other's data; auth.users/profiles sync broken → missing profiles
- **Mitigation:** Test with 2+ accounts. Verify profiles created on sign-up. Test RLS in Studio.

---

#### 1.3 Authentication
- [ ] Set up Supabase Auth (email + magic link)
- [ ] Create auth middleware (`proxy.ts` for Next.js 16)
- [ ] Build login page (`app/auth/login/page.tsx`)
- [ ] Build sign-up page (`app/auth/signup/page.tsx`)
- [ ] Add logout button to header
- [ ] Create `lib/auth.ts` helper (getSession, getCurrentUser, etc.)

**Files to create:**
- `proxy.ts` — auth middleware (check session, redirect to /auth/login if missing)
- `app/auth/layout.tsx` — auth page layout
- `app/auth/login/page.tsx` — email magic link form
- `app/auth/signup/page.tsx` — sign-up form
- `lib/auth.ts` — auth helpers

**Risk:** Middleware in wrong location (Next.js 16) → auth() fails
- **Mitigation:** Verify `proxy.ts` is at project root (same level as `app/`).

---

#### 1.4 tldraw Canvas Integration
- [ ] Install tldraw: `npm install tldraw`
- [ ] Create canvas component (`components/Canvas.tsx`)
  - Wraps `<Tldraw>` with dark theme
  - Syncs canvas state to `canvas_state` table on change (debounced, 2s)
  - Loads saved state on mount
- [ ] Create projects list page (`app/projects/page.tsx`)
  - List user's projects
  - "New Project" button
  - Click to open canvas
- [ ] Create canvas editor page (`app/projects/[id]/page.tsx`)
  - Loads project + canvas state
  - Renders `<Canvas>` component
  - Auto-save every 2 seconds

**Files to create:**
- `components/Canvas.tsx` — tldraw wrapper
- `app/projects/page.tsx` — projects list
- `app/projects/[id]/page.tsx` — canvas editor
- `app/projects/[id]/layout.tsx` — editor layout (header with project name)
- `lib/canvas.ts` — canvas serialization helpers

**Risk:** Auto-save too frequent → API overload. Debounce at 2s.
- **Mitigation:** Test with rapid edits. Monitor Supabase API quota.

---

#### 1.5 Basic UI Shell
- [ ] Create header component (`components/Header.tsx`)
  - Logo + project name
  - Logout button
  - Link to dashboard
- [ ] Create sidebar stub for Week 2 Klad AI
- [ ] Dark mode setup (Tailwind + shadcn/ui tokens if using)
- [ ] Responsive layout (desktop-first, mobile is out of scope)

**Files to create:**
- `components/Header.tsx` — navigation header
- `app/layout.tsx` — root layout with header
- `app/page.tsx` — landing page → redirect to /projects or /auth/login

**Risk:** None. This is straightforward Next.js layout work.

---

### Week 1 Deliverables
✅ Deployed Next.js app on Vercel
✅ User can sign up, log in, create projects
✅ Canvas loads and saves state to Supabase
✅ Basic sticky notes, free text, images work
✅ Multiple projects supported
✅ `api/projects` and `api/canvases` endpoints working

### Week 1 Success Criteria
- [ ] `vercel deploy --prod` succeeds
- [ ] Can create 3+ projects
- [ ] Canvas persists across reload
- [ ] No RLS errors in Supabase logs
- [ ] Page loads in <2s (Vercel Analytics)

**Estimated Time:** 5–6 days with AI coding assistant

---

## Week 2: Klad AI Integration

### Goal
**Full AI context-aware assistant with three canvas-output modes.**

### Feature Checklist

#### 2.1 Canvas Serialization with Strict Context Policy
- [ ] Create `lib/canvas-context.ts`
  - Function `serializeCanvasToContext(state, selectedNodeIds, viewportBounds)` → returns structured context with strict priority order
  - Priority 1: Selected nodes (always included)
  - Priority 2: Connected nodes (1 hop via connectors)
  - Priority 3: Visible nodes (in current viewport)
  - Priority 4: Summarized remainder (if space permits, else dropped)
  - Token budget: 8,000 tokens max (~2,000 words); reduce to 6,000 if images present
  - Images: Include metadata only (filename), NOT binary data
- [ ] Create `lib/canvas-prompts.ts`
  - Prompt templates for each AI mode (Organize, To Tasks, Critical Questions, Free Prompt)
  - System prompt: "You are Klad, an AI assistant for solo builders. You understand canvas-based thinking..."

**Canvas Context Policy (Strict):**
- Serialization must be deterministic
- Priority 1: selected nodes, always included
- Priority 2: nodes connected to the selection by one hop
- Priority 3: nodes visible in the current viewport
- Priority 4: summarized remainder only if token budget permits
- Default token budget is 8,000 tokens, reduced to 6,000 when images are present
- Images contribute metadata only, never binary payloads
- Lower-priority tiers are truncated before higher-priority tiers

**Files to create:**
- `lib/canvas-context.ts` — serialization with priority order and token budget
- `lib/canvas-prompts.ts` — system + mode-specific prompts

**Risk:** Context exceeds token budget → truncate middle tiers
- **Mitigation:** Monitor context size. Log token count for each call. Add telemetry.

---

#### 2.2 Anthropic API Integration
- [ ] Create `lib/anthropic.ts`
  - Initialize Anthropic client with API key from env
  - Helper function `callKladAI(context, prompt, mode)` → returns structured response
  - Handle streaming vs non-streaming (use `streaming=false` for structured JSON modes)
- [ ] Create error handling: graceful fallback if API fails
  - Show toast: "Klad AI unavailable — try again"
  - Canvas still works without AI

**Files to create:**
- `lib/anthropic.ts` — Anthropic client setup
- `lib/api-errors.ts` — error boundary + user-friendly messages

**Risk:** API key exposed in env
- **Mitigation:** Use Vercel environment variables (never commit `.env.local`).

---

#### 2.3 AI Sidebar Component
- [ ] Create `components/KladAISidebar.tsx`
  - Right sidebar (fixed width, 400px)
  - Three mode buttons: **Organize**, **Critical Questions**, **To Tasks**
  - Text input for free prompts
  - Loading state (spinner) during API call
  - Output area (markdown rendering for free prompt mode)
- [ ] Create `components/KladAIOutput.tsx`
  - Renders AI responses (markdown for free prompt, JSON for structured modes)
  - Use shadcn/ui components for polish

**Files to create:**
- `components/KladAISidebar.tsx` — AI sidebar UI
- `components/KladAIOutput.tsx` — output renderer
- `components/ui/Spinner.tsx` — loading indicator

**Risk:** None. Straightforward React component work.

---

#### 2.4 Mode: Organize
- [ ] Create `app/api/ai/organize/route.ts`
  - Accepts POST: `{ context, selectedNodeIds }`
  - Calls Klad AI with "organize" prompt
  - Expects JSON response: `{ groups: [{ label: string, nodeIds: string[] }], positions: {...} }`
  - Returns JSON to client
- [ ] Update `components/Canvas.tsx`
  - Selection tracking (which nodes are selected)
  - "Organize" button in sidebar sends selected nodes to API
  - Response → inject new group nodes into tldraw state
  - Automatically reposition nodes in clusters

**Files to create:**
- `app/api/ai/organize/route.ts` — organize endpoint
- `lib/canvas-inject.ts` — helper to inject nodes into tldraw state

**Prompt requirements:**
- Include the serialized canvas context
- Include the selected node IDs
- Ask the model to produce 2-4 logical clusters
- Require a short label, node membership, and suggested placement for each cluster
- Require structured JSON output

**Risk:** Node injection breaks canvas state → corruption
- **Mitigation:** Test thoroughly. Save before inject, restore on error.

---

#### 2.5 Mode: To Tasks
- [ ] Create `app/api/ai/to-tasks/route.ts`
  - Accepts POST: `{ context, selectedText }`
  - Calls Klad AI with "to-tasks" prompt
  - Expects JSON response: `{ tasks: [{ title, description }], count }`
  - Returns JSON to client
- [ ] Update sidebar
  - "To Tasks" button sends selected text to API
  - Response → inject task nodes onto canvas (with checkboxes or task styling)

**Files to create:**
- `app/api/ai/to-tasks/route.ts` — to-tasks endpoint

**Prompt requirements:**
- Include the serialized canvas context
- Include the selected text fragment
- Ask for specific actionable tasks
- Ask for clear success criteria and effort sizing
- Require structured JSON output

**Risk:** AI returns invalid JSON → parsing fails
- **Mitigation:** Use `try-catch` in API route. Return error if JSON invalid.

---

#### 2.6 Mode: Critical Questions
- [ ] Create `app/api/ai/critical-questions/route.ts`
  - Accepts POST: `{ context }`
  - Calls Klad AI with "critical-questions" prompt
  - Expects JSON response: `{ questions: [string], insights: string }`
  - Returns JSON to client
- [ ] Update sidebar
  - "Critical Questions" button sends full canvas context to API
  - Response → inject question nodes onto canvas (as sticky notes with special styling)

**Files to create:**
- `app/api/ai/critical-questions/route.ts` — critical-questions endpoint

**Prompt requirements:**
- Include the full serialized canvas context
- Ask for 3-5 sharp questions that expose blind spots, risky assumptions, or logical gaps
- Require structured JSON output with `questions` and `insights`

**Risk:** None. Straightforward API endpoint.

---

#### 2.7 Free Prompt Mode (Sidebar Only, Conversational)
- [ ] Create `app/api/ai/free-prompt/route.ts`
  - Accepts POST: `{ context, prompt }`
  - Context: ONLY selected + directly connected nodes (lighter, faster)
  - Calls Klad AI (no structured output, just text)
  - Returns markdown text to client
  - **NOT persisted to canvas** — conversational only
- [ ] Update sidebar
  - Separate section: "Ask Klad" text input at bottom
  - Send button
  - Response rendered as markdown in output area (cleared on next message)
  - Clear visual distinction from "Add to Canvas" modes

**Files to create:**
- `app/api/ai/free-prompt/route.ts` — free-prompt endpoint (lighter context)
- `components/Markdown.tsx` — markdown renderer (use `react-markdown` + code highlight)
- `components/KladAISidebar.tsx` update — separate "Ask Klad" section from action buttons

**Why sidebar-only for free prompts:** Aligns with canvas-first philosophy. Organized/To Tasks/Critical Questions *are* the primary modes; free prompt is for exploratory conversation that doesn't need to persist.

**Risk:** None. Simple text endpoint.

---

#### 2.8 AI Usage Tracking (Monthly Limit)
- [ ] Create `lib/usage.ts`
  - Function `incrementAICall(userId)` → increments monthly counter
  - Check against monthly limit (50 for free tier, unlimited for Pro)
  - Return `{ remaining, isFreeTier, isMonthlyLimitReached }`
  - Month resets on UTC calendar date (e.g., 2026-03-01)
- [ ] Update all AI API routes
  - Check usage before calling Anthropic
  - Return 429 (too many requests) if limit exceeded
  - Show user toast: "Monthly AI limit reached (50). Upgrade to Pro for unlimited."

**Usage data requirements:**
- Usage tracking must be persisted in `ai_usage`
- The source of truth is UTC calendar-month accounting, not rolling windows
- Increment logic must be atomic
- The implementation may use SQL, RPC, or another transactional approach, but it must guarantee correctness under concurrent requests
- Free-tier response payloads must expose remaining monthly calls

**Files to create:**
- `lib/usage.ts` — monthly usage tracking
- `lib/usage-check.ts` — middleware helper for ownership + usage check

**Risk:** Counter resets at wrong time or user downgrade from Pro to Free mid-month
- **Mitigation:** Month always resets on calendar date (UTC). Downgrade doesn't reset; limit applies immediately.

---

### Week 2 Deliverables
✅ Klad AI sidebar fully functional
✅ Canvas serialization working
✅ Organize mode outputs nodes to canvas
✅ To Tasks mode converts text to action items
✅ Critical Questions mode identifies gaps
✅ Free prompt mode for open-ended questions
✅ AI usage tracking (50 calls/month for free tier)
✅ All AI endpoints deployed and tested

### Week 2 Success Criteria
- [ ] All 4 AI modes work end-to-end
- [ ] Selected nodes visibly reorganize on canvas
- [ ] Task nodes appear as new sticky notes
- [ ] Question nodes are injected and visible
- [ ] Free prompt responses render cleanly in sidebar
- [ ] **Monthly limit blocks requests at 50** (not daily)
- [ ] API calls logged to `ai_usage` table with month_reset_date
- [ ] Canvas context truncates at 8,000 tokens

**Estimated Time:** 6–7 days with AI coding assistant

---

## Week 3: Monetization, Sharing & Gating

### Goal
**Freemium model live with Stripe Pro tier, shareable links, and usage dashboard.**

### Feature Checklist

#### 3.1 Freemium Gating (with DB Trigger Enforcement)
- [ ] Add to database schema: trigger to enforce free-tier project limit
  - `enforce_free_project_limit()` trigger on `projects` INSERT
  - Before insert: check user's plan and project count
  - If free plan and count >= 3: raise exception
- [ ] Create `lib/freemium.ts`
  - `canCreateProject(userId)` → app-level check before creation
  - Returns: `{ allowed: boolean, count: int, limit: int, reason?: string }`
  - `hasAIAccess(userId)` → true if Pro or free with calls remaining
  - `getProjectLimit(user)` → returns 3 (free) or unlimited (Pro)
- [ ] Update `app/api/projects/route.ts` (POST)
  - Call `canCreateProject(userId)` and return 403 if limit reached
  - DB trigger provides additional safety
- [ ] Update `app/projects/page.tsx`
  - Disable "New Project" button if user at limit
  - Show modal: "Free tier limited to 3 projects. Upgrade to Pro for unlimited."
- [ ] Update all AI endpoints
  - Check `hasAIAccess` before processing
  - Return 429 if monthly limit reached
  - Show toast: "Monthly AI limit reached (50). Upgrade to Pro for unlimited."

**Gating requirements (both app + DB):**
- Enforce the free-tier 3-project cap at the database layer before insert
- Also enforce the same rule at the application layer for user-facing feedback
- Database enforcement must remain authoritative during concurrent requests
- Existing projects remain accessible after downgrade, but new project creation is blocked immediately for free users above the cap

**Files to create:**
- `lib/freemium.ts` — freemium logic (app-level checks)
- `components/UpgradePrompt.tsx` — modal to prompt upgrade

**Risk:** Race condition (two requests create projects simultaneously); plan downgrade mid-build
- **Mitigation:** DB trigger prevents race conditions. Downgrade blocks new projects immediately (existing projects preserved).

---

#### 3.2 Stripe Setup & Billing Schema
- [ ] Install Stripe library: `npm install stripe`
  - **Note:** No `@stripe/react-js` needed for server-side; only `stripe` package
  - (Client-side Stripe elements if needed in future: `@stripe/stripe-js` + `@stripe/react-stripe-js`)
- [ ] Create `lib/stripe.ts`
  - Initialize Stripe client (secret key from env)
  - Helper `createCheckoutSession(userId)` → returns Stripe checkout URL
  - Helper `retrieveOrCreateCustomer(userId)` → Stripe customer ID
- [ ] Update `profiles` table in Supabase
  - Already have: `stripe_customer_id`, `stripe_subscription_id`, `plan` (free|pro)
  - (Added in 1.2 schema)
- [ ] Create `app/api/stripe/checkout/route.ts`
  - POST endpoint: `{ userId }`
  - Creates Stripe Customer if missing
  - Creates Checkout Session (€19/mo Pro plan)
  - Returns `{ checkoutUrl }`

**Files to create:**
- `lib/stripe.ts` — Stripe client setup
- `app/api/stripe/checkout/route.ts` — checkout endpoint
- `app/api/stripe/webhook/route.ts` — webhook handler (see 3.3)

**Risk:** Webhook key exposed → security issue; customer/subscription sync broken
- **Mitigation:** Store `STRIPE_WEBHOOK_SECRET` in Vercel env vars (never code). Verify webhook signature (see security hardening).

---

#### 3.3 Stripe Webhooks with Signature Verification
- [ ] Create `app/api/stripe/webhook/route.ts`
  - **Verify webhook signature** (required for security)
  - Listen for: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.deleted`
  - Update user's Supabase record: `plan` = "pro" on subscription, "free" on deletion
  - Update `stripe_subscription_id`
  - Log all events for debugging
- [ ] Test webhook locally with Stripe CLI

**Webhook requirements:**
- Verify Stripe webhook signatures before processing any event
- Handle at minimum `checkout.session.completed`, `customer.subscription.created`, and `customer.subscription.deleted`
- Upgrade and downgrade plan state in `public.profiles`
- Keep `stripe_subscription_id` synchronized with Stripe
- Log all webhook events and failures for debugging

**Files to create:**
- `app/api/stripe/webhook/route.ts` — webhook handler with signature verification

**Risk:** Webhook fails → user not upgraded; malicious webhook injection → wrong user upgraded
- **Mitigation:** Always verify signature. Log all events. Monitor Stripe dashboard for delivery status.

---

#### 3.4 Billing & Subscription Page
- [ ] Create `app/account/page.tsx`
  - Display current plan (free or pro)
  - If free: show "Upgrade to Pro (€19/mo)" button → calls `/api/stripe/checkout`
  - If pro: show "Manage Subscription" button → links to Stripe portal
  - Show usage stats: projects count, **AI calls used this month (N / 50 for free)**
  - Show upgrade benefits if free tier
- [ ] Create `lib/stripe-portal.ts`
  - Helper `createPortalSession(userId)` → returns portal URL for managing subscription

**Account page requirements:**
- Free users see usage in the form `N / 50 AI calls used this month`
- Pro users see `Unlimited AI calls`

**Files to create:**
- `app/account/page.tsx` — account/billing page
- `lib/stripe-portal.ts` — portal helper

**Risk:** None. Straightforward UI work.

---

#### 3.5 Shareable Read-Only Links (Complete with Expiry & Rotation)
- [ ] Use `share_links` table from 1.2 schema:
  - Columns: id, project_id, share_token (UUID), created_at, expires_at, deprecated_at, created_by, view_count, can_view
- [ ] Create `app/api/projects/[id]/share/route.ts`
  - POST: generate new share token, create share_links row, return link URL
  - Optional: `expiresInDays` parameter for temporary sharing
  - DELETE: deprecate token (set deprecated_at), immediately revoke access
- [ ] Create `app/projects/[id]/settings/page.tsx`
  - "Generate Share Link" button
  - Display shareable URL: `https://useklad.com/shared/[token]`
  - Copy-to-clipboard button
  - Show: expiration date (if set), view count, last accessed
  - "Rotate Token" button (old links stop working)
  - "Revoke Link" button (immediate)
- [ ] Create `app/shared/[token]/page.tsx`
  - Read-only canvas view
  - Fetch canvas by share_token
  - **DO NOT INDEX:** set `robots: { index: false, follow: false }` in metadata
  - Check: share_token valid, not deprecated, not expired
  - Track view: increment view_count, update last_accessed_at
  - Disable all editing (canvas read-only mode)
- [ ] Create `app/api/images/[id]/route.ts`
  - Image serving endpoint with share token verification
  - Only serve images if share_token valid and can_view = true

**Share link security requirements:**
- Share endpoints must verify project ownership before creating, rotating, or revoking links
- Shared image access must require a valid share token
- Public shared pages must return `noindex` metadata
- Share tokens must be high-entropy UUIDs
- Token rotation must invalidate prior links immediately
- Revoked or expired links must fail closed
- Add `robots.txt` rules to discourage indexing of `/shared/` and `/api/`

**Files to create:**
- `app/api/projects/[id]/share/route.ts` — share token generation, rotation, revocation
- `app/projects/[id]/settings/page.tsx` — share settings UI with expiry/rotation/revocation
- `app/shared/[token]/page.tsx` — public read-only view (noindex)
- `app/api/images/[id]/route.ts` — image serving with token verification
- `public/robots.txt` — prevent indexing of /shared/ and /api/

**Risk:** Shared canvas leaks private images; token brute-forced; crawler indexes shared links
- **Mitigation:** Image URLs require valid share token. UUIDs are 128-bit (no brute-force). `robots.txt` + `noindex` headers prevent indexing.

---

#### 3.6 Usage Dashboard / Analytics
- [ ] Create `app/dashboard/page.tsx`
  - Display stats in cards:
    - Projects count
    - AI calls used this month (N / 50 for free, unlimited for pro)
    - Last canvas edited
    - Upgrade button (if free)
  - Simple bar chart (use `recharts` or similar) for AI calls over time

**Files to create:**
- `app/dashboard/page.tsx` — analytics dashboard
- `components/Chart.tsx` — reusable chart component

**Risk:** None. Dashboard is informational only.

---

### Week 3 Deliverables
✅ Freemium gating enforced (3 projects max on free plan)
✅ Stripe integration live (€19/mo Pro plan)
✅ Webhooks updating user plan in Supabase
✅ Billing page shows usage and upgrade button
✅ Shareable read-only canvas links
✅ Usage dashboard showing AI call trends
✅ Subscription cancellation via Stripe portal

### Week 3 Success Criteria
- [ ] Free user can create 3 projects, 4th blocked with friendly error
- [ ] DB trigger prevents 4th project creation (safety net)
- [ ] Can upgrade via Stripe checkout (€19/mo)
- [ ] Webhook updates plan within 5 seconds
- [ ] Pro user can create unlimited projects
- [ ] Share link generates UUID token and works
- [ ] Public view is read-only (no editing)
- [ ] Shared canvases have `robots: noindex` (not indexed)
- [ ] Share token can be rotated and revoked
- [ ] Usage dashboard shows: "N / 50 calls used this month"
- [ ] Monthly usage limit enforced at API layer

**Estimated Time:** 4–5 days with AI coding assistant

---

## Week 4: Polish, Onboarding & Launch

### Goal
**Production-ready MVP with smooth user experience and zero critical bugs.**

### Feature Checklist

#### 4.1 Onboarding Flow
- [ ] Create `app/onboarding/page.tsx`
  - Step 1: "Intro to Klad" (video or animated walkthrough)
  - Step 2: "Try Organize mode" (sample canvas with tutorial)
  - Step 3: "Try AI" (click Organize button, watch it work)
  - Skip button, "Got it!" at end
  - Never show again (store in localStorage or user preference)
- [ ] Create `components/Onboarding.tsx`
  - Modal that appears for new users on first project
  - Highlight key UI elements

**Files to create:**
- `app/onboarding/page.tsx` — onboarding steps
- `components/Onboarding.tsx` — modal component

**Risk:** Onboarding too long → users skip it
- **Mitigation:** Keep it under 2 minutes. Focus on "AI turns chaos to clarity" message.

---

#### 4.2 Error Handling & Edge Cases
- [ ] Add error boundaries
  - Canvas crash → show "Something went wrong, reload page"
  - API errors → show toast with retry button
- [ ] Handle network failure
  - Auto-save fails → queue changes, retry on reconnect
- [ ] Handle API limits
  - Anthropic rate limit → show user message, queue request
  - Supabase quota → graceful degradation

**Files to create:**
- `components/ErrorBoundary.tsx` — error boundary
- `lib/error-handler.ts` — centralized error handling
- `lib/queue.ts` — request queue for retries

**Risk:** Silent failures → user loses work
- **Mitigation:** Log all errors. Show toast for every API error.

---

#### 4.3 Performance Optimization
- [ ] Optimize canvas rendering
  - Lazy load tldraw (dynamic import)
  - Preload images on canvas
- [ ] Optimize API calls
  - Debounce canvas auto-save (2s)
  - Cancel in-flight requests on unmount
- [ ] Optimize bundle size
  - Check Next.js build output (`vercel build`)
  - Lazy load heavy dependencies (Anthropic, Stripe)

**Files to create:**
- Modifications to `app/projects/[id]/page.tsx` (dynamic imports)

**Risk:** Canvas slow on mobile (though out of scope)
- **Mitigation:** Test on desktop first. Mobile is v2.

---

#### 4.4 Security Hardening (Complete)
- [ ] Review RLS policies (Supabase)
  - All policies in schema (1.2) enforce user ownership
  - Test with 2+ accounts to verify isolation
- [ ] Add auth ownership checks to all API endpoints
  - Pattern: `if (resource.user_id !== session.userId) return forbidden()`
  - Applied to: projects, canvases, ai calls, share links
- [ ] Secure Stripe keys
  - Secret key in env vars only (never client)
  - Webhook secret in env vars only
- [ ] CSRF protection
  - Verify Origin and Referer headers (match current host)
  - Middleware in `middleware/csrf.ts`
- [ ] Rate limiting (Upstash Redis)
  - Install: `npm install @upstash/ratelimit @upstash/redis`
  - Durable across serverless instances (not in-memory)
  - AI calls: coarse abuse protection only; billing limit still enforced via `ai_usage` monthly counter
  - API general: 100 per minute
- [ ] Webhook signature verification (Stripe)
  - Always verify with `stripe.webhooks.constructEvent()`
  - See 3.3 for example

**CSRF requirements:**
- Verify `Origin` and `Referer` against an explicit allowlist
- Reject cross-origin state-changing requests
- Apply the same verification consistently across all authenticated POST, PATCH, PUT, and DELETE endpoints

**Rate limiting requirements:**
- Use a durable shared store such as Upstash Redis, not in-memory rate limits
- Separate abuse prevention from billing and entitlement enforcement
- AI abuse limits should protect infrastructure from bursts
- General API limits should protect against endpoint spam
- The product rule remains exactly `50/month` using `ai_usage.month_reset_date` with UTC calendar-month resets

**Files to create:**
- `lib/auth-middleware.ts` — shared ownership check helper
- `lib/rate-limit.ts` — Upstash rate limiter
- `middleware/csrf.ts` — CSRF verification
- Update all API routes with ownership checks

**Upstash Setup:**
- [ ] Install Upstash Redis from Vercel Marketplace
- [ ] `vercel env pull` to get `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
- [ ] No code changes needed (env vars auto-injected)

**Risk:** User A sees User B's data (RLS wrong or endpoint missing check); API abused via rate-limit bypass (in-memory limits)
- **Mitigation:** Test all endpoints with multiple accounts. Use Upstash Redis (durable, not in-memory).

---

#### 4.5 Bug Fixes & Testing
- [ ] Manually test all flows
  - Sign up → create project → use canvas → all 4 AI modes → upgrade → share
- [ ] Test on different browsers (Chrome, Safari, Firefox)
- [ ] Test network throttling (simulate slow connection)
- [ ] Check for console errors / warnings
- [ ] Load test: multiple rapid AI calls
- [ ] Cross-browser: ensure responsive layout works

**Test Checklist:**
- [ ] Canvas loads and saves
- [ ] AI modes all respond correctly
- [ ] Error messages are clear
- [ ] Upgrade flow works
- [ ] Share link works
- [ ] No console errors on any page

**Risk:** Critical bug found on launch day
- **Mitigation:** Thorough manual testing. Have backup plan to hotfix immediately.

---

#### 4.6 Usage Dashboard / Analytics
- [ ] Create `app/dashboard/page.tsx`
  - Display stats in cards:
    - Projects count
    - **AI calls used this month (N / 50 for free, unlimited for pro)**
    - Last canvas edited
    - Upgrade button (if free)
  - Simple bar chart (use `recharts` or similar) for AI calls over past 30 days

**Dashboard should clearly show:**
- "5 of 50 AI calls used this month" (free tier)
- "Unlimited AI calls" (pro tier)
- Trend: AI calls per day over past month

---

#### 4.7 Monitoring & Analytics (Production)
- [ ] Set up Vercel Analytics
  - Track page views, Core Web Vitals
- [ ] Set up Sentry (optional, or use Vercel's error tracking)
  - Log server errors
  - Track error rates by endpoint
- [ ] Create monitoring dashboard
  - Monitor API latency
  - Monitor error rates
  - Monitor Stripe webhook success rate

**Files to create:**
- `lib/analytics.ts` — custom analytics helpers
- `lib/monitoring.ts` — error logging setup

**Risk:** Launch with no monitoring → can't debug issues
- **Mitigation:** Set up Vercel Analytics immediately after deploy.

---

#### 4.8 Documentation
- [ ] Write README.md
  - Setup instructions (for future dev)
  - Architecture overview
  - How to deploy
- [ ] Write API documentation (in comments or API.md)
  - List all endpoints
  - Request/response formats
  - Error codes

**Files to create:**
- `README.md` — project setup and overview
- `API.md` — API endpoint documentation (optional)

**Risk:** None. Docs are always valuable.

---

#### 4.9 Prepare Launch
- [ ] Configure domain (useklad.com)
  - Update Vercel project settings
  - Add SSL certificate (Vercel auto-handles)
- [ ] Create launch checklist
  - Verify all integrations (Supabase, Stripe, Anthropic)
  - Final smoke test on production
  - Announce on Twitter / IndieHackers
- [ ] Prepare email sequence
  - Waitlist → "Welcome" email with login link
  - Optional: onboarding email series

**Risk:** Domain not pointing to Vercel → 404
- **Mitigation:** Test domain before launch day.

---

### Week 4 Deliverables
✅ Smooth onboarding flow (under 2 min)
✅ All error cases handled with user-friendly messages
✅ Performance optimized (Lighthouse >80)
✅ Security hardened (RLS, CSRF, rate limiting)
✅ Thoroughly tested (manual + edge cases)
✅ Monitoring live (Vercel Analytics + Sentry)
✅ Documentation complete
✅ Domain configured
✅ Ready for launch

### Week 4 Success Criteria
- [ ] Onboarding completes in <2 minutes
- [ ] No console errors on any page
- [ ] Lighthouse score >80
- [ ] Verified: free user blocked at 3 projects (app + DB trigger)
- [ ] Verified: **AI limit blocks at 50 calls/month** (not per-day)
- [ ] All 4 AI modes work end-to-end (Organize, To Tasks, Critical Questions, Free Prompt)
- [ ] Share link generates, loads public canvas, is read-only
- [ ] Stripe webhook succeeds on checkout and updates plan
- [ ] All API endpoints verify ownership (test with 2+ accounts)
- [ ] CSRF middleware rejects cross-origin requests
- [ ] Rate limiting works (Upstash Redis)
- [ ] domain.com loads on Vercel (SSL working)
- [ ] `robots.txt` blocks `/shared/` and `/api/`

**Estimated Time:** 4–5 days with AI coding assistant

---

## Risk Register & Mitigations

### Critical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **RLS policies broken** — users see each other's data | Medium | Critical | Test with 2+ accounts immediately after Supabase setup. Verify in Studio. Profile sync trigger fails → users can't sign in. |
| **API endpoints missing ownership check** — User A accesses User B's project | Medium | Critical | Add explicit `if (resource.user_id !== session.userId) return forbidden()` to all endpoints. Test with 2+ accounts. |
| **AI mode outputs corrupt canvas** — node injection fails | Low | Critical | Save canvas state before inject. Test thoroughly in Week 2. Validate response JSON. |
| **Stripe webhook fails** — users not upgraded to Pro | Medium | High | Always verify webhook signature. Log all events. Check Stripe dashboard for delivery status. |
| **Canvas auto-save too slow** — Vercel function timeout | Low | High | Use Fluid Compute (longer timeout). Debounce at 2s. Monitor function logs. |
| **Context too large for API** — Anthropic request fails (>8K tokens) | Medium | Medium | Enforce 8K token budget. Prioritize selected > connected > visible. Add telemetry. |
| **tldraw update breaks integration** — canvas doesn't render | Low | High | Pin tldraw version in package.json. Test before upgrading. |
| **Rate limiting bypassed** — user makes >50 AI calls/month | Low | High | Use Upstash Redis (durable). Not in-memory. Free tier has sufficient quota. |
| **Share token indexed by search engines** — privacy leak | Low | Medium | Set `robots: noindex` on public views. Add to `robots.txt`. Tokens are UUIDs (no brute-force). |

### Medium Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **Users abuse free tier** — rapid AI calls drain API budget | Medium | Medium | Rate limit at **50 calls/month** (not daily). Monitor cost per user. Set Anthropic budget alert. |
| **Project limit bypassed** — user downgrades, creates 4th project | Low | Medium | DB trigger + app-level check. Both required. Downgrade blocks immediately. |
| **Onboarding too long** — users skip it | Medium | Medium | Keep under 2 minutes. Focus on "AI turns chaos to clarity" demo. Test with real users. |
| **API keys leaked** — security breach | Low | High | Use Vercel env vars only. Never commit keys. Rotate after launch. Webhook secret in env only. |
| **CSRF attack succeeds** — attacker makes requests as user | Low | High | Verify Origin/Referer headers. Middleware on all POST/DELETE endpoints. |
| **Performance degrades** — canvas slow with 1000+ nodes | Low | Medium | Test with large canvases. Optimize tldraw rendering. Monitor bundle size. |

### Low Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **Domain registration delays** — not ready for launch | Low | Low | Register domain now, not at launch day. Set up DNS 1 week before. |
| **Supabase quota exceeded** — API rate limited | Low | Medium | Monitor usage. Upgrade plan if needed. Scale to Neon (migration planned for v1.1). |

---

## Code Organization

- `app/` contains auth, app routes, API routes, shared-link views, onboarding, and root layouts
- `components/` contains the canvas shell, AI UI, onboarding, error handling, upgrade prompts, and shared UI primitives
- `lib/` contains auth, Supabase, Anthropic, canvas context/injection, billing, usage, rate limiting, monitoring, and analytics helpers
- Project root contains framework and deployment config such as `proxy.ts`, `tailwind.config.ts`, `next.config.ts`, and `package.json`

---

## Deployment Checklist

### Pre-Launch (Day 1)
- [ ] All GitHub branches merged to main
- [ ] No console errors in dev build (`npm run build`)
- [ ] Lighthouse score >80
- [ ] All endpoints tested and working
- [ ] **RLS policies verified** with 2+ test accounts (Studio)
- [ ] **All API endpoints have ownership checks** (tested with 2 users)
- [ ] **CSRF middleware active** on all POST/DELETE routes
- [ ] **Rate limiting configured** (Upstash Redis connected)
- [ ] Stripe keys configured in Vercel env
- [ ] Stripe webhook signature verification in place
- [ ] Database triggers active (`enforce_free_project_limit`, `handle_new_user`)
- [ ] Domain SSL certificate active
- [ ] `robots.txt` in place (blocks `/shared/` and `/api/`)
- [ ] Metadata on `/shared/[token]` has `noindex`

### Launch Day
- [ ] Final smoke test on production (all 4 AI modes, upgrades, shares)
- [ ] Monitor Vercel Analytics for errors
- [ ] Monitor Stripe webhook success rate (dashboard)
- [ ] Monitor Anthropic API response times
- [ ] Prepare social media posts
- [ ] Set up Sentry error tracking (or Vercel error tracking)
- [ ] Announce on Twitter / IndieHackers / Product Hunt
- [ ] Monitor support channels (email)

### Post-Launch (Week 1)
- [ ] Monitor Anthropic API costs (set budget alerts)
- [ ] Check for bugs / user feedback
- [ ] Verify rate limiting is working (check Upstash dashboard)
- [ ] Verify Stripe webhooks succeeding (>99% success rate)
- [ ] Respond to early users
- [ ] Prepare v1.1 roadmap (based on feedback)

---

## Success Criteria for MVP

### Functional
✅ Users can sign up, create projects, canvas persists
✅ All 4 Klad AI modes work correctly
  - **Organize:** selected nodes grouped and repositioned ON CANVAS
  - **To Tasks:** new task nodes injected ON CANVAS
  - **Critical Questions:** question nodes appear ON CANVAS
  - **Free Prompt:** responses in sidebar ONLY (conversational, not persisted)
✅ Freemium gating enforced
  - Max 3 projects for free tier (DB trigger + app check)
  - **50 AI calls/month for free tier** (NOT per-day)
  - Unlimited for Pro
✅ Stripe integration live (€19/mo Pro plan)
✅ Shareable read-only links work (UUID tokens, expiry, rotation, revocation)
✅ Usage dashboard shows "N / 50 calls this month" (free tier)
✅ Share links NOT indexed (robots.txt + noindex)

### Security & Privacy
✅ RLS policies isolate user data (tested with 2+ accounts)
✅ All API endpoints verify user ownership
✅ CSRF middleware prevents cross-origin requests
✅ Rate limiting works (Upstash Redis, 50/month per user)
✅ Stripe webhook signature verified
✅ No API keys in code or console
✅ Webhook secret in env vars only
✅ Database triggers enforce business rules

### Performance
✅ Page load <2s (Vercel Analytics)
✅ API response <500ms
✅ Canvas serialization stays <8K tokens
✅ Lighthouse score >80

### User Experience
✅ Onboarding <2 minutes (demonstrates AI value)
✅ Zero console errors
✅ All error cases handled gracefully
✅ AI output lands visibly on canvas (not hidden in sidebar)
✅ Share link generation is one-click
✅ Monthly AI limit messaging is clear

### Business
✅ No critical security vulnerabilities
✅ Cost per user <€2 (Anthropic + Vercel)
✅ Users can upgrade and cancel via Stripe
✅ Monthly limits enforced in database (not just app)
✅ Share tokens are cryptographically secure (UUIDs)

---

## Post-Launch Roadmap (v1.1+)

- External integrations (Notion, GitHub, Linear)
- MCP server connections
- Canvas templates (community-built)
- Export to PDF/image
- Mobile app
- Team collaboration (v2+)

---

## Notes for Lars

**You've got this.** With AI coding assistance, 4 weeks is very achievable. Key things to keep top-of-mind:

1. **Ship > Perfect** — Don't polish Week 1 forever. Get to launch.
2. **Test the happy path first** — Make sure the core flow works (sign up → create project → organize → upgrade).
3. **Monitor costs** — Anthropic API costs can sneak up. Set budget alerts.
4. **User feedback is gold** — Your first 10 users will tell you everything that's wrong. Listen.
5. **Celebrate Week 1** — When users can create projects and use AI, that's the product. Everything else is finishing touches.

This PRD + implementation plan is your north star. Update it as you go. By Week 3, you'll have a profitable product. By Week 4, you'll have a polished MVP ready for the world.

**Let's ship Klad.** 🚀
