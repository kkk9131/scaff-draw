# Auto Span Allocation Design

## Requirements Alignment
- Auto spans will surface in the existing `BlockListPanel` as read-only rows grouped per source line, keeping the single list experience while flagging computed spans with a `generated` badge.
- Export payloads keep a single `lines` array; each line gains a `metadata.spans` collection so downstream tooling can replay allocations without a new top-level entity.
- Undo/redo remains out of scope; re-running allocation is idempotent and a future history manager can hook into the single `allocateLineSpans` entry point.
- Auto markers reuse Konva circles with a radius of 5px (~90 mm at current scale) and a 10px hit area to balance visibility and pointer usability.
- Partial manual edits are deferred; spans regenerate wholesale whenever the line changes or allocation reruns.

## Architecture Overview
### System Boundaries & Flow
1. User selects a line (`activeLineId` in `App.tsx`).
2. They press "割付" in `ToolPalette`; the button is enabled only when a single line is active.
3. `handleAllocate` delegates to a new `allocateLineSpans(lineId)` controller.
4. Controller normalizes the latest line geometry, invokes a pure `planSpans(lengthMm)` utility, then projects each span onto the canvas using the line vector.
5. The controller updates:
   - `lines`: attaches the computed spans payload to `line.metadata.spans` and stores a checksum for idempotent reruns.
   - `markers`: replaces any auto markers tied to the line, creating new ones colored with the line appearance.
   - `blocks`: mirrors spans as read-only blocks (`type: 'span'`, `sourceLineId`) so the Block List reflects the allocation.
6. UI re-renders `CanvasArea`, which draws span markers and uses metadata to skip old markers.
7. `StatusBar` receives a live message summarizing the span sequence via the existing `warningMessage`/live region pathway.

### Data Flow Diagram (conceptual)
```
ToolPalette
   │ allocate(lineId)
   ▼
App: handleAllocate
   │ depend on selected line
   ▼
allocateLineSpans(line, appearance)
   ├─ planSpans(length)
   ├─ projectSpansToLine(spanPlan, line)
   ├─ updateLineMetadata(lineId, spans)
   ├─ reconcileMarkers(lineId, spans)
   └─ syncBlocksFromSpans(lineId, spans)
```

### Patterns & Libraries
- Pure utilities for deterministic span planning (`planSpans`) and geometry projection (`interpolatePoint`, `scaleVector`).
- Immutable state updates using `setState` callbacks to avoid stale closures.
- Konva rendering continues via `react-konva`; no new libraries required.
- IDs generated with existing `generateLineId` helper or a new `generateSpanId(lineId, index)` to keep stability between reruns.

### Alternatives Considered
- **On-the-fly computation in Canvas render**: Rejected because export flows and Block List require span persistence beyond rendering.
- **Separate span store detached from `Block` array**: Rejected to avoid duplicating list UI plumbing; reusing `Block` keeps panel features (selection, metrics) without new components.
- **Appending markers to the `Marker` list without cleanup**: Rejected to prevent duplicate rendering and stale interactions when re-running allocation.

## Data Model & Contracts
```ts
interface LineSpan {
  id: string;            // stable per line+index
  lineId: string;
  index: number;         // ordering for rendering and exports
  length: number;        // mm
  start: { x: number; y: number }; // mm coordinates
  end: { x: number; y: number };
  createdAt: number;     // epoch for potential auditing (optional)
}

type ScaffoldLine = {
  // existing fields…
  metadata?: {
    blockId?: string;
    spans?: LineSpan[];
    spanChecksum?: string; // hash of length+orientation to skip redundant work
  };
};

interface Marker {
  id: string;
  blockId: string | null;   // null for auto markers
  lineId?: string;          // new link for cleanup
  x: number;
  y: number;
  color?: LineColor;        // required for auto markers
  note?: string;
  generated?: boolean;      // distinguish auto vs manual
}

interface Block {
  id: string;
  length: number;
  type: 'span' | 'stair' | 'beam-frame' | 'note';
  x: number;
  y: number;
  sourceLineId?: string;    // marks read-only auto span blocks
  locked?: boolean;         // prevents manual split/delete actions
}
```

### Export Contract
- JSON export continues to serialize `blocks`, `markers`, `notes`, `lines`.
- Lines include `metadata.spans` for downstream consumption.
- Auto markers flag `generated: true` so importers can decide whether to display them.
- When importing legacy files (no `spans` metadata), allocation simply yields an empty array and no markers.

## Implementation Outline
1. **Span Planning Utility** (`src/utils/spanPlanner.ts`)
   - Accepts `lengthMm: number` and returns `{segments: number[], remainder: number}` with fallback logic.
   - Includes tolerance handling and returns `{error: 'INSUFFICIENT_LENGTH'}` when <150 mm.
2. **Line Projection Utility** (`src/utils/lineProjection.ts`)
   - Converts span lengths into coordinate pairs along the selected line using normalized vectors.
   - Handles horizontal, vertical, and diagonal lines consistently.
3. **Allocate Controller** (`App.tsx`)
   - Validates prerequisites (line exists, length ≥ 150).
   - Calls utilities, builds spans with ids (`${lineId}-span-${index}`) and coordinates, computes summary string for the StatusBar.
   - Uses functional `setState` to update `lines`, `markers`, and `blocks` atomically.
   - Emits status via `setLiveMessage` and `setLineDrawingWarning`.
4. **UI Wiring**
   - `ToolPalette`: disable "割付" unless `activeLineId` is truthy; show tooltip.
   - `CanvasArea`: color circles from `marker.color` and ignore `generated` markers during selection if needed.
   - `BlockListPanel`: render `locked` spans with disabled action buttons and show source line tag.
5. **Diagnostics & Accessibility**
   - Announce span summary through `StatusBar` `role="status"` region.
   - Log warnings to console for unsupported cases to aid debugging.

## Risks & Mitigations
- **Floating-point drift on diagonal lines**: use vector math with cumulative rounding and final segment adjustment; include unit tests asserting endpoints match line end within 1 mm.
- **State divergence between spans and blocks**: centralize block generation inside `allocateLineSpans` and prevent manual mutations by marking `locked`.
- **Performance for long lines**: utilities use simple arithmetic (O(n) segments); upper bound (≈20 segments) stays well under the 50 ms target.
- **User confusion when re-running allocation**: override previously generated spans/markers and show a toast/live message clarifying the latest sequence.
- **Backward compatibility**: guard optional fields during import/export so older saves continue working.

## Testing Strategy
- **Unit Tests** (`tests/spanPlanner.test.ts`): cover span allocation combinations, remainder handling, tolerance, and the underflow warning path.
- **Geometry Tests** (`tests/lineProjection.test.ts`): validate coordinate outputs for horizontal, vertical, and 45° lines.
- **Component Tests** (`tests/allocateLineSpans.test.tsx`): simulate selecting a line and pressing "割付" to assert state updates, disabled button behavior, and status message text using React Testing Library.
- **Regression Checklist**: manual verification that PNG/PDF exports include markers and no duplicate markers appear after repeated allocations.

## Deployment & Migration
- No backend changes; feature ships with the SPA bundle.
- Existing saved JSON files remain valid; new metadata is additive and optional.
- Document the new export shape in `docs/scaffdraw-design.md` for downstream tooling alignment.
