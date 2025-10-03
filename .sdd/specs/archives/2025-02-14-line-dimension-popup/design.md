# Line Dimension Popup Design

## Architecture Overview
- **UI Entry Points**: The feature is driven by user selection on the Konva canvas. `CanvasArea` creates selectable line shapes (to be extracted from the block or future line state) that emit callbacks when clicked. `App` owns the authoritative list of lines and currently passes block data to `CanvasArea`; we will extend this to include a `lines` collection.
- **State Ownership**: `App` holds the canonical line state array `ScaffoldLine[]` with geometry `{ id, startX, startY, endX, endY, length }`. A new piece of UI state tracks `activeLineId`, `isPopupOpen`, and `popupError`.
- **Overlay Rendering**: A new React component `LineLengthPopup` is rendered outside the Konva stage (e.g., layered in `App` next to `CanvasArea`). It receives the stage ref plus line geometry, computes screen coordinates via `stageRef.current?.toCanvas()` helper, and renders an absolutely positioned HTML `<input>` aligned with the line midpoint.
- **Update Flow**: On `Enter`, `LineLengthPopup` dispatches `onSubmit(newLengthMm)`. `App` validates and snaps the new length, updates the selected line in state, and triggers downstream effects (e.g., update block/marker metadata if linked). When the popup closes, `CanvasArea` re-renders the line with default styling.
- **Keyboard Interaction**: The input auto-focuses when the popup mounts. `Escape` or blur calls `onCancel`, which only touches UI state and leaves line data untouched.

### Control Flow Steps
1. User clicks a line → `CanvasArea` calls `onSelectLine(lineId)`.
2. `App` sets `activeLineId`, opens popup, and passes selected line data + stageRef to `LineLengthPopup`.
3. Popup displays current length, handles input/validation. On submit it calls `handleLineLengthChange(lineId, lengthMm)` in `App`.
4. Handler calculates orientation vector and midpoint, applies new half-length to both directions, snaps endpoints using `snapToGrid`, updates state, clears errors, closes popup.
5. Updated state cascades to `CanvasArea`, which re-renders the line and any length labels.

## Data Models & Contracts
- **ScaffoldLine**:
  ```ts
  interface ScaffoldLine {
    id: string;
    startX: number; // mm
    startY: number; // mm
    endX: number;   // mm
    endY: number;   // mm
    length: number; // mm (redundant but useful for labels)
    orientation?: 'horizontal' | 'vertical' | 'diagonal'; // optional helper
    metadata?: { blockId?: string };
  }
  ```
- **LineLengthPopupProps**:
  ```ts
  interface LineLengthPopupProps {
    stageRef: RefObject<Konva.Stage>;
    line: ScaffoldLine;
    snapSize: number;
    isOpen: boolean;
    onSubmit: (nextLengthMm: number) => void;
    onCancel: () => void;
  }
  ```
- The popup returns lengths in integer mm; validation ensures positive values and optionally enforces multiples (pending open question).

## Detailed Approach
- Extend `App` state: add `lines` array and derived selectors for the active line. If blocks are the only primitives today, introduce a conversion step to generate scaffold lines from block edges or store them separately once drawing mode is implemented.
- Update `CanvasArea`:
  - Render Konva `Line` shapes for each `ScaffoldLine` with `listening` enabled.
  - Apply highlighting (`stroke` change, thicker width) when `line.id === activeLineId`.
  - Emit midpoint coordinates via a helper to assist the overlay.
- Implement `LineLengthPopup`:
  - Compute midpoint in mm `mx = (startX + endX)/2`, `my = (startY + endY)/2`.
  - Transform to screen via stage transform: `stageRef.current?.getAbsoluteTransform().point({ x: mx * SCALE, y: my * SCALE })` and adjust for container offset.
  - Render an absolutely positioned `<div>` with `<input type="number">`, inline error text, and hidden ARIA live region for accessibility.
  - Handle keyboard shortcuts with `onKeyDown` (Enter/Escape) and `onBlur` for cancel.
- Length adjustment logic:
  - Derive unit direction vector `ux = (endX - startX)/length`, `uy = (endY - startY)/length`.
  - Compute desired half-length `h = nextLengthMm / 2`.
  - New endpoints: `start' = midpoint - h * u`, `end' = midpoint + h * u`.
  - Snap each coordinate using `snapToGrid` with current `snapSize`.
  - Recalculate actual length from snapped coordinates to update `line.length`.
  - 仕様整合のため、`h` がスナップ単位の整数倍になる長さのみ受け付け（`nextLengthMm % (snapSize * 2) === 0`）。満たさない場合はエラーメッセージで弾く。
- Dependent updates:
  - If markers or block text depend on line length, provide a callback `onLineUpdated(line)` so sibling components recalc derived data (e.g., marker offsets). Initially scope to simple label refresh.

## Alternatives Considered
1. **Inline Konva TextField**: render the popup inside the canvas as Konva HTML. Rejected because HTML inputs in Konva are cumbersome and less accessible.
2. **Sidebar Editing Form**: show length editing in the right panel instead of inline. Rejected because requirements favor in-place correction and fewer HUD journeys.
3. **Auto-preview** while typing: considered but deferred until stakeholders confirm (kept as future enhancement in follow-up tasks).

## Risks & Mitigations
- **Coordinate Drift after Snap**: Snapping both endpoints may shift the midpoint. Mitigate by snapping while keeping midpoint anchored—adjust offsets so midpoint remains constant even after rounding.
- **Stage Transform Complexity**: If zoom/pan is added later, overlay positioning may break. Encapsulate transform logic in a reusable utility and observe adjustments during testing.
- **Accessibility Gaps**: Screen reader support for floating inputs is tricky. Use `role="dialog"`, `aria-modal="true"`, and live regions to ensure announcements.
- **State Divergence**: Blocks and lines might co-exist. Clearly document conversion or migration to avoid editing stale data. Possibly add unit tests ensuring `length` equals computed distance.

## Testing Strategy
- **Unit Tests**: For helpers computing new endpoints and snapping logic (pure functions). Validate orientation, midpoint preservation, and rejection of invalid inputs.
- **Component Tests**: Using React Testing Library to ensure popup opens on selection, enforces validation, handles keyboard, and closes appropriately.
- **Integration Smoke**: Render `CanvasArea` with a mock line, simulate click → length change, assert Konva line props update. Snapshot test may suffice if full Konva simulation is heavy.
- **Accessibility Checks**: axe-core run against the popup component to catch aria regressions.

## Deployment / Migration Considerations
- No backend or deployment pipeline impact; the change ships with the existing Vite build.
- Ensure existing save/export format includes the updated line geometry; if exports currently read from block data only, plan a follow-up migration task to synchronize.
- Add feature to change log / documentation so users understand the keyboard shortcuts and new inline editing workflow.

## Open Questions Assumptions
- Until clarified, we keep midpoint anchoring as default; endpoints move symmetrically.
- Real-time preview is optional and remains off for MVP—submit-on-Enter only.
- 長さ検証は `length >= snapSize` に加えて `snapSize * 2` の倍数を必須とし、ミッドポイントを維持できない寸法は警告で弾く。
