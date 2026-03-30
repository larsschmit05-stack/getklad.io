# Canvas Interaction Patterns & UX Learnings

This document captures key UX patterns and technical learnings from the arrow connection and shape creation improvements (Mar 30, 2026).

## Overview

The canvas interaction system distinguishes between two fundamental shape creation modes:
- **Click (no drag)** → creates element with fixed default size (independent of zoom)
- **Drag** → creates element with user-defined size based on drag distance

This pattern applies to ALL creation tools: rect, ellipse, text, sticky, arrow, and image.

---

## Arrow Connection UX Pattern

### Snap Zone & Visual Feedback

**Snap Zone Detection:**
- Center-distance based: 60px radius from target node's center point
- When cursor enters snap zone, arrow endpoint snaps to target node's center
- Visual feedback: Blue border highlight renders around target node when snapped
- X-marker ("×") renders at target node center (not at edge point) to indicate connection point

**Preview Arrow Rendering:**
- Source endpoint: calculated via `getBBoxEdgePoint(fromNode, targetX, targetY)` pointing toward the final arrow endpoint
- Target endpoint (when snapped): calculated via `getBBoxEdgePoint(targetNode, fromNodeCenterX, fromNodeCenterY)` pointing back toward source
- Target endpoint (when not snapped): follows cursor position
- Lines render straight (strokeLinecap: "butt") to avoid visual warping from dashed patterns

**Final Arrow Rendering:**
- Uses `getConnectedArrowEndpoints(fromNode, toNode)` which computes edge points for both nodes
- Endpoints always render at node boundaries (never at center) for visual clarity
- Matches preview arrow endpoint when snapped during drag

### Connection Drop Behavior

**Successful Connection (drop inside snap zone):**
- Creates `arrow` node with `fromNodeId` and `toNodeId` properties set
- Final arrow renders as line between node boundaries via ArrowNode.tsx

**Free Arrow (drop outside snap zone):**
- Creates `arrow` node with NO node IDs (free-form arrow)
- Uses stored vector offset (dx, dy) from node position as fallback
- Matches Figma behavior: can start connection from node, release outside snap zone, get unconnected arrow

---

## Shape Creation UX Pattern

### Click vs Drag Behavior

**Click (immediate release, hasMoved = false):**
- Rect/ellipse: created with fixed default size (100×100px typically)
- Text/sticky: created with fixed default size
- All elements created at center of click point
- Size independent of zoom level (not adjusted by camera.zoom)

**Drag (mouse moves > 4px, hasMoved = true):**
- Rect/ellipse: created with dimensions derived from drag distance
- Drag direction: can drag from any corner/edge toward opposite corner
- Geometry normalized by `normalizeRect()` to handle negative width/height
- User can drag right/down, left/up, or diagonally—all handled identically
- Shape position and size reflect actual drag extent

### Critical Implementation Details

**hasMoved State Tracking:**

The `hasMoved` flag must be set during `handlePointerMove` in the specific drag mode:
- **In "move" mode** (dragging existing selected node): set hasMoved=true (original code)
- **In "create-shape" mode** (dragging to create new shape): set hasMoved=true when drag distance > 4px (critical fix added Mar 30)
- **In "connect-arrow" mode**: already sets hasMoved=true correctly

Bug pattern: hasMoved was only set in "move" mode, causing ALL drag-to-create shapes to use default size regardless of drag distance.

**Drag Distance Calculation:**

In create-shape mode, calculate screen-space drag distance:
```typescript
const dx = (e.clientX - interaction.current.dragStartClientX) / cam.zoom;
const dy = (e.clientY - interaction.current.dragStartClientY) / cam.zoom;
if (!interaction.current.hasMoved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
  interaction.current.hasMoved = true;
}
```

Store dragStartClientX and dragStartClientY during handlePointerDown for distance calculation.

### Preview Rendering

During shape drag-to-create:
- Render semi-transparent preview of shape at each pointerMove
- Preview geometry must match final committed geometry (use same normalizeRect logic)
- Clear preview on pointerUp after shape is committed
- If preview geometry diverges from final geometry, user sees jarring jump/warp effect

---

## Arrow Preview Visual Consistency

### The Warping Problem

**Original Issue:** Arrow preview lines appeared to bend or curve during drag, especially with dashed stroke patterns.

