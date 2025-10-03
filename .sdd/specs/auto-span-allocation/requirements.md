# Auto Span Allocation Requirements

## Problem Summary
Drawing teams need a one-click way to convert a selected scaffold line into construction-ready spans aligned to the 1,800 mm baseline so the canvas immediately communicates span layout without manual calculations.

## Acceptance Criteria
- [ ] "割付" (Allocate) is only actionable when exactly one scaffold line is selected; otherwise, the control is disabled and an accessible hint explains how to select a line first.
- [ ] Allocation computes span lengths using as many 1,800 mm units as possible, then fills the remainder with 1,500 mm → 1,200 mm → 900 mm → 600 mm → 150 mm in order, covering the full line length within ±1 mm tolerance.
- [ ] Each resulting span is persisted in state with a stable id, length, start/end coordinates, and a reference back to the source line so future edits (e.g., exports) can consume the data structure.
- [ ] Visual markers (filled circles) are created at every internal span boundary along the line, derive their color from the line appearance, and render at the correct snapped coordinates for horizontal, vertical, and diagonal lines.
- [ ] Allocation updates remove or overwrite any previously generated spans/markers for the line to prevent duplicates when the user re-runs the action after editing the line.
- [ ] If the remaining length cannot be satisfied by the fallback sizes (e.g., total length < 150 mm), the app shows a non-blocking warning, preserves the original line/markers, and leaves no partial data behind.
- [ ] After a successful allocation, the status bar (or equivalent live region) announces the resulting span sequence (e.g., "1800 × 4, 1500, 600") for screen-reader users.
- [ ] Allocation completes within 50 ms for lines up to 30,000 mm so drawing interactions remain responsive.

## Constraints and Dependencies
- **Tech stack**: Must stay within the existing React + TypeScript + Konva client app; no new runtime dependencies unless reviewed.
- **State model**: Extending `Block`, `Marker`, or introducing a new `LineSpan` entity must stay compatible with JSON/PNG/PDF export flows defined in `App.tsx` and future rectangular span support.
- **UI contract**: The existing Tool Palette "割付" control should trigger the feature without altering other tool behaviors (draw, marker, note, etc.).
- **Offline operation**: Feature cannot require network access and must function entirely in the local browser environment.
- **Color fidelity**: Marker rendering must reuse the selected line color palette to align with current design tokens.

## Open Questions and Follow-Ups
- Should allocated spans appear in `BlockListPanel` alongside existing blocks, or live in a separate span inspector?
- How should spans be serialized in the export payload (inline with `lines`, separate collection, or reuse `blocks`)?
- Do we need undo/redo hooks or history entries when allocation runs multiple times on the same line?
- What circle radius and hit area should markers use to balance visibility with selection accuracy?
- Is there a requirement to support partial manual edits (e.g., removing a specific span) after auto allocation?

Requirements complete. Review content, then run `/sdd-design` or choose `/sdd-highway` to fast-track design, tasks, and implementation.
