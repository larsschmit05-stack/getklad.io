# Custom Canvas Engine — Product Requirements Document

**Status:** Planned
**Priority:** High
**Owner:** Lars

---

## Purpose

Define a custom canvas engine for Klad that can replace tldraw while staying aligned with the main product direction:
- solo-first
- desktop-first MVP
- canvas-first AI output
- Supabase as the primary backend platform

This document is not a separate product vision. It is a canvas-engine replacement spec for the product defined in `docs/klad-prd.md`.

---

## Decision

Klad will move from `tldraw` to a **custom node-based canvas engine** focused on the product's actual core use case:
- spatial thinking
- text notes
- images
- connector lines
- AI-generated structured output on the canvas

The engine is not a general-purpose whiteboard. It is intentionally narrower than Miro/FigJam and optimized for solo builders.

---

## Why Replace tldraw

- Full control over UX, interaction model, and AI insertion behavior
- Smaller conceptual surface area than a general whiteboard engine
- Easier to shape around Klad-specific primitives instead of adapting generic drawing abstractions
- Better long-term fit for structured AI outputs, node metadata, and deterministic serialization

### Non-goal

This is **not** a rewrite to build a full drawing tool. Freehand drawing, shape libraries, multiplayer, and whiteboard-style complexity remain out of scope for MVP.

---

## Alignment With Main Product Docs

This PRD intentionally stays aligned with `docs/klad-prd.md` and `docs/General_implementation_plan.md` on these points:

- **Solo-first:** no multiplayer or collaboration in MVP
- **Desktop-first:** mobile support is basic only, not a primary launch requirement
- **Canvas fundamentals remain core:** text, images, connector lines, pan/zoom, multiple projects
- **Canvas-first AI:** Organize, To Tasks, and Critical Questions insert or modify canvas nodes
- **Supabase platform:** Postgres for canvas state, Supabase Storage for images

This document changes only the canvas implementation choice, not the product strategy.

---

## MVP Scope

### 1. Viewport & Navigation

- Infinite canvas with unbounded world coordinates
- Smooth pan and zoom
- Mouse wheel zoom centered around cursor
- Trackpad pinch-to-zoom where supported
- Pan via:
  - drag empty canvas with spacebar held
  - middle mouse drag
  - trackpad/two-finger pan where available
- `Cmd/Ctrl + 0` resets zoom and frames content
- `Escape` clears selection
- `Delete/Backspace` deletes selected editable nodes
- `Cmd/Ctrl + A` selects all selectable nodes

### 2. Node Types

#### Text Node
- User-created editable note
- Plain text only for MVP
- Inline editing via DOM overlay

#### Image Node
- Displays image from Supabase Storage URL
- Stores asset metadata, dimensions, alt/name metadata
- Resizable

#### AI Output Node
- Used for Organize, To Tasks, and Critical Questions
- Same underlying canvas primitive as text node, but with:
  - AI metadata
  - distinct styling
  - optional locked/guarded behavior depending on feature

#### Connector
- Simple directional or undirected visual connection between two nodes
- Stored as its own record type
- Renders as straight or lightly-routed line
- Must move correctly when connected nodes move

### 3. Selection & Manipulation

- Single select
- Multi-select with `Cmd/Ctrl + click`
- Drag marquee selection
- Drag selected nodes to move
- Resize selected single node via corner/edge handles
- Double-click text node to edit
- Click canvas to deselect

### 4. Persistence

- Canvas state stored in `canvas_state` as JSONB
- One persisted canvas per project
- Auto-save debounced to 2 seconds after changes
- Load on page open
- If load fails, show explicit load error state
- Never silently replace failed loads with blank state

### 5. Sharing

- Read-only shared canvas view supported by the same engine
- Shared view disables editing, selection handles, destructive shortcuts, and AI actions
- Text, images, and connectors remain visible

---

## Explicitly Out of Scope For MVP

- Real-time collaboration
- Presence cursors
- Comments
- Undo/redo history beyond a minimal local buffer if needed for implementation
- Copy/paste across browser sessions
- Arbitrary custom shapes
- Freehand drawing
- Layers panel
- Offline-first sync
- Export to PDF/image
- Mobile-first UX optimization

---

## Interaction Model

### Create

- Clicking an empty area opens quick-create for a text node at that position
- Optional shortcut: `N` or `Cmd/Ctrl + N` creates a text node at viewport center
- Image insertion uses upload flow, then places image node into the canvas
- AI actions insert nodes into the current viewport or near the current selection

### Edit

- Text editing uses an HTML textarea/input overlay anchored to the node bounds
- Blur or explicit confirm saves text changes
- Escape cancels in-progress editing where possible

### Move & Resize

- Dragging selected nodes updates world position
- Resizing updates node bounds in world coordinates
- Image resize preserves aspect ratio by default

### Connect

- Users can create connector lines between nodes
- Connectors attach to node anchors, not raw screen positions
- Moving a connected node updates the connector automatically

---

## Data Model

Canvas state must use **world coordinates**, not viewport coordinates.

```json
{
  "version": 1,
  "camera": {
    "x": 0,
    "y": 0,
    "zoom": 1
  },
  "nodes": [
    {
      "id": "uuid",
      "type": "text",
      "x": 120,
      "y": 80,
      "width": 280,
      "height": 120,
      "rotation": 0,
      "content": {
        "text": "My note"
      },
      "style": {
        "variant": "default"
      },
      "meta": {}
    }
  ],
  "connectors": [
    {
      "id": "uuid",
      "fromNodeId": "uuid-a",
      "toNodeId": "uuid-b",
      "meta": {}
    }
  ]
}
```

