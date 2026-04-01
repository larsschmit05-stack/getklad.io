# Klad AI Mode 2: Critical Questions
## Product Requirements Document

**Version:** v0.2 — MVP Feature
**Owner:** Lars (solo founder)
**Status:** In Development
**Domain:** useklad.com
**Stack:** Next.js · Supabase · Google Gemini API (via Vercel AI Gateway)

---

## 🎯 One-Line Purpose

> **"AI reads your work and asks the sharp questions you're missing — then lands them on your canvas as stickies."**

---

## 1. Feature Overview

**Critical Questions** is the second Klad AI mode. When you select notes on your canvas and click "Ask Questions," Gemini analyzes your work, detects the **domain context** (business, design, or execution), then returns 4–6 targeted questions designed to challenge your thinking and expose blind spots.

Unlike generic question generators, this mode is **domain-aware**: questions for a business plan sound different from questions for a design direction. And if your notes are too mixed, Gemini tells you to narrow your focus — that's useful feedback, not a failure.

All questions land **directly on your canvas** as sticky notes, in the same visual style as other canvas elements.

---

## 2. Problem This Solves

### The Gap

Solo founders and creators think in chaos — half-formed ideas, conflicting assumptions, hidden gaps they can't see because they're too close to their own thinking. They need:

1. **A second perspective** — someone to ask "but have you thought about X?"
2. **Domain-specific intelligence** — questions tailored to *what* you're planning (a product launch is not a design exploration)
3. **Direct canvas output** — not a chat sidebar; the questions should exist *in* your thinking space, not separate from it

### Why This Matters

- **Business founders** miss customer discovery questions, unit economics, go-to-market risks
- **Designers** under-specify brand coherence, typography systems, motion relationships
- **Project managers** under-estimate dependencies, timeline reality-checks, scope creep
- **Result:** Founders move forward on incomplete thinking, causing rework or failure later

---

## 3. Target User

Same as the core Klad product: **indie SaaS founders, vibecoders, and solo creative builders** who think visually and chaotically.

### When They Use This Mode

- Mid-project self-review ("Am I missing something obvious?")
- Before customer conversations ("What should I ask them about?")
- Before pivoting ("Is my assumption about the market solid?")
- Design handoff prep ("Have I specified everything a builder needs?")

---

## 4. How It Works: Domain-Aware Questioning

### Step 1: Context Detection

Gemini analyzes the user's **selected notes** plus nearby visible context. It identifies dominant **keywords and themes** to classify the work into one of four buckets:

| Domain | Trigger Keywords | Question Philosophy |
|--------|-----------------|-------------------|
| **Business/Startup** | budget, users, revenue, market, pricing, CAC, LTV, target audience, timeline, launch, MVP, growth, problem, solution | Challenge assumptions about the business model, customer, and go-to-market |
| **Design/Creative** | visual, aesthetic, brand, mood, palette, typography, references, design, color, layout, component, motion, interaction | Validate design system coherence, visual language consistency, and specification completeness |
| **Project/Execution** | timeline, deliverables, tasks, milestones, deadline, scope, dependencies, blockers, risks, owner, resource | Identify feasibility risks, timeline reality, dependency chains, and scope creep |
| **Mixed/Unclear** | (no dominant context detected) | Return a clarification message, not questions |

### Step 2: Question Generation

If domain is detected, Gemini generates **4–6 sharp questions** specific to that domain. Each question:
- Challenges an assumption or identifies a gap
- Is **answerable** by the user with the context visible on their canvas
- Sounds natural and conversational, not robotic or generic
- References **specific details** from their notes when possible

If domain is mixed or unclear, Gemini returns a single clarification message:

> "I can't ask meaningful questions because your notes mix [Business + Design]. Try selecting just notes about your business model, or just your design direction, and ask again."

This is **good feedback**, not a failure — it tells the user their thinking is unfocused.

### Step 3: Canvas Output

- **Detected domain:** New sticky notes appear on the canvas near the selection, one question per sticky
  - One header sticky labeling the domain (bold text, same color as Organize headers)
  - 4–6 question stickies below it
  - Questions are read-only (locked state, same as Organize output)
  - Placed in a vertical stack, auto-positioned to avoid overlapping selected nodes

- **Mixed/Unclear domain:** Single clarification sticky note appears
  - Locked state
  - Positioned near selection

---

## 5. Example Questions per Domain

### Business/Startup Domain

Given notes about a SaaS product for indie founders:

