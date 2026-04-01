# Klad AI — Implementation Plan (Organize Mode MVP)

**Based on:** `docs/AI_assistant.md` (PRD v0.1)
**Goal:** Select 2+ nodes → click sparkle → groups appear on canvas in <2s

---

## Prerequisites

Before starting any step, ensure:
- `vercel link` is done (project connected)
- AI Gateway enabled in Vercel dashboard
- `vercel env pull` run (OIDC credentials in `.env.local`)

---

## Step 1: Install AI SDK packages ✅ COMPLETED

**What:** Add the Vercel AI SDK dependencies needed for the Organize feature.

**Tasks:**
- Run `npm install ai @ai-sdk/react`
- Verify packages are in `package.json`
- Verify dev server still starts (`npm run dev`)

**Files changed:** `package.json`, `package-lock.json`

---

## Step 2: Canvas serialization helper ✅ COMPLETED

**What:** Create a function that takes selected nodes (and optionally visible nodes) and serializes them into a prompt-ready payload, respecting the token budget from the PRD.

**Tasks:**
- Create `lib/ai/serialize-canvas.ts`
- Function: `serializeForOrganize(selectedNodes, visibleNodes?, canvasMetadata?)` → returns `{ selectedNodes, visibleNodes, canvasMetadata }` object matching the PRD request format
- Extract text content from all node types (sticky → `props.text`, rect → `props.text`, text → `props.text`, etc.)
- Nodes without text (freehand, image, arrow) get a type-only entry: `{ id, type, text: "" }`
- Respect token budget: keep all selected nodes, abbreviate visible context if needed (50 chars → 20 chars → omit oldest)
- Hard limit: if serialized payload is too large, emit console warning and truncate visible nodes
- Export the request/response TypeScript types (`OrganizeRequest`, `OrganizeResponse`, `OrganizeGroup`, `OrganizeOrphan`)

**Files created:** `lib/ai/serialize-canvas.ts`

**Reference:** PRD §4 (Canvas Serialization), §7 (API Response Format)

---

## Step 3: AI Organize API route - planning tool needed ✅ COMPLETED

**What:** Create the `/api/klad/organize` POST endpoint that calls Gemini Flash 2.5 via AI Gateway and returns structured group data.

**Tasks:**
- Create `app/api/klad/organize/route.ts`
- Authenticate request with `getUser()` from `lib/auth.ts`
- Parse request body (validate: selectedNodes array with 2–50 items)
- Build the system prompt from PRD §5
- Call `generateText` with `model: 'google/gemini-2.5-flash'` and `Output.object()` for structured output
- Define the output schema matching PRD §7 response format (groups array, orphans array, summary)
- Return JSON response
- Handle errors: 401 (no auth), 400 (bad input / <2 nodes), 500 (AI failure)
- Add basic input validation (min 2 nodes, max 50 nodes)

**Files created:** `app/api/klad/organize/route.ts`

**Reference:** PRD §5 (System Prompt), §6 (AI Model), §7 (Response Format)

---

## Step 4: AI usage tracking (rate limiting prep) ✅ COMPLETED

**What:** Add application-layer functions to read and increment the `ai_usage` table that already exists in Supabase.

**Tasks:**
- Add to `lib/db.ts` (or create `lib/ai/usage.ts`):
  - `getAiUsage(userId)` — returns current month's call count
  - `incrementAiUsage(userId)` — upsert: increment count or create row for current month
- The `ai_usage` table schema (from migration 001): `user_id`, `call_count`, `month_reset_date`, timestamps
- Wire into the `/api/klad/organize` route: check usage before calling AI, increment after success
- For now: enforce 50 calls/month for all users (Pro tier check comes later)

**Files changed:** `lib/db.ts` (or new `lib/ai/usage.ts`), `app/api/klad/organize/route.ts`

**Reference:** PRD §9 (Button & UI — Free Tier Counter)

---

## Step 5: Organize button in bottom toolbar ✅ COMPLETED

**What:** Add the sparkle (Organize) button to the canvas bottom toolbar, next to the existing tool buttons.

