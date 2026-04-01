# PRD: Klad AI Chat Window

> **Status:** Draft
> **Date:** 2026-04-01
> **Author:** Lars (via Claude Code)

---

## The Shift

**From:** 3 separate buttons (Organize, Critical Questions, Create Tasks) in a dropdown menu
**To:** 1 flexible AI button + smart chat window with free-form instructions

---

## Chat Window Overview

### Appearance
- **Size:** 320px wide x 280px tall (fixed)
- **Position:** Centered overlay, above selected notes
- **Style:** Clean, minimal, flat design (matches Klad editorial aesthetic)
- **Backdrop:** Semi-transparent dark overlay (prevents canvas interaction)

### Components
1. **Header** — "AI Assistant" + close button (X)
2. **Message Area** — Shows AI responses (scrollable, max 3-4 messages visible)
3. **Input Field** — Text input: "What would you like me to do?"
4. **Send Button** — Arrow (→) icon, triggers request

---

## What Users Can Ask

### Valid Instructions (In Scope)

**Organizing & Structuring:**
- "Organize by priority"
- "Group by timeline"
- "Sort by complexity"
- "Categorize by risk"
- "Group by stakeholder"
- "Separate features from constraints"

**Task Extraction:**
- "Create a task list"
- "Extract action items"
- "What needs to be done?"
- "What's next?"

**Questioning & Validation:**
- "Ask me hard questions"
- "Challenge my assumptions"
- "What am I missing?"
- "Find contradictions"
- "What could go wrong?"

**Analysis:**
- "Summarize the main themes"
- "What's the core problem?"
- "Is there a pattern?"

### Invalid Instructions (Out of Scope)

**External Knowledge:**
- "What's the weather?" — rejected
- "What's the stock price?" — rejected
- "Who won the election?" — rejected

**Generating from Scratch:**
- "Give me 10 business ideas" — rejected
- "Write a blog post" — rejected
- "Generate code" — rejected

**Meta/Vague:**
- "Do something useful" — rejected
- "Make this better" — rejected
- "Help me" — rejected

**When invalid:** User gets friendly error: "I can only work with your canvas notes. Try asking me to [example]"

---

## How It Works: Step by Step

### Step 1: User Selects Notes
- Click 1+ notes on canvas (standard multi-select)
- AI button becomes active (if 0 notes selected, button is disabled/grayed)

### Step 2: User Opens Chat
- Click AI button
- Chat window opens in <1 second
- Message area shows: "I can organize, create tasks, ask questions, or help you think through your selected notes. What would you like?"
- Input field is focused (cursor blinking, ready to type)

### Step 3: User Types Instruction
- Example: "Organize by priority"
- No character limit enforced in UI (but backend has limits)
- User can press Enter or click send button (→)

### Step 4: AI Processes
- Request sent to backend
- Backend:
  1. Serializes selected notes
  2. Adds full canvas context
  3. Sends to Claude with user instruction + system prompt
  4. Claude determines: Valid or Invalid?
  5. If valid: Returns structured JSON result
  6. If invalid: Returns error + suggestion

### Step 5: Result Lands on Canvas
- If successful: New nodes appear on canvas (groups, tasks, questions, etc.)
- Chat shows: "Created 3 priority groups"
- Input field becomes active again (user can send another instruction)

### Step 6: User Can Continue
- Type new instruction on same selection
- Close chat window (click X)
- Or select different notes and open AI again

---

## Smart Boundaries

### Claude System Prompt (Simplified)

```
You are Klad, a thinking partner for solo professionals.

YOU CAN:
- Organize/group notes by user criteria
- Extract actionable tasks
- Ask targeted questions about canvas content
- Find patterns and contradictions
- Summarize and clarify thinking

YOU CANNOT:
- Answer external knowledge questions (weather, news, stocks)
- Generate ideas from scratch
- Execute destructive operations
- Access anything outside the canvas

RESPONSE FORMAT:
Always return JSON:
{
  "success": true/false,
  "type": "groups" | "tasks" | "questions" | "analysis" | "error",
  "items": [...],
  "summary": "1-2 sentence explanation"
}

If request is invalid:
{
  "success": false,
  "error": "Explanation of what went wrong",
  "suggestion": "Try asking me to [example]"
}
```

---

## Error Handling

### Case 1: No Notes Selected
- **What:** AI button disabled
- **Message:** "Select"
- **Action:** User selects notes, button becomes active

### Case 2: Vague Instruction
- **User types:** "Make this better"
- **AI responds:** "I need specificity. Your notes seem to cover [detected topic]. Did you want me to organize them or ask questions?"
- Chat stays open for user to refine

### Case 3: Out of Scope
- **User types:** "What's the weather?"
- **AI responds:** "I can only work with your canvas notes. Try asking me to organize, create tasks, or ask questions about your selected notes."

### Case 4: Request Takes Too Long
- **Loading state:** Spinner appears, message "Thinking..."
- **Timeout:** If >10 seconds, error: "Request timed out. Try again?"

