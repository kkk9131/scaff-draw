# Auto Span Allocation Requirements

## Problem Summary
Drawing teams need a one-click way to convert a selected scaffold line into construction-ready spans aligned to the 1,800 mm baseline so the canvas immediately communicates span layout without manual calculations.

## Acceptance Criteria
- [x] "割付" (Allocate) is only actionable when exactly one scaffold line is selected; otherwise, the control is disabled and an accessible hint explains how to select a line first.
- [x] Allocation computes span lengths using as many 1,800 mm units as possible, then fills the remainder with 1,500 mm → 1,200 mm → 900 mm → 600 mm → 150 mm in order, covering the full line length within ±1 mm tolerance.
- [x] Each resulting span is persisted in state with a stable id, length, start/end coordinates, and a reference back to the source line so future edits (e.g., exports) can consume the data structure.
- [x] Visual markers (filled circles) are created at every internal span boundary along the line, derive their color from the line appearance, and render at the correct snapped coordinates for horizontal, vertical, and diagonal lines.
- [x] Allocation updates remove or overwrite any previously generated spans/markers for the line to prevent duplicates when the user re-runs the action after editing the line.
- [x] If the remaining length cannot be satisfied by the fallback sizes (e.g., total length < 150 mm), the app shows a non-blocking warning, preserves the original line/markers, and leaves no partial data behind.
- [x] After a successful allocation, the status bar (or equivalent live region) announces the resulting span sequence (e.g., "1800 × 4, 1500, 600") for screen-reader users.
- [ ] Allocation completes within 50 ms for lines up to 30,000 mm so drawing interactions remain responsive.

## Constraints and Dependencies
- **Tech stack**: Must stay within the existing React + TypeScript + Konva client app; no new runtime dependencies unless reviewed.
- **State model**: Extending `Block`, `Marker`, or introducing a new `LineSpan` entity must stay compatible with JSON/PNG/PDF export flows defined in `App.tsx` and future rectangular span support.
- **UI contract**: The existing Tool Palette "割付" control should trigger the feature without altering other tool behaviors (draw, marker, note, etc.).
- **Offline operation**: Feature cannot require network access and must function entirely in the local browser environment.
- **Color fidelity**: Marker rendering must reuse the selected line color palette to align with current design tokens.

## Open Questions and Follow-Ups
- Resolved ✅: 自動スパンは `BlockListPanel` に AUTO バッジ付きで表示し、従来ブロックと同じリストで管理する方針とした。
- Resolved ✅: スパン情報は `lines.metadata.spans` に保存し、自動ブロックは `sourceLineId` で紐付けることでエクスポート互換を維持する。
- Deferred ⏸️: Undo/Redo は既存仕組みが無いため別仕様で検討する。
- Resolved ✅: マーカーは半径 5px（ヒット領域 10px）で線色を継承する。
- Deferred ⏸️: 部分的な手動編集（特定スパン削除など）は今回の範囲外。

## Completion Notes
- 実装で要件の 7/8 を達成（性能計測のみ未実施）。
- UI/状態更新/エクスポート形が整合し、視覚・アクセシビリティ要件も確認済み。
- 自動回帰テスト: `npm run test`; 静的解析: `npm run lint`.
- 今後の宿題: Undo/Redo と部分編集の仕様化、性能計測の追加。

Requirements complete. Review content, then run `/sdd-design` or choose `/sdd-highway` to fast-track design, tasks, and implementation.

