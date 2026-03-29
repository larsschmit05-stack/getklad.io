# CLAUDE.md — How to Write Implementation Plans for AI Coding Assistants

**Purpose:** This document explains how to structure implementation plans so Claude Code (and other AI coding assistants) can execute them effectively and produce production-quality code.

**Audience:** Project leads, architects, and anyone writing implementation specifications for AI-assisted development.

---

## Core Principle

**An implementation plan is NOT code.** It's a detailed spec of *what* you want, *how* it must work, and *why* it matters. The AI coding assistant decides *how to code* it.

The goal: Give enough context that the AI can make good architectural choices, but don't prescribe the exact implementation. This allows the AI to:
- Choose appropriate libraries and patterns
- Suggest optimizations
- Catch edge cases
- Provide better error handling

---

## Structure of a Good Implementation Plan

### 1. High-Level Objective (One Sentence)

```
✅ GOOD:
"Build the canvas editor component using tldraw, enable real-time state syncing,
and establish the core interaction model."

❌ BAD:
"Create Canvas.tsx"
(Too vague — doesn't explain why or what "canvas editor" means)
```

### 2. "What We Want" Section

**This is the most important section.** Describe the feature from the user's perspective and the system's perspective, but NOT the code.

```markdown
### What We Want

#### Feature A
- When user does X, system should do Y
- System must support Z capability
- Data must be persisted in W way

#### Feature B
- User can open/edit/delete B
- B is stored as JSON in database
- Real-time syncing happens in background
```

**Include:**
- User-facing behavior (what they see and do)
- System-level behavior (what happens behind the scenes)
- Constraints and requirements (size limits, timeouts, etc.)
- Edge cases (empty state, errors, etc.)
- Data persistence and caching