**Root Causes:**
1. `strokeLinecap="round"` on dashed arrows caused dash segments to extend beyond their endpoints, creating optical illusion of curvature
2. Source edge point calculated toward cursor position rather than final arrow endpoint, causing preview line to bend as cursor moves while endpoint stays on target node edge

**Solution:**
1. Changed strokeLinecap to "butt" on arrow shafts (both preview and final rendering in ArrowNode.tsx)
2. Recalculated source edge point to aim toward final target endpoint:
   ```typescript
   const srcEdge = getBBoxEdgePoint(fromNode, arrowX2, arrowY2);  // point toward final endpoint
   ```
3. This ensures arrow remains geometrically straight throughout drag

### Endpoint Consistency Pattern

**Preview vs Final:**
- **Source:** Both use edge point calculation pointing toward target
- **Target (snapped):** Both use edge point calculation pointing back toward source
- **Target (unsnapped):** Preview points to cursor; final arrow would be free-form

When preview and final endpoint calculations match, there's no visual jump when the arrow is committed.

---

## Geometry Utilities Used

### Key Functions from lib/canvas/geometry.ts

**`normalizeRect(x, y, width, height)`**
- Handles negative width/height from any-direction dragging
- Returns canonical AABB: `{ minX, minY, maxX, maxY }`
- Used in both preview rendering and final shape commit
- Do NOT override with forced constraints (e.g., forced square aspect ratio)

**`getBBoxEdgePoint(node, towardX, towardY)`**
- Returns point on node's boundary along ray from center toward (towardX, towardY)
- Critical for arrow endpoint calculations
- Used in both preview and final arrow rendering for consistency

**`getConnectedArrowEndpoints(fromNode, toNode)`**
- Returns both start and end points for arrow between two nodes
- Uses getBBoxEdgePoint internally for both nodes
- Only called for final arrow rendering when both node IDs are set

**`pointInNode(worldX, worldY, node, hitPadding)`**
- Checks if point hits node including special handling for arrows and freehand
- Can be used for snap zone detection with custom hitPadding
- Current implementation uses simpler center-distance approach (could be improved)

---

## Snap Zone Design Trade-offs

### Current Approach: Center-Distance

**Advantage:**
- Simple to understand and implement
- Predictable snap behavior
- Works reasonably well across different node sizes

**Disadvantage:**
- For large nodes (300×200px): cursor can be on node edge while center-distance > 60px—no snap
- For small nodes close together: snap can trigger unintentionally
- Not proportional to node size

### Alternative Approach: Bbox-Proximity

**Better for variable node sizes:**
- Check if cursor is within bbox + hitPadding of target node
- Use `pointInNode(worldX, worldY, node, hitPadding: 30)` with large padding
- Snap when cursor is close to any part of node boundary

**Trade-off:** Slightly more expensive per-frame, but more intuitive for mixed node sizes

Current implementation (center-distance 60px) is adequate for MVP; future improvement could switch to bbox-proximity for better UX with variable-sized nodes.

---

## Design System Integration

Canvas interactions follow Klad's editorial design palette:
- **Selected node highlight:** Blue border (~2px, using --klad-ink color)
- **Snap indication:** Small gray "×" marker at connection point
- **Preview shapes:** Semi-transparent overlay matching node's stroke color with opacity ~0.5
- **Snap zone visual:** Blue border highlight on target node (optional; helps discoverability)

---

## Testing Checklist

After making changes to arrow connection or shape creation:

1. **Click to create** → element appears at default size
2. **Drag to create** → element size matches drag extent
3. **Drag any direction** → rect/ellipse works dragging left/right/up/down equally
4. **Arrow preview** → stays straight from source edge to target (or cursor if not snapped)
5. **Arrow snap** → target node highlights blue when cursor in 60px snap zone
6. **Arrow snap drop** → creates connected arrow; X-marker at target center
7. **Arrow outside snap** → creates free-form arrow with stored dx/dy vector
8. **Preview vs final** → no visual jump when shape/arrow commits
9. **Zoom handling** → click-created sizes stay fixed; drag sizes scale correctly; preview geometry matches final

---

## References

- **Canvas State Management:** `lib/canvas/reducer.ts`
- **Geometry Helpers:** `lib/canvas/geometry.ts`
- **Main Interaction Handler:** `components/Canvas.tsx` (handlePointerDown, handlePointerMove, handlePointerUp)
- **Arrow Rendering:** `components/canvas/nodes/ArrowNode.tsx`
- **Arrow Node Type:** `lib/canvas/types.ts` (CanvasNode with props.type === "arrow")