### Case 5: Token Limit Hit
- **Trigger:** Canvas too large + instruction too complex
- **Error:** "Your canvas is too large. Select fewer notes and try again."

---

## Rate Limiting & Freemium

### Free Tier
- 50 AI calls/month (across all instructions)
- Max 5 calls/hour (prevents spam)
- Visible counter: "12 calls remaining"
- One call = one instruction (doesn't matter if result is small or large)

### Pro Tier (EUR 19/mo)
- Unlimited calls
- No rate limiting
- Same chat experience

---

## Follow-Up Instructions

### User Can Send Multiple Instructions Without Re-Selecting

**Example workflow:**
```
1. Select 12 notes about product roadmap
2. Click AI
3. Type: "Organize by quarter"
   → Result: 4 groups appear (Q1, Q2, Q3, Q4)
4. Type: "Now create tasks from Q1"
   → Result: 5 task cards appear
5. Type: "Ask me questions about Q2"
   → Result: 3 questions appear
6. Close chat
```

**Why this matters:**
- No friction
- Fast iteration
- Canvas stays focused on same context

---

## Visual States

### State 1: Closed
- Chat window not visible
- AI button visible in toolbar (enabled if notes selected, disabled otherwise)

### State 2: Open (Waiting for Input)
- Chat window visible
- Default message: "I can organize, create tasks..."
- Input field focused
- Send button active

### State 3: Processing
- Loading spinner in message area
- Input field disabled
- Send button disabled
- Close button still active

### State 4: Result Received
- Chat shows: "Created [X groups/tasks/questions]"
- Input field active (ready for next instruction)
- User can type new instruction or close

### State 5: Error
- Chat shows error message in red
- Error explanation + suggestion
- Input field active (user can retry)

---

## Integration Points

### Canvas
- When result lands: New nodes appear near selected notes
- Optional animation: Brief highlight on new nodes
- Undo works: User can undo if they don't like result
- Links: Tasks link back to source notes

### Freemium
- Call counter visible (maybe in bottom-right of chat window)
- When limit reached: "You've used your 50 free calls. Upgrade to Pro for unlimited."

### Projects
- Chat is per-project (each project has its own call count)
- If user switches projects, chat closes

---

## MVP Scope: What's Built

- Chat window UI (open/close, input, send)
- Basic styling (matches Klad design system)
- Instruction send
- API integration (send to backend)
- Claude system prompt (domain detection, error handling)
- Result landing on canvas (nodes appear)
- State management (open/closed, loading, messages)
- Error handling (clear messages + suggestions)
- Rate limiting (free tier max 5/hour, counter visible)
- Token budgeting (serialize only selected notes + canvas context)

## MVP Scope: What's NOT Built (v1.1+)

- Chat history persistence (doesn't save across sessions)
- Suggested completions / auto-complete
- Voice input to chat
- Rich formatting (markdown, links, etc.)
- Attachments in chat
- Branching conversations
- Chat sidebar (only overlay window)
- Multi-select of results
- Advanced context awareness (remembers previous instructions in session)

---

## Success Criteria

1. **Fast open:** AI button click → window appears <1 second
2. **Responsive input:** Typing feels instant, no lag
3. **Valid requests execute:** "Organize by priority" → result on canvas <3 sec
4. **Invalid requests caught:** "What's the weather?" → clear error + suggestion
5. **Results are contextual:** Not generic, references their actual notes
6. **Iteration is frictionless:** Can send multiple instructions without re-selecting
7. **Errors are helpful:** User understands why request failed
8. **No confusion:** User knows what they can/can't ask
9. **Freemium works:** Counter visible, rate limiting prevents abuse

---

## Current State (What Exists Today)

### Components Being Replaced
- `components/canvas/KladAiButton.tsx` — Dropdown with 3 fixed actions (Organize, Critical Questions, Create Tasks)
- 3 separate API routes: `/api/klad/organize`, `/api/klad/critical-questions`, `/api/klad/create-tasks`
- 3 separate handler functions in `Canvas.tsx` (~500 lines total)

### Components Being Kept
- `components/canvas/AiUsageCounter.tsx` — Usage display (may be relocated into chat window)
- `lib/ai/serialize-canvas.ts` — Node serialization + token budgeting
- `lib/db.ts` — `getAiUsage()`, `incrementAiUsage()`, `getUserPlan()` functions
- `/api/klad/usage` — Usage stats endpoint
- Canvas reducer actions (`APPLY_ORGANIZE`, `PASTE_NODES`) — Result landing logic

### AI Stack
- Model: `google/gemini-2.5-flash` (via Vercel AI SDK v6)
- Structured output: Zod schemas + `Output.object()`
- Auth: Supabase `getUser()` per request

---

## The Philosophy

Klad's AI isn't trying to be ChatGPT.

It's trying to be:
- **Contextual** — knows your canvas, your thinking
- **Smart** — recognizes domain (business vs. design vs. project)
- **Bounded** — only solves canvas-related problems
- **On-canvas** — results land where you're working
- **Iterative** — you can refine in seconds

That's what makes it different. Not a chatbot. A thinking partner.