**Tasks:**
- Add an `OrganizeButton` component in `components/canvas/OrganizeButton.tsx`
- Icon: use `Sparkles` from `lucide-react`
- Props: `selectionCount: number`, `isLoading: boolean`, `onClick: () => void`
- Visual states:
  - **Disabled** (greyed out): when `selectionCount < 2`
  - **Active** (clickable): when `selectionCount >= 2`
  - **Loading**: spinner + "Organizing..." text (replaces icon during API call)
- Tooltip: "Select 2+ notes to organize" when disabled
- Style: match existing toolbar aesthetic (same border, shadow, padding pattern from `Toolbar.tsx`)
- Place the button **after** the main Toolbar in the bottom toolbar group in `Canvas.tsx` (as a separate pill, visually distinct from drawing tools)

**Files created:** `components/canvas/OrganizeButton.tsx`
**Files changed:** `components/Canvas.tsx` (add OrganizeButton to bottom toolbar group)

**Reference:** PRD §9 (Button & UI Placement)

---

## Step 6: Organize handler — call API and apply results to canvas - planning tool needed ✅ COMPLETED

**What:** Wire the OrganizeButton click to call the API and create group label nodes on the canvas.

**Tasks:**
- In `Canvas.tsx`, add `handleOrganize` async function:
  1. Gather selected node data from `state.document.nodes` using `state.selection.nodeIds`
  2. Call `serializeForOrganize()` from Step 2
  3. `POST /api/klad/organize` with the serialized payload
  4. On success, process the response:
     - For each group in the response:
       - Calculate bounding box of member nodes (min/max x, y from their positions)
       - Create a new text node as the group label:
         - Position: 30px left and 60px above the bounding box center
         - Font: 18px bold (700 weight)
         - Background color: map `suggestedColor` to a PALETTE color
         - Text: the group label string
       - Dispatch `CREATE_NODE` for the group label
     - Dispatch `CLEAR_SELECTION`
     - Dispatch `SELECT_NODES` with the new group label node IDs
  5. On error: show toast with error message
- Add state: `const [isOrganizing, setIsOrganizing] = useState(false)`
- Pass `isLoading={isOrganizing}` and `selectionCount` to OrganizeButton

**Files changed:** `components/Canvas.tsx`

**Reference:** PRD §8 (Frontend: Canvas Output)

---

## Step 7: Fade-in animation for group labels ✅ COMPLETED

**What:** Add a 300–400ms fade-in effect when new group label nodes appear on canvas.

**Tasks:**
- Add an `animatingNodeIds` state (Set of node IDs) to Canvas.tsx
- When group labels are created in Step 6, add their IDs to `animatingNodeIds`
- In the node rendering layer, apply CSS opacity transition (0 → 1 over 350ms) for nodes in `animatingNodeIds`
- After the animation completes (setTimeout 400ms), remove IDs from `animatingNodeIds`
- This should work with the existing SVG rendering — apply `opacity` and `transition` styles to the node `<g>` wrapper

**Files changed:** `components/Canvas.tsx` (or relevant node rendering component)

**Reference:** PRD §8.4 (Animation)

---

## Step 8: Error states and edge cases ✅ COMPLETED

**What:** Handle all error states and edge cases defined in the PRD.

**Tasks:**
- **<2 nodes selected:** Already handled by disabled state in Step 5
- **>50 nodes selected:** Show toast "Try selecting fewer nodes (max 50)" and don't call API
- **API timeout:** If response takes >10s, abort and show toast "That's taking a while. Try again?"
- **API error (non-timeout):** Show toast "Something went wrong. Try selecting different notes."
- **Malformed AI response:** If JSON parsing fails or groups array is empty, show generic error toast
- **Empty text nodes:** Nodes with no text should still be sent (with type info) — they may be grouped by proximity to other nodes conceptually
- **Rate limit exceeded:** If usage check returns over-limit, show toast "You've used all your free AI calls this month"
- Add `AbortController` with 10s timeout to the fetch call in `handleOrganize`

**Files changed:** `components/Canvas.tsx`, `app/api/klad/organize/route.ts`

**Reference:** PRD §9 (Error States)

