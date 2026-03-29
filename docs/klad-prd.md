# Klad
## Product Requirements Document

**Version:** v0.1 — MVP
**Owner:** Lars (solo founder)
**Status:** Pre-build
**Domain:** useklad.com
**Stack:** Next.js · Supabase · tldraw · Anthropic API · Stripe

---

## 🎯 One-Line Pitch
> **"A canvas where you brain dump — Klad AI turns your chaos into clarity."**

---

## 1. Product Vision

### What is Klad?
Klad is an **AI-native canvas tool** built for solo founders and vibecoders. It gives you an infinite canvas to brain dump — sticky notes, images, rough text, connections. **Klad AI reads everything on the canvas** and helps you:
- **Organise chaos into structure** — AI groups and labels your scattered thoughts
- **Ask critical questions** — AI identifies gaps and blind spots in your thinking
- **Convert thoughts into tasks** — AI transforms ideas into concrete action items

The output lands **directly on the canvas** — not in a chat sidebar. Think **Mural, but built for one person, with AI as a first-class feature rather than an add-on.**

---

## 2. Problem & Opportunity
### The Gap
Solo builders and vibecoders think **visually and chaotically**. They need a space to dump half-formed ideas, reference images, and rough plans — and then make sense of it all without a team to think with.

**Current tools fail them:**
- **Mural & FigJam** — built for team workshops, cluttered with collaboration features, not optimized for solo thinking
- **Canvas tools** (Miro, Notion) — store thoughts but do nothing with them; purely passive
- **AI tools** (ChatGPT) — can't see your canvas; you have to copy-paste context every time
- **No connection to action** — thinking spaces don't link to tasks, code, or next steps
- **Result:** founders spend time organizing their own notes instead of building

---

## 3. Target User

### Primary: Indie SaaS Founders & Vibecoders
- Solo or small team
- Builds in public
- Uses Claude Code, Vercel, Supabase
- **Thinks visually** — mixes screenshots, references, and rough ideas
- Price-sensitive but willing to pay for tools that genuinely save time
- Frustrated by tools built for enterprise teams

### Secondary: Creative Solo Builders
- Designers, content creators, and consultants working alone
- Plan projects visually and want AI that understands the full context of their thinking
- Want AI assistance that goes beyond the last prompt

### ❌ Not the Target User
- Enterprise teams needing shared workspaces and permission management
- Users who prefer linear note-taking (Notion, Obsidian)
- Non-technical users with no SaaS or product context

---

## 4. MVP Features & Scope
| Feature | Priority | Week | Notes |
|---------|----------|------|-------|
| **Canvas Fundamentals** | | | |
| Infinite canvas — sticky notes, free text, images, connector lines | Must | 1 | Core interaction model |
| Canvas built on tldraw (open source) | Must | 1 | Not custom-built — proven foundation |
| Multiple projects — one canvas per project | Must | 1 | User's project organization |
| Supabase Auth — user accounts | Must | 1 | Email + magic link |
| Supabase Storage + Postgres — persistence | Must | 1 | Canvas state + metadata |
| **Klad AI** | | | |
| AI sidebar — reads full canvas, accepts natural language | Must | 2 | Context-aware assistant |
| **Organize** mode — select nodes, AI groups & labels them | Must | 2 | Output back to canvas |
| **To Tasks** mode — select text, AI returns action list | Must | 2 | Convert ideas to actions |
| **Critical Questions** mode — AI finds gaps & blind spots | Must | 2 | Challenge your thinking |
| **Monetization & Sharing** | | | |
| Freemium gate — 3 canvases, 50 AI calls/month free | Must | 3 | Rate-limit free tier |
| Stripe integration — €19/mo Pro plan | Must | 3 | Subscription billing |
| Shareable canvas link (read-only) | Should | 3 | Share work with others |
| Basic usage analytics | Should | 3 | AI calls used, canvas count |

---

## 5. Explicitly Out of Scope — v1

❌ **Not building in MVP:**
- Real-time collaboration / team workspaces — solo product first, always
- External integrations (Notion, GitHub, Linear, Slack) — v2 after validation
- MCP server connections — powerful but adds complexity before core is proven
- Mobile app — desktop canvas first, mobile is a separate product decision
- Canvas templates — free-form is the point; templates contradict brain-dump flow
- Export to PDF/image — low priority for v1
- Offline mode — requires significant additional engineering

---

## 6. Klad AI — Behavior Specification

Klad AI is **not a chat interface bolted onto a canvas**. It is a **context-aware assistant** that reads the full state of the canvas before every response.

### AI Modes

| Mode | Trigger | Output |
|------|---------|--------|
| **Organize** | "Organize this" / "Sort these thoughts" | AI groups selected nodes into labeled clusters, repositioned on canvas |
| **Critical Questions** | "What am I missing?" / "Challenge this" | AI returns 3–5 sharp questions as sticky notes on canvas |
| **To Tasks** | "Turn this into tasks" / "Make an action list" | AI returns concrete task list as new nodes on canvas |
| **Free Prompt** | Any natural language input | AI responds based on full canvas context, output in sidebar |

### Product Behavior Rules

