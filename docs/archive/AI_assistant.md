# Klad AI MVP — Product Requirements Document

**Version:** v0.1 — Organize Mode Only
**Owner:** Lars
**Status:** Ready to Build
**Last Updated:** March 31, 2026

---

## 1. Overview

Klad AI is the thinking partner layer on top of the canvas. **MVP scope: Organize mode only.**

User selects 2+ scattered notes → clicks sparkle icon in bottom toolbar → Claude groups them → group labels appear on canvas with original notes auto-positioned into clusters.

**Core principle:** Output lands on canvas as nodes. No sidebars. No context switching.

---

## 2. MVP Feature: Organize Mode

**Trigger:**
- User selects 2+ nodes on canvas
- Sparkle icon appears in bottom toolbar (context-aware: greyed out when <2 nodes selected)
- User clicks sparkle icon

**What happens:**
1. Reads selected node text + types
2. Claude identifies 2–4 natural grouping themes (specific to their situation, not generic)
3. Returns structured groups with clear labels
4. Frontend auto-positions group labels (as text nodes, 18px bold) and clusters original notes beneath them
5. Original selected nodes deselected; new group labels auto-selected
6. User immediately sees organized canvas

**Constraints:**
- Minimum: 2 nodes
- Maximum: 50 nodes
- Input: any node type (sticky, text, etc.)

**Success:**
- <2 seconds latency
- Clear, meaningful group labels (not "Ideas", "Other", generic bins)
- User can see why notes were grouped together
- Undo (Cmd+Z) reverts all changes

---

## 3. What's NOT in MVP

Post-MVP features (v1.1+):
- ❌ Critical Questions mode (deferred — user wants to focus on Organize first)
- ❌ Chat sidebar
- ❌ Multi-turn reasoning
- ❌ Idea generation from scratch
- ❌ Task export
- ❌ External integrations
- ❌ Voice input
- ❌ Templates

---

## 4. Canvas Serialization

**What gets sent to Claude:**

```
SELECTED NODES ONLY:
- Full text content (word-for-word)
- Node type (sticky, text, image, etc.)
- Node ID (for mapping output back to canvas)
- Count of selected nodes

VISIBLE CONTEXT (if there's room in token budget):
- First 50 chars of visible but unselected nodes
- Node type for each

METADATA:
- Total nodes on canvas
- Canvas age
```

**What never gets sent:**
- Node positions (x, y coordinates)
- Images themselves
- Undo/redo history
- User personal data

**Token budget:** 1,500–2,200 tokens per call
- System prompt: ~500 tokens
- Canvas serialization: ~600–1,000 tokens
- Response buffer: ~300–500 tokens

**If serialization exceeds budget:**
1. Keep all selected nodes (non-negotiable)
2. Abbreviate visible context to 20 characters per node
3. Omit oldest visible nodes (FIFO)
4. If serialization >1,200 tokens: emit warning log: `"Canvas state truncated: sent X of Y nodes"`
   - Log server-side only (never alert user)
   - Include: user ID, timestamp, truncation ratio
   - Use for monitoring canvas size patterns
5. Hard limit: 2,500 tokens. Never exceed. If approaching, warn user: "Your canvas is large. Try selecting fewer nodes."

---

## 5. System Prompt (for Gemini Flash 2.5)

```
You are Klad, the organizing partner.

Your job: take loosely organized thoughts and structure them into clear groups.

When given selected notes:
1. Identify 2–4 natural themes or categories (specific to their situation, not generic)
2. Create clear, meaningful group labels
3. Assign each note to its best group
4. Flag any notes that don't fit cleanly

Think like a founder organizing their own chaos, not a librarian.
Be practical. Be opinionated about what belongs where.

Every response is ONLY valid JSON. No markdown, no preamble, no explanation outside the JSON.
```

---

## 6. AI Model & Provider

**Model:** Google Gemini Flash 2.5
**Provider:** Vercel AI Gateway (via `@ai-sdk/google`)
**Route:** `model: 'google/gemini-flash-2.5'`
**Auth:** OIDC (auto-provisioned via `vercel env pull`)

**Why Gemini Flash 2.5:**
- Fast (low latency, critical for <2s UX)
- Cost-effective (high volume of Organize calls)
- Strong at understanding context and categorization

---

## 7. API Response Format

### POST /api/klad/organize