---

## Step 9: Undo support for Organize - planning tool needed ✅ COMPLETED

**What:** Ensure Cmd+Z reverts all group label nodes created by a single Organize action.

**Tasks:**
- The reducer already pushes an undo snapshot before state-changing actions
- Verify that creating multiple nodes via sequential `CREATE_NODE` dispatches results in a single undo step
- If not (likely — each dispatch = separate undo entry), refactor to use a new **batch action**:
  - Add `BATCH_CREATE_NODES` action to reducer that creates multiple nodes in one dispatch
  - This ensures a single undo snapshot covers all group labels + selection changes
  - Also batch the `CLEAR_SELECTION` + `SELECT_NODES` into the same action
- Test: create organize result → Cmd+Z → all group labels disappear, original selection restored

**Files changed:** `lib/canvas/reducer.ts`, `components/Canvas.tsx`

**Reference:** PRD §8.3 (Selection state), §2 (Success: Undo reverts all changes)

---

## Step 10: Free tier counter UI

**What:** Add the usage counter that shows remaining AI calls, escalating to toolbar when approaching limit.

**Tasks:**
- Create `components/canvas/AiUsageCounter.tsx`
- Fetch usage on canvas mount: `GET /api/klad/usage` (new simple endpoint)
- Create `app/api/klad/usage/route.ts` — returns `{ used, limit, remaining }`
- Display logic:
  - **Hidden by default** (counter lives in user menu area, out of scope for now — just the toolbar escalation)
  - **Visible in toolbar** when remaining <= 5: show "X calls remaining this month" as a small badge near the OrganizeButton
- Update the count after each successful organize call (optimistic: decrement locally)

**Files created:** `components/canvas/AiUsageCounter.tsx`, `app/api/klad/usage/route.ts`
**Files changed:** `components/Canvas.tsx`

**Reference:** PRD §9 (Free Tier Counter)

---

## Step 11: Polish and type-check

**What:** Final cleanup, type safety, and verification.

**Tasks:**
- Run `npx tsc --noEmit` — fix any TypeScript errors
- Run `npm run lint` — fix any linting issues
- Run `npm run build` — verify production build succeeds
- Test manually in `npm run dev`:
  - Create 4–5 sticky notes with different topics
  - Select all → click Organize → verify groups appear
  - Verify fade-in animation
  - Verify Cmd+Z undoes everything
  - Verify disabled state with 0 or 1 selected nodes
  - Verify error toast on network failure (disconnect and try)
- Review all new files for:
  - No hardcoded secrets
  - No `getSession()` usage (must use `getUser()`)
  - All Supabase queries filter by `user_id`

**Files changed:** Various (fixes only)

---

## File Map (new files created)

```
lib/ai/
  serialize-canvas.ts    — Step 2: serialization + types
  usage.ts               — Step 4: AI usage tracking (optional, could go in lib/db.ts)

app/api/klad/
  organize/route.ts      — Step 3: AI organize endpoint
  usage/route.ts         — Step 10: usage counter endpoint

components/canvas/
  OrganizeButton.tsx     — Step 5: sparkle button
  AiUsageCounter.tsx     — Step 10: usage counter badge
```

## Files modified

```
package.json             — Step 1: AI SDK packages
components/Canvas.tsx    — Steps 5, 6, 7, 8, 10: button placement, handler, animation
lib/canvas/reducer.ts    — Step 9: BATCH_CREATE_NODES action
lib/db.ts                — Step 4: AI usage functions (if not using separate file)
```

---

## Dependency order

```
Step 1 (packages)
  └→ Step 2 (serialization) ─────→ Step 3 (API route) ──→ Step 4 (usage tracking)
                                         │
  Step 5 (button UI) ────────────────────┘
       └→ Step 6 (wire handler) ──→ Step 7 (animation)
                                  ──→ Step 8 (error states)
                                  ──→ Step 9 (undo batch)
                                  ──→ Step 10 (usage counter)
                                       └→ Step 11 (polish)
```

Steps 2 and 5 can be built in parallel. Steps 7–10 can be built in any order after Step 6.