> 1. "€2k seed budget + €20 customer acquisition cost = 100 users. What's your timeline to break even on your marketing spend?"
>
> 2. "You say 'indie hackers' are your audience, but there's no distribution plan. How will they discover you? Twitter? Product Hunt? Cold email?"
>
> 3. "You've identified the problem (scattered notes) but not who feels the pain most acutely. Who has the most expensive version of this problem today?"
>
> 4. "Your pricing is €19/mo subscription. What happens to churn if you lose one core AI feature? How sticky is the product?"

### Design/Creative Domain

Given mood board and typography sketches:

> 1. "Your references are minimalist + brutalist, but your mood is 'playful and accessible.' How do these merge? Where's the tension?"
>
> 2. "You've picked a serif font for headings and a sans-serif for body. Before you finalize, what does each font choice say about your brand? Do they agree?"
>
> 3. "You have a strong color palette (3 colors) but no mention of how motion/animation supports the brand. Is that intentional?"
>
> 4. "You've sketched desktop but not mobile. Does your grid system scale? Will type sizes feel right at 375px width?"

### Project/Execution Domain

Given a 4-week build plan with 12 tasks in Week 1:

> 1. "You have 4 weeks. That's 28 days minus weekends, bugs, and meetings. How many actual build days do you have?"
>
> 2. "Week 1 has 12 tasks. Which 3 of those must ship before anything else can start? What blocks what?"
>
> 3. "You're dependent on this vendor (API/library). What's your backup plan if they delay or deprecate?"
>
> 4. "You mention 'polish' in Week 4. What does done look like? How will you know you're shipping, not just done-ish?"

---

## 6. User Story

### Acceptance Scenario

```
Given: User has selected 5 sticky notes on canvas about their product launch plan
When: User clicks "Ask Questions" button
Then: Within 2 seconds, Gemini responds with:
  - Detects "Business/Startup" domain (keywords: launch, pricing, users, market)
  - Generates 5 sharp business-challenge questions
  - Renders as locked stickies on canvas in a labeled group
  - Usage counter increments by 1
  - Toast shows: "5 critical questions added. What do you think?"
```

### Edge Case: Mixed Context

```
Given: User selects 3 notes about business + 2 notes about design
When: User clicks "Ask Questions"
Then: Within 2 seconds, Gemini responds with:
  - Detects mixed context (no dominant domain)
  - Returns clarification message: "I can't ask meaningful questions because your notes mix Business + Design. Try selecting just one..."
  - Renders as single sticky note on canvas
  - Usage counter increments by 1
```

---

## 7. Technical Specification

### API Route

**Endpoint:** `POST /api/klad/critical-questions`

**Request Payload:**
```json
{
  "selectedNodeIds": ["node-1", "node-2", "node-3"],
  "visibleNodes": [...],
  "canvasMetadata": {
    "projectId": "proj-123",
    "userId": "user-456"
  }
}
```

**Response Payload:**
```json
{
  "mode": "critical-questions",
  "domain": "business" | "design" | "project" | "mixed",
  "questions": [
    "Question 1 as natural string",
    "Question 2...",
    "..."
  ],
  "clarificationMessage": null | "string if domain is mixed"
}
```

### Implementation Notes

- **Reuse serialization:** Use existing `serializeForOrganize()` from `lib/ai/serialize-canvas.ts` (same 1,200 token budget)
- **Model:** `google/gemini-2.5-flash` (consistent with Organize mode)
- **Auth:** Gate via `getUser()` — unauthenticated requests return 401
- **Usage limit:**
  - Free tier: 50 calls/month (shared with other AI modes)
  - Pro tier: unlimited
  - Route checks `getAiUsage()` before calling Gemini, returns 429 if exhausted
  - Route calls `incrementAiUsage()` after successful response
- **Timeout:** 10 seconds (same as Organize)
- **Structured output:** Use `Output.object()` from AI SDK v6 to enforce schema

### Canvas Integration

- **Rendering:** Same as Organize — new sticky notes created and positioned automatically
- **Node type:** Sticky notes with `locked: true` state
- **Positioning:** Auto-layout helper stacks questions vertically near the selection, avoids overlaps
- **Header node:** Optional bold text node above the question group, labeled with the domain name (e.g., "Business Questions", "Design Gaps")

### Gemini Prompt Strategy

