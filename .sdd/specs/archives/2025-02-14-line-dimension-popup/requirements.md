# Line Dimension Popup Requirements

## Problem Summary
Current canvas interactions allow drawing scaffold lines but lack an inline way to correct their exact length. Users must redraw segments when a measurement is off, which is slow and error-prone. We need a lightweight popup editor that appears at the selected line, accepts a millimeter value, and updates the underlying line state while preserving orientation and snap consistency.

## Acceptance Criteria
- [ ] Clicking a selectable line in draw/edit mode highlights it and displays a single-field popup at the line midpoint, focused and pre-filled with the current length in mm.
- [ ] The popup accepts only positive numeric values (integer mm) and blocks submission when empty, zero, negative, or non-numeric; validation feedback is shown inline and the prior length remains untouched until a valid value is submitted.
- [ ] Pressing Enter with a valid value adjusts the line length while maintaining its original orientation vector and midpoint origin, rounding endpoints to the active snap unit (150 mm or 300 mm) before updating React state and re-rendering via Konva.
- [ ] Pressing Escape, clicking elsewhere, or removing popup focus without submission restores the original highlighting, closes the popup, and keeps the line unchanged.
- [ ] After confirmation the popup closes, the line returns to its normal stroke color, and any downstream length-dependent markers/labels refresh to reflect the new measurement.
- [ ] The interaction is fully keyboard accessible: the input auto-focuses, supports Enter/Escape shortcuts, and exposes validation messaging to screen readers.
- [ ] The popup positions itself above the Konva canvas using an HTML overlay that tracks stage scaling/panning, and remains performant when editing multiple lines in rapid succession (no >50 ms re-renders for single updates).

## Constraints & Dependencies
- Uses existing React state shape for lines `{ startX, startY, endX, endY, length }`; updates must stay in sync with Konva rendering and any measurement labels.
- Must honor current snap settings (`DEFAULT_SNAP_SIZE` 300 mm or `SECONDARY_SNAP_SIZE` 150 mm) when computing new endpoints, leveraging existing `snapToGrid` utility.
- Works offline without new network calls; relies only on already installed libraries (React, Konva). No additional heavyweight dependencies should be introduced.
- Popup styling should match the app’s Tailwind/utility CSS approach and avoid introducing new theming systems.
- Feature is always on—no new feature flags or configuration toggles—yet should degrade gracefully if no line is selected.

## Open Questions & Follow-Up Tasks
- How should midpoint adjustment behave for lines anchored to structural nodes—do we ever need to keep one endpoint fixed instead of the midpoint? (Requires stakeholder confirmation.)
- Should the popup support real-time preview (length updates while typing), or is confirmation-on-Enter sufficient for this release? (Decision impacts debouncing logic.)
- Confirm minimum and maximum allowable line lengths (e.g., enforce multiples of 150 mm?) to avoid invalid geometry.
- Determine whether updated lengths must propagate to derived metadata (CSV export, future JSON schema) beyond the immediate canvas rendering.
- Identify testing strategy (unit vs. integration with Konva) once the design is approved.