**Request:**
```json
{
  "selectedNodes": [
    {
      "id": "node-1",
      "type": "sticky",
      "text": "Target: indie SaaS founders"
    }
  ],
  "visibleNodes": [...],
  "canvasMetadata": {...}
}
```

**Response:**
```json
{
  "mode": "organize",
  "groups": [
    {
      "id": "group-1",
      "label": "User Acquisition",
      "description": "How we'll reach first users",
      "nodeIds": ["node-1", "node-2"],
      "suggestedColor": "blue",
      "reasoning": "Both notes focus on finding and reaching users"
    },
    {
      "id": "group-2",
      "label": "Product Constraints",
      "nodeIds": ["node-3"],
      "suggestedColor": "amber"
    }
  ],
  "orphans": [
    {
      "nodeId": "node-5",
      "text": "Ask engineering team about tech stack",
      "reason": "This is about team/hiring, signals a new focus area"
    }
  ],
  "summary": "I've grouped your 5 notes into 2 themes. One note about engineering might signal a third area."
}
```

---

## 8. Frontend: Canvas Output

**After API succeeds:**

1. **Create group label nodes:**
   - Type: text node
   - Font: 18px bold (700 weight) — larger than regular stickies
   - Background: use `suggestedColor` (blue, amber, etc.)
   - Text: the group label
   - Position: spatially near member nodes (see positioning strategy below)