### Requirements

- IDs are stable UUIDs
- Coordinates are canvas/world-space values
- Schema is versioned from day one
- Invalid records are ignored or quarantined safely, not allowed to crash the renderer
- The renderer must tolerate unknown future fields

---

## Rendering Architecture

The engine should use a **hybrid architecture**:

### Render Layer

- Primary scene rendered with Canvas 2D or SVG
- Viewport transform handled centrally
- Visible-region culling for performance

### DOM Overlay Layer

- Text editing
- Selection handles
- Context menus
- Inline controls
- Accessibility/focusable controls where needed

### Why Hybrid

Pure canvas rendering is a bad fit for text editing, focus, IME behavior, and selection handles. Pure DOM rendering is simpler but becomes expensive as the scene grows. Klad should combine both.

---

## Performance Requirements

- Smooth pan/zoom with 100+ nodes on typical laptop hardware
- Canvas with 50 nodes should load in under 1 second on a warm path
- Editing and dragging must feel immediate
- Rendering should avoid full-scene rerenders on every pointer move where possible

### Required Strategies

- World-to-screen transform abstraction
- Viewport culling
- Stable scene graph diffing or draw scheduling
- Batched state updates for drag/resize interactions

---

## Backend Integration

### 1. Canvas State

- Save to existing `canvas_state` table
- Replace `tldraw_state` usage with engine-owned serialized state
- Keep API route shape stable where practical to reduce migration cost

### 2. Images

- Use **Supabase Storage**, not Vercel Blob
- Canvas stores asset metadata:
  - storage path
  - public or signed URL strategy
  - width
  - height
  - mime type
  - original file name

### 3. AI

- AI receives structured canvas context, not raw DOM or image binaries
- Organize, To Tasks, and Critical Questions return structured node operations:
  - create nodes
  - update nodes
  - create connectors
  - group spatially

### 4. Sharing

- Shared routes render the same canvas engine in read-only mode
- Shared viewers never receive edit capabilities or privileged asset operations

---

## Migration Requirements

This document replaces tldraw as the engine choice, so migration must be explicit.

### Migration Questions To Solve

1. Will existing `tldraw_state` rows be discarded, migrated, or supported temporarily?
2. Do we need a one-time migration script?
3. Should `canvas_state` store a `format` field such as `tldraw` vs `klad_v1` during transition?

### Recommended Approach

- Add a format/version marker to persisted canvas state
- Support reading old and new formats temporarily if data already exists
- Prefer a one-way migration path once the custom engine is stable

---

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Rewrite takes longer than expected | High | Cut scope aggressively to text, images, connectors, selection, and autosave only |
| Text editing in custom engine becomes brittle | Medium | Use DOM overlay for editing from the start |
| Connector math becomes unstable | Medium | Keep connectors simple in MVP; anchor only to nodes, not arbitrary ports |
| Performance degrades as scene grows | Medium | Build culling and camera transforms early, not as a later optimization |
| Data loss from autosave bugs | Medium | Explicit dirty state, in-flight save protection, last-good-state recovery |
| Storage/auth complexity around images | Medium | Stay on Supabase Storage to reuse current platform and auth model |

---

## Success Criteria

### Functional

- [ ] Custom canvas renders on `/projects/[id]`
- [ ] User can create and edit text nodes
- [ ] User can upload and place image nodes
- [ ] User can create connector lines between nodes
- [ ] User can select, move, resize, and delete nodes
- [ ] Canvas auto-saves after 2 seconds of inactivity
- [ ] Canvas reloads correctly from persisted state
- [ ] Shared read-only canvas view renders correctly

### Product

- [ ] Organize inserts structured AI output onto the canvas
- [ ] To Tasks inserts task-oriented nodes onto the canvas
- [ ] Critical Questions inserts question nodes onto the canvas
- [ ] Free Prompt remains sidebar-only

### Technical

- [ ] Persisted state uses versioned custom schema
- [ ] No silent data loss on load/save failure
- [ ] Performance remains acceptable at 100+ nodes
- [ ] Desktop interaction is reliable in modern Chromium, Safari, and Firefox

---

## Open Questions

1. Should AI output nodes be hard-locked, soft-locked, or just visually distinct?
2. Should connector lines support labels in MVP or later?
3. Should new text node creation be immediate on single click, or click-then-type via explicit tool mode?
4. Do we want a minimal local undo stack for usability even if full history is out of scope?
5. What is the exact migration path for already-saved tldraw documents, if any?

---

## Build Sequence

1. Finalize data model and migration strategy
2. Build camera/world transform layer
3. Build node rendering and hit testing
4. Add selection, move, resize, and text editing
5. Add connectors
6. Add autosave/load and load-failure handling
7. Add image upload/rendering via Supabase Storage
8. Add read-only shared mode
9. Integrate AI node operations

---

## Bottom Line

The custom canvas only makes sense if it stays narrower than a whiteboard product and sharper than tldraw for Klad's actual job:

**help solo builders spatially dump, organize, and act on ideas with AI output landing directly on the canvas.**
