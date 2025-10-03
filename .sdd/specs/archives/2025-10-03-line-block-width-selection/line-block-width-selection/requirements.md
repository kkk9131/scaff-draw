# Line Block Width Selection Requirements

## Problem Summary
Current scaffold drawings treat every perimeter line as if it produced the same 600 mm deck depth, so crews cannot reflect mixed 600 mm / 355 mm conditions that frequently occur around buildings. We need a per-line block-width setting that guides automatic allocation, rendering, and exports so the plan captures the true site constraints without manual post-editing.

## Acceptance Criteria
- [ ] When a scaffold line is selected (via canvas click or block list), the UI reveals a mutually exclusive control to choose 600 mm or 355 mm; the control is hidden/disabled when no line is active and remains keyboard accessible (Tab, Space/Enter).
- [ ] Newly drawn lines default to 600 mm, while existing plans loaded from JSON without a `blockWidth` field assume 600 mm; switching the selector updates a persisted `blockWidth` value on the line state and clears any stale validation errors.
- [ ] Canvas rendering shows each line’s deck band with the correct depth (600 mm ≈ 60 px, 355 mm ≈ 35.5 px) orthogonal to the line orientation, extends it from the line’s start to end, and keeps the band color in sync with the line’s stroke.
- [ ] Auto span allocation recalculates span rectangles and generated markers to fit the chosen block width without leaving gaps or duplicated markers; rerunning allocation after a width change fully refreshes spans for that line.
- [ ] JSON export/import, PNG, and PDF outputs respect the per-line width: exported JSON includes `blockWidth`, reload regenerates the same view, and printed assets visibly differentiate mixed widths.
- [ ] Validation prevents impossible combinations—if a line is shorter than the minimum span plus end clearance for the chosen width, the app explains the conflict and leaves previous spans/bands untouched until the user resolves it.
- [ ] Screen-reader and status messaging announce width changes (e.g., “line L-12 deck width set to 355 millimetres”) so non-visual operators receive confirmation without relying on color alone.

## Constraints and Dependencies
- React + TypeScript + Konva only; do not introduce new runtime dependencies without review.
- Extend `ScaffoldLine` metadata in a backwards-compatible way so existing allocations (`metadata.spans`) and exports keep working.
- Rendering must remain smooth on large drawings (≤ 200 lines) at 60 fps; avoid per-frame recalculation loops.
- Feature must operate entirely offline and without modifying global snap settings or other tool modes.
- Visual design should reuse existing palette tokens and respect contrast requirements for accessibility.

## Open Questions and Follow-Ups
- How should the deck band be drawn at joints where two lines with different widths meet—do we clip at the bisector or allow overlap?
- Do we need a quick toggle in `BlockListPanel` so keyboard users can change width without reopening the canvas popover?
- Should width selection be included in JSON schema versioning (e.g., `schemaVersion`) to signal consumers about the new field?
- Are there additional allowable widths for future releases (e.g., 450 mm) that we should plan for in the UI copy/layout now?
- Confirm whether validation needs to reference structural rules (end posts, ledger allowances) beyond simple span length checks.

Requirements complete. Review content, then run `/sdd-design` or choose `/sdd-highway` to fast-track design, tasks, and implementation.
