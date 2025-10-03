# Auto Span Allocation Tasks

| # | Task | Objective | Key Files / Areas | Definition of Done | Owner | Order / Dependencies |
|---|------|-----------|-------------------|--------------------|-------|----------------------|
| 1 | Domain type extensions | Add span-aware fields to `ScaffoldLine`, `Block`, and `Marker` models so downstream work compiles | `src/types.ts`, related type consumers | Types updated with `metadata.spans`, `spanChecksum`, `sourceLineId`, `locked`, `lineId`, `generated`; app builds without TypeScript errors | TBD (default: kazuto) | Must precede tasks that persist spans or markers |
| 2 | Span planning utility | Build deterministic allocator for 1,800 mm baseline and fallbacks | `src/utils/spanPlanner.ts`, `tests/spanPlanner.test.ts` | Pure function returns ordered segments, handles <150 mm warning, unit tests cover baseline and edge cases | TBD | Depends on Task 1 (types for planner return shape) |
| 3 | Line projection helper | Map span lengths to coordinates along any line orientation | `src/utils/lineProjection.ts`, `tests/lineProjection.test.ts` | Utility converts lengths into `{start,end}` pairs within ±1 mm of endpoints; tests cover horizontal/vertical/diagonal lines | TBD | Parallel with Task 2 after Task 1 |
| 4 | Allocation controller integration | Wire `handleAllocate` → `allocateLineSpans` to update lines, blocks, markers atomically | `src/App.tsx`, new controller module if extracted | Selected line validated; spans stored in `metadata.spans`; markers regenerated with color + flags; blocks synced with `locked`/`sourceLineId`; summary string emitted | TBD | Requires Tasks 1–3 |
| 5 | UI enablement & rendering | Reflect allocation in UI, enforce selection requirements, render markers | `src/components/ToolPalette.tsx`, `CanvasArea.tsx`, `BlockListPanel.tsx`, `StatusBar.tsx`, styles if needed | "割付" button disabled until a line is selected with tooltip/hint; markers draw with new color props and ignore duplicates; BlockList shows generated spans as read-only; StatusBar announces summary | TBD | Depends on Task 4 (state shape) |
| 6 | Tests & documentation pass | Exercise controller and UI via component tests; update export docs | `tests/allocateLineSpans.test.tsx`, `docs/scaffdraw-design.md`, regression checklist | React Testing Library test covers happy path & underflow warning; docs describe `metadata.spans`; manual export smoke checklist executed and logged | TBD | Final task; requires Tasks 2–5 |

## Notes & Sequencing
- Tasks 2 and 3 can proceed in parallel once Task 1 lands.
- Task 4 is the integration hinge; schedule extra review time.
- Task 5 relies on Task 4’s state contract but can stage CSS tweaks in parallel.
- Task 6 should run after functional pieces stabilize; it can overlap with final QA.

## Potential Blockers
- Ensuring existing block manipulation logic respects new `locked` flag—coordinate with anyone touching split/delete features.
- Konva marker styling changes may need visual calibration; reserve time for manual canvas review.
- CI test harness coverage for new files—verify Jest/Vitest config picks up the `tests/*.test.ts` additions.

Link back to design: `.sdd/specs/auto-span-allocation/design.md`.