2. **Reposition selected nodes & create group label clusters:**
   - For each group:
     - Calculate bounding box of all member nodes (min/max x, y)
     - Position group label 30px **left** and 60px **above** the center of the bounding box
     - This prevents label overlap with member nodes
   - Keep original notes in place (don't delete)
   - Auto-layout: notes stay in their original positions relative to each other (no grid forcing)

3. **Selection state:**
   - Deselect the original selected nodes
   - Auto-select all new group labels (visual cue: "these are new")

4. **Animation:**
   - Group labels fade in over 300–400ms
   - Original notes stay in place (no animation)

5. **Orphan handling:**
   - If orphans exist:
     - Tooltip on hover over Organize button: "X notes didn't fit a group"
     - Orphan notes stay on canvas (NOT deleted, NOT moved)
     - Optional: subtle badge/flag on orphan nodes (e.g., small icon or lighter styling)
     - Future (v1.1): dedicated orphan zone or visual warning area

---

## 9. Button & UI Placement

**Bottom Toolbar:**
- **Organize button with ✨ icon** appears in bottom toolbar (pick ONE icon in design phase: ✨, ⭐, or 🧠)
- Always visible, but greyed out when <2 nodes selected
- No label text (icon only, minimal visual noise)
- Shows loading spinner + "Organizing..." during API call
- No success animation (new nodes on canvas are the feedback)

**Free Tier Counter (Hybrid 2 & 3):**
- Usually hidden (in user profile menu)
- Escalates to bottom toolbar when approaching limit (last 5 calls)
- Display: "5 calls remaining this month"

**Error States:**
- <2 nodes selected: tooltip "Select 2+ notes to organize"
- API timeout: "That's taking a while. Try again?"
- API error: "Something went wrong. Try selecting different notes."

---

## 10. Implementation Checklist

### Week 1: Core Feature
- [ ] Canvas serialization (selected + visible nodes)
- [ ] `/api/klad/organize` endpoint (Gemini Flash 2.5 integration via Vercel AI Gateway)
  - Install: `npm install @ai-sdk/google ai`
  - Use: `model: 'google/gemini-flash-2.5'` with AI Gateway
  - Auth: Read `VERCEL_OIDC_TOKEN` from env (auto-provisioned)
- [ ] Organize button in bottom toolbar (greyed out logic)
- [ ] Canvas output: create group label nodes
- [ ] Canvas output: auto-reposition original notes into clusters
- [ ] Selection state: deselect originals, select new groups
- [ ] Fade-in animation (300–400ms)
- [ ] Error handling & validation
- [ ] Loading states and messaging

### Week 2: Polish & Rate Limiting
- [ ] Rate limiting (free 50/month, pro unlimited)
- [ ] Free tier counter (user menu + escalation)
- [ ] Retry logic (up to 2x on timeout)
- [ ] Token budget monitoring
- [ ] Edge cases (100+ nodes, empty canvas, single orphan, etc.)
- [ ] Undo support (Cmd+Z reverts all new nodes)

### Week 3: Testing & Validation
- [ ] Manual testing with 5 real founder canvases
- [ ] Gate 1: >60% of responses are genuinely specific (not generic groups)
- [ ] Latency: p95 < 3 seconds
- [ ] Error rate: <2%
- [ ] UI polish & visual refinement

### Week 4: Launch
- [ ] Deploy to production
- [ ] Set up monitoring (latency, errors, usage)
- [ ] Collect metrics for first 100 active users
- [ ] Iterate on Claude prompt based on real feedback

---

## 11. Success Criteria (MVP)

**Quantitative:**
- ✅ <2 second latency (p95)
- ✅ <2% error rate
- ✅ >60% of active users run Organize in first session
- ✅ >20 organizes per Pro user per month (indicates real usage)

**Qualitative:**
- ✅ >60% of test responses are genuinely specific (reference actual canvas content, not generic bins)
- ✅ User feedback: "This helped me see patterns in my thinking"
- ✅ Group labels are meaningful (not "Group 1", "Other", "Ideas")

**Product:**
- ✅ No hallucinated nodes or malformed JSON
- ✅ Free tier: <30% of users hit 50-call quota (good value, not waste)
- ✅ Undo works perfectly (Cmd+Z reverts all changes)

---

## 12. Deferred to v1.1+

These are documented for transparency, but OUT OF SCOPE for MVP:

- **Critical Questions mode** — Ask sharp questions about blind spots
- **Orphan UI** — Visual "unresolved tensions" zone on canvas
- **Smart truncation** — Spatial/recency-based instead of pure FIFO
- **Task export** — "Turn this group into tasks"
- **Chat sidebar** — Multi-turn reasoning
- **External integrations** — Notion, Linear, GitHub, Slack
- **Voice input** — Audio-to-canvas transcription
- **Templates** — "Business Model Canvas" mode

---

## 13. Key UX Decisions (Validated with User)

| Decision | Rationale |
|----------|-----------|
| **Icon only (no label)** | Minimal visual noise. Discoverability via sparkle icon + context (greyed out when no selection). |
| **Always visible, greyed out** | Consistent. User learns: see sparkle = organize available. |
| **Auto-reposition + fade-in** | Cleanest UX. No manual cleanup. Fade animation shows things appeared. |
| **Deselect originals, select groups** | Guides user attention to output. User sees what was created. |
| **Spatial positioning** | Organic. Groups positioned near their member notes (not sidebar-like). |
| **Bottom toolbar placement** | Context-aware. Button only appears relevant when notes are selected. |
| **No success animation on button** | New nodes ARE the feedback. Minimal visual clutter. |
| **Hybrid counter (menu + escalation)** | Balance: quota awareness when it matters (approaching limit), not always visible (reduces noise). |

---

## 14. Validation Gates (Before Launch)

**Gate 1: Response Quality (CRITICAL)**
- Test Organize on 5 real founder canvases
- Ask: "Are these group labels meaningful? Did they help you see patterns?"
- Success: >60% say "yes, this is specific to my work"
- Failure: Iterate system prompt

**Gate 2: Latency (p95 < 3 seconds)**
- Run 100 canvases through Organize
- Measure end-to-end time
- If >3s, optimize or pick different model

**Gate 3: Error Rate (<2%)**
- JSON validation must pass 99%+ of responses
- If <99%, adjust prompt to enforce stricter format

**Gate 4: Token Budgets**
- Serialize 100 real canvases (measured)
- Must stay within 1,500–2,200 tokens for 95%+ of calls
- If not, refine truncation strategy

---

## 15. Summary: The MVP

**One focused feature:**
- Select 2+ notes → click sparkle → groups appear on canvas in <2 seconds
- Group labels are specific to their work, not generic bins
- Auto-positioned clusters reduce manual cleanup
- Works at baseline quality: stateless, fast, specific

**What makes it work:**
- Output lands ON CANVAS (no sidebar, no context switch)
- Sparkle icon is context-aware (greyed out when no selection)
- Group labels are 18px bold (clear visual hierarchy)
- Spatial positioning feels organic (not sidebar-like)
- Undo always works (Cmd+Z reverts everything)

**What could break it:**
- Generic groups ("Ideas", "Other", "Next Steps")
- Slow responses (>3 seconds)
- Hallucinated nodes or malformed JSON
- Unclear which notes belong to which group

**Then ship it. Measure. Iterate. Add Critical Questions in v1.1.**