The system prompt should:
1. Explain the 4 domains and detection logic
2. Provide examples of high-quality questions per domain
3. Instruct Gemini to prioritize **sharp, specific questions** over generic ones
4. Instruct Gemini to reference specific details from the notes when possible
5. Define the clarification message for mixed contexts
6. Enforce the output JSON schema exactly

---

## 8. UI/UX Design

### Trigger

- **Primary:** Existing `KladAiButton` wand icon
  - **Status quo:** Currently only triggers Organize mode
  - **After this feature:** Button needs mode selector dropdown (separate task, not in scope here)
  - **For now:** Consider launching as a separate button or mode selector in the existing button

### Disabled States

- Button disabled if < 2 nodes selected (same as Organize)
- Button disabled if user has exhausted free tier limit (same as Organize)

### Loading State

- Wand icon shows spinner while request is in flight
- Button disabled during request
- 10-second timeout, then error toast: "Questions unavailable. Try again later."

### Success State

- New sticky notes appear on canvas near the selection
- Brief fade-in animation (same timing as Organize)
- Toast notification: "5 critical questions added" (or "Mixed context detected — try narrowing your selection")

### Error States

- **Auth failed:** Return 401, app handles session refresh
- **Usage exhausted:** Return 429, toast shows "You've used all your AI calls this month. Upgrade to Pro for unlimited."
- **Gemini API down:** Return 503, toast shows "AI is temporarily unavailable."

---

## 9. Acceptance Criteria

### Functional

- ✅ Given business-heavy notes, generates 4–6 business-challenge questions
- ✅ Given design-heavy notes, generates 4–6 design-coherence questions
- ✅ Given project-heavy notes, generates 4–6 execution-risk questions
- ✅ Given mixed-context notes, returns clarification message instead of questions
- ✅ All outputs land on canvas within 2 seconds
- ✅ Questions render as locked sticky notes
- ✅ Usage counter increments exactly once per successful call
- ✅ Free tier limit (50 calls/month) is enforced
- ✅ Pro tier has unlimited calls

### Technical

- ✅ Route requires valid JWT (auth gated)
- ✅ Route validates 2–50 selected nodes
- ✅ Route uses `serializeForOrganize()` for context serialization
- ✅ Route calls Gemini with structured output schema
- ✅ Route handles timeouts gracefully (10s max)
- ✅ Database usage counter updated atomically

### UX

- ✅ Button disabled when < 2 nodes selected
- ✅ Loading spinner visible during request
- ✅ Error messages are clear and actionable
- ✅ Success toast shows number of questions added
- ✅ New stickies don't overlap selected nodes

---

## 10. Out of Scope — v1

❌ **Not building:**
- Custom question templates per industry (finance vs. healthcare vs. etc.)
- Follow-up question chains ("Tell me more about X")
- Sidebar conversational mode (separate "Free Prompt" mode, v2)
- Exporting questions as a report
- Question history or re-asking with modifications

---

## 11. Success Metrics

| Metric | Target | Why |
|--------|--------|-----|
| **Domain detection accuracy** | >90% (business/design/project) | Ensures questions feel relevant, not generic |
| **Question relevance rating** | >4/5 (user feedback) | Questions should challenge thinking, not confuse |
| **Question adoption rate** | >40% of users try this mode | Validates that asking questions is valuable to the user |
| **Engagement lift** | +15% canvas edits after questions | Users should actually respond/iterate on the canvas based on questions |

---

## 12. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Domain detection fails → generic questions | Medium | Low | Fallback to clarification message; teach users to narrow selection |
| Gemini API cost exceeds budget | Low | Medium | Same rate-limiting as Organize (50 calls/month free tier) |
| Questions are condescending or off-base | Medium | High | Iterate prompt carefully with examples; gather user feedback post-launch |
| Mixed-context message confuses users | Low | Low | Keep message clear and actionable; add tooltip in UI |

---

## 13. Recommended Build Sequence

1. **Define Gemini system prompt** with domain detection logic + examples
2. **Wire new API route** `POST /api/klad/critical-questions` with structured output schema
3. **Test locally** with 10+ example canvas states (business, design, project, mixed)
4. **Integrate with Canvas.tsx** — add new button or mode selector
5. **Test end-to-end** — select nodes, call API, render questions on canvas
6. **Monitor Gemini costs** post-launch to validate rate-limiting

---

## Document Maintenance

This document is the **living spec** for the Critical Questions feature. Update it as decisions change during implementation.

**Last rule:** _Iterate based on early user feedback. If questions aren't helping users think better, pivot the domain detection or prompt strategy._