1. **Canvas-first experience:** Organize, To Tasks, and Critical Questions produce output on the canvas; Free Prompt remains conversational in the sidebar.
2. **Context-aware by default:** Every AI action should consider the relevant canvas context, prioritizing the user’s current selection and nearby related material.
3. **Structured where needed:** Canvas-output modes must return predictable, structured results that can be rendered reliably in the product.
4. **Graceful failure:** If AI is unavailable or low-confidence, the canvas still works and the user gets a clear retry path.
5. **Privacy-aware handling:** User canvas content may be processed to power AI features, but shared links, private assets, and sensitive data handling must be explicitly controlled.

---

## 7. Technical Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Canvas** | tldraw (open source) | Battle-tested infinite canvas, handles rendering complexity |
| **Frontend** | Next.js on Vercel | Fast deploy, serverless functions, familiar stack |
| **Database** | Supabase Postgres | Canvas data, user records, project metadata |
| **Storage** | Supabase Storage | User-uploaded images on canvas |
| **Auth** | Supabase Auth | Email + magic link, built-in session handling |
| **AI** | Anthropic API (`claude-sonnet`) | Full canvas as context per call |
| **Payments** | Stripe | Subscription billing, free/Pro tier management |
| **Hosting** | Vercel | Edge deployment, serverless, zero DevOps |

---

## 8. Pricing Model

| Tier | Price | Canvases | Klad AI Calls | Features |
|------|-------|----------|---------------|----------|
| **Free** | €0 / mo | 3 | 50 / month | Core canvas, sticky notes, images, shareable link |
| **Pro** | €19 / mo | Unlimited | Unlimited | Everything in Free + remove branding, canvas history, priority support |

### Pricing Rationale
- **€19/mo** is below Mural (€9.99/user/mo billed annually, team minimum) → positioned as affordable for solo founders
- **AI costs absorbed into Pro margin** — estimated ~€2–4/user/mo in API costs at normal usage
- **Free tier rate limits** prevent abuse while letting users try core features

---

## 9. Risk Management

| Risk | Likelihood | Mitigation |
|------|------------|-----------|
| tldraw API changes break canvas integration | Low | Pin tldraw version, review changelogs before upgrading |
| AI costs exceed pricing margin at scale | Medium | Rate-limit free tier strictly (50 calls/mo), monitor cost per user |
| Canvas serialization too large for API context window | Medium | Truncate to selected/visible nodes only; summarize older nodes |
| Users don't engage with AI features — use as Mural only | Medium | Onboarding flow that demonstrates AI value in first 60 seconds |
| Anthropic API downtime affects core feature | Low | Graceful degradation — canvas still works, AI shows 'unavailable' state |
| No differentiation from FigJam AI (released 2024) | Medium | FigJam AI is for teams. Klad is solo-first — different positioning and UX |

---

## 10. Validation Plan — Before Full Build

**Goal:** Validate that solo founders will pay for this before investing 3–4 weeks of engineering.

### Fake-Door Test Approach
1. **Landing page** (1 day — already done as HTML)
2. **Add Tally waitlist form** — collect email + "what tool do you currently use for this?"
3. **Run €20–40 in Twitter ads** — target 'indie hacker', 'solo founder', 'vibe coding', 'build in public'
4. **Post on IndieHackers + Twitter** — organic reach from builder community

### Go/No-Go Signal
- ✅ **Green light:** 50+ waitlist signups within 2 weeks
- 📊 **Qualitative signal:** Read every waitlist response — what tool are they replacing?

---

## 11. Success Metrics

| Metric | Month 1 | Month 3 | Notes |
|--------|---------|---------|-------|
| **Waitlist signups** | 50+ | — | Pre-build go/no-go signal |
| **Active free users** | — | 100+ | Post-launch engagement |
| **Pro subscribers** | — | 10+ | €190+ MRR target |
| **MRR** | €0 | €190+ | 10 subscribers × €19 |
| **AI interaction rate** | — | >60% of active users | Core feature adoption |
| **Canvas completion** | — | >3 nodes avg per session | Engagement depth |
| **Waitlist conversion** | >30% | — | Landing page quality |

---

## 12. Recommended Build Sequence

### Week 1: Canvas Foundations
- Scaffold Next.js app on Vercel
- Integrate tldraw canvas
- Implement Supabase Auth + canvas persistence
- Basic sticky notes and image upload working

### Week 2: Klad AI Integration
- Build AI sidebar component
- Implement canvas serialization to context string
- Wire Anthropic API (`claude-sonnet`)
- Build **Organize** and **To Tasks** modes
- Output lands directly on canvas

### Week 3: Monetization & Sharing
- Freemium gating (3 canvas limit, 50 AI call counter)
- Stripe Pro plan integration
- Basic usage dashboard
- Shareable read-only canvas link

### Week 4: Polish & Launch
- Polish, bug fixes, edge cases
- Onboarding flow that demos AI value in first session
- Deploy to useklad.com
- Open waitlist to early access

---

## Document Maintenance

This document is a **living reference** for Lars as solo founder and builder. Update it as decisions change during build.

**Last rule:** _Ship a working v1. A perfect PRD with no product is worthless._