**Do NOT include:**
- Exact function names or file structure (that's for the AI to decide)
- Specific npm packages (suggest, don't mandate)
- React hooks API calls (the AI knows React)
- SQL queries (the AI knows SQL)

### 3. "How It Must Work" Section

**Describe the workflow in detail, but at a high level.** This is like a narrative walkthrough of the feature.

```markdown
### How It Must Work

**First Load:**
1. User navigates to /projects
2. Page fetches project data from API
3. Projects list appears
4. User clicks "New Project"
5. Modal opens for project name
6. User types name and clicks "Create"
7. API creates project and returns ID
8. Page navigates to /projects/[id]

**Editing:**
1. User adds sticky notes to canvas
2. After 2 seconds of inactivity, canvas state syncs
3. Sync happens in background (optimistic update)
4. On network error, shows toast and auto-retries
```

**Include:**
- User journey (step-by-step)
- System interactions (what calls what)
- Timing (when things happen)
- Error scenarios (what if the network fails?)
- State transitions (what state the app is in after each step)

**Do NOT include:**
- React code (onClick handlers, useState, etc.)
- Exact error messages (the AI can write good messages)
- CSS or styling details (mention the vibe, not the pixels)

### 4. Dependencies

**What must be done before this step can start.**

```markdown
### Dependencies
- Step 1: Project scaffold exists
- Step 2: Database schema created
- Step 3: Authentication working
```

**Be explicit.** If an earlier step must complete first, say so. If steps can run in parallel, note that.

### 5. Success Criteria

**Testable checklist of what done looks like.**

```markdown
### Success Criteria
- [ ] User can sign up with email
- [ ] Magic link email is received
- [ ] Clicking magic link redirects to /projects
- [ ] Unauthenticated users cannot access /projects
- [ ] Sign-out clears session and redirects to /auth/login
- [ ] No TypeScript errors in IDE
```

**Include:**
- Functional tests (user can do X)
- Integration tests (system does Y when X happens)
- Quality gates (no errors, proper types, good performance)

**Do NOT include:**
- Unit test names (the AI can write those)
- Code coverage targets (let the AI do reasonable coverage)
- Internal implementation details (e.g., "Cache is implemented with Redis")

### 6. Risks & Mitigations

**What could go wrong and how to prevent it.**

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| RLS policies too permissive | Medium | Write policies, test with 2 accounts, verify in Studio |
| Network error during save | Low | Implement retry queue, show toast, auto-retry after 5s |
| Database connection fails | Low | Handle timeout gracefully, show error to user |

**Include:**
- What could break (security, performance, data loss)
- How likely it is (Low, Medium, High)
- How to prevent or recover from it

**This section saves time.** By listing risks upfront, the AI can:
- Add proper error handling
- Avoid common pitfalls
- Test edge cases proactively
- Document assumptions

---

## What NOT to Include

### ❌ Code Examples
```
❌ BAD:
"Create a useState for loading state:
const [loading, setLoading] = useState(false)"
```

The AI knows React. Let it choose the implementation.

### ❌ Exact File Names or Paths
```
❌ BAD:
"Create file: app/api/projects/route.ts with function export POST"

✅ GOOD:
"Create API endpoint for projects CRUD: list, create, read, update, delete.
Endpoint should handle authentication and return proper status codes."
```

The AI can decide the best file structure.

### ❌ Specific Library Choices (Unless Required)
```
❌ BAD:
"Use axios for HTTP requests"

✅ GOOD:
"Fetch data from API endpoints using standard HTTP client"
```

Unless a library is critical (like tldraw for canvas), let the AI choose.

### ❌ Performance Targets (Unless Hard Constraints)
```
❌ BAD:
"API response must be <100ms"

✅ GOOD:
"API should be fast and responsive. If slow, consider caching."
```

Let the AI optimize for the actual constraints.

### ❌ SQL Queries or Schema Details (Unless Critical)
```
❌ BAD:
"SELECT * FROM projects WHERE user_id = $1 AND created_at > NOW() - INTERVAL '7 days'"

✅ GOOD:
"Fetch projects for a user, with support for filtering by date range"
```

The AI can write good SQL. Just describe what you need.

---

## Size & Scope

### Keep Steps Manageable

**Good step size:** 4–8 hours of work with AI assistance
- Not too small (0.5 hour) — trivial to implement, not worth planning
- Not too large (3+ days) — breaks down further, or combines unrelated work

```
✅ GOOD:
"Step 3: Authentication System (Sign-Up, Login, Logout, Middleware)"
(Cohesive feature area, ~1.5 days)

❌ BAD:
"Step 3: Build the entire app backend"
(Too large, unrelated components)

❌ BAD:
"Step 3.1: Create sign-up form input field"
(Too small, trivial)
```

### Combine Related Work

```
✅ GOOD:
"Step 4: Projects & Canvas Data Layer (API Routes)"
Includes:
- Projects CRUD endpoints
- Canvas state API
- Database query helpers
- Ownership verification

(All related to data access, can be done together)

❌ BAD:
Separate steps for each endpoint:
- Step 4a: GET /api/projects
- Step 4b: POST /api/projects
- Step 4c: GET /api/projects/[id]
...
(Related work split across many steps, context switching)
```

---

## Language & Clarity

### Use Active Voice
```
✅ GOOD:
"User can sign up with email"
"System verifies ownership before returning data"

❌ BAD:
"Sign-up functionality should be provided"
"Ownership should be verified"
```

### Be Specific
```
✅ GOOD:
"When user clicks 'Delete', show confirmation modal with 'Cancel' and 'Delete' buttons.
On confirmation, call DELETE /api/projects/[id]. On success, remove card from list.
On error, show toast with error message and allow retry."

❌ BAD:
"Handle the delete action"
```

### Avoid Assumptions
```
✅ GOOD:
"Canvas state is stored as JSON in Supabase.
On save failure, show toast and auto-retry after 5 seconds.
If 3 retries fail, show persistent alert asking user to reload."

❌ BAD:
"The canvas will auto-save"
(What happens on failure? How often? Unclear.)
```

---

## Examples in This Project

### Good Example: week_1_implementation.md Step 2

**What makes it good:**
- Clear objective
- Detailed "What We Want" section with subsections for each component
- "How It Must Work" with concrete examples
- Explicit RLS policy behavior (security is critical)
- Risks include data leakage and trigger failures
- Success criteria are testable

### How to Use It:
1. Claude Code reads it
2. Understands: "I need to create 6 tables with RLS policies and 2 triggers"
3. Decides: "I'll use Supabase CLI for migrations"
4. Writes: SQL schema, creates migration files, runs triggers
5. Tests: Creates test users, verifies isolation

The plan gave enough context without prescribing the exact approach.

---

## Checklist for Writing Implementation Plans

Before handing a plan to Claude Code, ask:

- [ ] Is the objective clear in 1-2 sentences?
- [ ] Does "What We Want" describe user-facing behavior and system behavior?
- [ ] Does "How It Must Work" walk through a complete workflow?
- [ ] Are dependencies listed (what must be done first)?
- [ ] Are success criteria testable?
- [ ] Are risks identified with mitigations?
- [ ] Is the scope 4–8 hours of work (not too big, not too small)?
- [ ] Did I avoid prescribing exact code, function names, packages?
- [ ] Did I include edge cases and error scenarios?
- [ ] Did I use clear, specific language?

---

## Anti-Patterns

### ❌ "Design Your Own Implementation" Plans

```
❌ Plan:
"Build a projects management system. Make it scalable, performant, and secure.
Use best practices. Have fun!"

Why it fails:
- No specifics
- AI doesn't know what "scalable" means to you
- No success criteria to verify against
- High risk of wrong direction
```

### ❌ "Code in English" Plans

```
❌ Plan:
"Create a function that takes a userId, fetches projects from the database,
filters by created_date, and returns a JSON array sorted by name.
Use async/await and handle errors with try-catch."

Why it fails:
- This is just pseudo-code
- AI can write this better than the description
- Prescriptive, no room for optimization
- Misses "what if the database is slow?" risk
```

### ❌ "Disconnected Steps" Plans

```
❌ Plan:
Step 1: Create models
Step 2: Create database schema
Step 3: Create API routes
Step 4: Create UI components
Step 5: Wire UI to API

Why it fails:
- Each step doesn't work in isolation
- No coherent feature completion
- Context switching between unrelated work
- Hard to test or verify mid-project
```

### ✅ "Feature-Driven" Plans

```
✅ Plan:
Step 1: Scaffold Next.js project, set up environment
Step 2: Create database schema and RLS policies (all auth/data infrastructure)
Step 3: Build authentication system (sign-up, login, logout, middleware) — users can now log in
Step 4: Create projects CRUD API (users can create/list/delete projects)
Step 5: Build canvas UI with tldraw (users can open canvas and edit)
Step 6: Create projects list page (users can manage their projects)

Why it works:
- Each step is a coherent feature area
- Features are cumulative (Step 5 depends on Step 4, etc.)
- Can test and verify incrementally
- Clear boundaries and success criteria
```

---

## Review Checklist for Others

If someone else wrote the implementation plan, review:

- [ ] Can I understand what the user needs without looking at wireframes?
- [ ] Can I understand what the system should do without looking at code?
- [ ] Are the success criteria clear enough to test?
- [ ] Are the risks realistic and mitigations feasible?
- [ ] Would an AI assistant be able to implement this without asking for clarification?
- [ ] Is there room for the AI to make good architectural decisions?
- [ ] Are the step sizes reasonable (not too big or small)?

---

## Final Advice

**The best implementation plan is one where the AI can:**
1. Understand what you want
2. Ask smart questions if anything is unclear
3. Implement it in a way that's better than you imagined
4. Test it and verify it works
5. Hand it back to you ready to ship

**Write for clarity, not completeness.** If you're unsure about a detail, it's better to say "this needs more thought" than to write a vague requirement that the AI has to guess about.

**Your goal is collaboration,** not control. The AI is a tool to help you build faster. Give it enough context to do good work, then let it do its best.

---

## Questions?

When in doubt, ask:
- "Does a reader unfamiliar with this project understand what we're building?"
- "Could this be tested to verify it works?"
- "Does this plan let the AI make smart choices, or does it prescribe every detail?"

If the answer is "no" to any of these, revise the plan before handing it to Claude Code.

Good plans → good code → good product. 🚀
