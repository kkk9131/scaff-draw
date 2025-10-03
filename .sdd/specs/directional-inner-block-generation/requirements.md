# Directional Inner Block Generation Requirements

## Problem Summary
Drafting a scaffold perimeter currently stops at raw outer lines, forcing users to manually compute inward offsets, block orientations, and column markers. Automating the inner band generation based on draw direction lets designers stay in the flow and immediately confirm span layout accuracy.

## Acceptance Criteria
- [ ] Completing a scaffold line in draw mode automatically creates a linked block band entity flagged as `autoInnerBand`, without requiring an extra confirmation step.
- [ ] The system derives the inward offset from the line's draw direction (→ = down, ↓ = left, ← = up, ↑ = right) and respects diagonal vectors by projecting the perpendicular inward normal, ensuring bands always appear on the intended side.
- [ ] Generated bands apply the block width currently selected in the sidebar (600 mm or 355 mm) and refresh in place if the user changes the width and requests a reallocation.
- [ ] Span allocation across the outer line uses 1,800 mm units first, then 1,500 mm → 1,200 mm → 900 mm → 600 mm → 150 mm while keeping the total within ±1 mm of the line length; each span stores ids, endpoints, length, and the source line reference.
- [ ] Visual output renders the original outer line plus an inward offset outline forming a filled band, with blocks rotated parallel to the source line and markers positioned at every span boundary and both outer corners using the line color.
- [ ] Editing, moving, or redrawing the source line invalidates prior bands and recomputes the geometry so no stale offsets or duplicate markers remain.
- [ ] When the line length is shorter than the minimum allocation size or allocation fails, the UI surfaces a non-blocking warning, leaves the outer line untouched, and avoids creating partial band data.
- [ ] Inner band generation, including drawing updates for lines up to 30,000 mm, completes within 50 ms to keep pointer interactions responsive.

## Constraints and Dependencies
- **Canvas stack**: Must stay within the existing React + TypeScript + Konva frontend without introducing new runtime dependencies.
- **Data model**: New band/block structures must export cleanly alongside existing `Block`, `Marker`, and `Line` data for JSON/PNG/PDF flows.
- **Tooling contract**: Works with the current draw tool selection model and does not alter other modes (markers, notes, block list editing).
- **Offline requirement**: Operates entirely client-side with no network or backend requests.
- **Color tokens**: Reuse the established palette/value pipeline so line and marker colors stay consistent with design tokens.

## Open Questions and Follow-Ups
- How should bands behave when multiple connected lines share corners—should adjacent bands snap/merge at shared vertices automatically?
- Should undo/redo capture each auto-generated band as a single action with the source line edit, or remain a separate future enhancement?
- Do we need configurable tolerance for offset overlap when bands intersect existing blocks or notes?

Requirements complete. Review content, then run `/sdd-design` or choose `/sdd-highway` to fast-track design, tasks, and implementation.
