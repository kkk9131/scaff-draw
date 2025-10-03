# Interactive Line Drawing Design

## Architecture Overview
- **Interaction States**: Extend `App` with a `lineDraft` state capturing `{ startX, startY, currentX, currentY, mode: 'idle' | 'dragging' | 'two-click' }` and `draftMeta` for `color` / `style`. This drives a preview overlay rendered by `CanvasArea` when active.
- **Event Flow**:
  1. User activates draw mode via `ToolPalette` → `App` sets `uiMode='draw'` and resets `lineDraft`.
  2. `CanvasArea` listens to Konva `Stage` pointer events: `mousedown` (start drag), `mousemove` (update preview), `mouseup` (commit) and `click` sequences for the two-click workflow.
  3. On each pointer update, coordinates are converted from pixels to mm (`MM_TO_PIXEL_SCALE`) and snapped using `snapToGrid`.
  4. Preview line is rendered as a Konva `Line` in a dedicated `Layer` (above grid, below confirmed lines) using draft state, adopting selected color/style.
  5. On commit, `App` validates via `validateLineLengthValue` and `calculateLineLength`; if success, append new `ScaffoldLine` to `lines` and emit aria-live message. Otherwise, show inline status message and revert.
- **System Boundaries**: UI remains client-side React + Konva. No backend calls. JSON export/import flows in `App` gain awareness of line `color` / `style` properties.

## Data Models & Contracts
- Update `ScaffoldLine`:
  ```ts
  type LineStyle = 'solid' | 'dashed';
  type LineColor = 'black' | 'red' | 'blue' | 'green';

  interface ScaffoldLine {
    id: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    length: number;
    orientation: LineOrientation;
    color: LineColor;
    style: LineStyle;
    metadata?: { blockId?: string };
  }
  ```
- Draft state (internal only):
  ```ts
  interface LineDraft {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    status: 'idle' | 'dragging' | 'awaiting-second-click';
  }
  interface LineAppearance {
    color: LineColor;
    style: LineStyle;
  }
  ```
- Utility additions:
  - `generateLineId(prefix: string = 'line'): string` to ensure uniqueness (e.g., timestamp + counter).
  - `snapPointToGrid({x, y}, snapSize)` returning cohesive point object.

## Detailed Approach
- **Mode Handling**:
  - In `CanvasArea`, guard event handlers by `uiMode === 'draw'`; ignore events otherwise.
  - Support two entry flows:
    - *Drag*: on `mousedown` store snapped pointer as `start`, set status to `dragging`; update `current` on move; on `mouseup` call commit.
    - *Two-click*: On first `click`, set status `awaiting-second-click` and store `start`. While awaiting, `mousemove` updates `current`. Second click commits.
- **Preview Rendering**:
  - `CanvasArea` computes points `[startX, startY, currentX, currentY]` (in pixels) and renders `Line` with stroke/dash derived from appearance. Provide translucent fill or handle pointer events as needed (set `listening=false` to avoid intercepting future clicks).
- **Validation & Commit**:
  - On commit, compute snapped `end` coordinate and derive `length`. If `length < snapSize` or validation error occurs, display error via new `lineDrawingWarning` state (shown in status bar or toast) and keep draft active for correction or cancellation.
  - Successful commit appends new line to `lines` with recalculated orientation, resets draft state, triggers aria-live message (`ラインを追加しました ...`).
  - `Esc` resets draft; `Enter` confirms if draft is active (mainly for keyboard support).
  - Announce validation failures and commit success through a polite `aria-live` region to support screen readers.
- **Color/Style Selection**:
  - Extend `ToolPalette` with color buttons / dropdown and dashed toggle; `App` maintains `currentLineAppearance`. Draft and final lines use this configuration.
  - Default values align with previous visuals (black solid).
- **Accessibility**:
  - Add visually hidden live region in `App` for draw mode announcements (enter mode, commit success, cancellation, validation failure).
  - Ensure buttons have aria labels (e.g., “線色: 赤”).
- **Import/Export compatibility**:
  - When loading legacy JSON (no `color`/`style`), assign defaults. Export includes these fields.

## Alternatives Considered
1. **Separate Draft Canvas**: Render preview in a plain HTML canvas overlay. Rejected: duplicates logic and complicates layering with existing Konva setup.
2. **Global Pointer Listeners on window**: Provide drag detection outside canvas. Rejected: stage-level listeners suffice and avoid coordinate mismatch.
3. **Immediate commit without validation**: Would simplify flow but risks unsnapped or invalid lines; keeping validation ensures geometry consistency.

## Risks & Mitigations
- **Event Conflicts**: Konva groups for blocks may intercept pointer events. Mitigate by rendering preview in top layer with `listening=false`, and ensuring stage-level listeners call `event.cancelBubble = true` where necessary.
- **Snap-induced zero-length**: If start and end snap to same grid point, commit should warn. Validation already covers this; message should instruct user.
- **Performance**: Frequent state updates might re-render components. Use React state for draft but limit to essential values; avoid re-creating arrays by memoizing preview props.
- **Accessibility Complexity**: Multi-step interactions may be hard for keyboard users. Provide fallback: arrow keys to nudge draft? Deferred, but ensure at least Esc/Enter support and announcements.
- **ID Collisions**: Relying on timestamps alone may collide on rapid creation. Use `crypto.randomUUID()` when available, fallback to counter.

## Testing Strategy
- **Unit Tests**: 
  - Validate `snapPointToGrid`, `generateLineId`, and commit logic (ensuring snapped endpoints, orientation, length). 
  - Tests for color/style defaults when importing legacy JSON.
- **Component Tests**:
  - Simulate drag workflow: `mousedown` → `mousemove` → `mouseup`, assert preview visibility and new line appended.
  - Simulate two-click workflow, verifying status transitions and validation errors for short lines.
  - Ensure color/style controls update preview and final stroke/dash.
- **Integration**:
  - Render `App`, activate draw mode, perform interactions to confirm aria-live announcements and JSON export including new fields.
- **Manual QA Checklist**:
  - Esc cancellation, Enter confirmation, right-click abort.
  - Switching modes mid-draft resets state without residual preview.

## Deployment / Migration Considerations
- No backend or build pipeline changes. Ensure local storage or saved JSON remains compatible by defaulting color/style on load.
- Update documentation (`docs/scaffdraw-requirements.md` or changelog) to mention new drawing capabilities and controls.
- Optionally provide migration script if existing saved files should include explicit color/style; otherwise rely on defaults at runtime.

## Open Questions Assumptions
- Color/style selector resides in `ToolPalette` left sidebar with simple buttons. If stakeholders prefer modal/popup, adjust later.
- During drawing, size popup remains inactive; editing occurs post-commit.
- Validation errors displayed via status bar message; toast system out of scope for this iteration.
- Keyboard-only drawing beyond Enter/Escape is deferred; main requirements focus on mouse interaction with minimal keyboard support.
