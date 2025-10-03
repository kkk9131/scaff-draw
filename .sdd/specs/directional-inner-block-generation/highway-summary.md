# Highway Summary

## Design Decisions
- Generated inner bands reuse existing span allocation logic, layering additional geometry via a dedicated `innerBand` metadata payload per line to avoid duplicating model state.
- Default deck width selection now lives in the left sidebar so new lines respect the operator’s context without extra dialogs, while per-line changes still run through the length popup.
- Canvas rendering treats auto-generated spans as oriented polygons, hiding their locked list entries on the stage and using color-coordinated fills/markers to signal block boundaries and corners.

## Implementation Notes
- Added `computeInwardNormal`/`buildInnerBandGeometry` utilities plus TypeScript types to persist band outlines, span polygons, and marker roles.
- Hooked new helper `applyInnerBandUpdate` into line creation, manual reallocation, length edits, and width edits so the inner band stays in sync with the source line and width selection.
- “割付” 操作は選択状態に依存せず全線へ再適用するよう統一し、寸法ポップアップを経由せずバッチ更新できるようにした。
- Extended the marker system with corner roles and refreshed automatic marker/block cleanup to prevent duplicates on repeated allocations.
- Line length popup adds an “inner band flip” control so operators can reverse the automatically chosen inward side without redrawing lines.
- Orientation picker now stores absolute directions (上/下/左/右) so reversing draw direction no longer mirrors the generated band unexpectedly.
- Updated canvas rendering to draw the offset band and span polygons beneath the original line, skipping auto inner-band blocks in the draggable layer to preserve orientation.

## Tests
- `npm test`
- `npm run build`

## Follow-Ups
- Consider clipping/merging adjacent bands at shared vertices for complex perimeters.
- Evaluate undo/redo grouping so auto band generation aligns with line edit transactions.
