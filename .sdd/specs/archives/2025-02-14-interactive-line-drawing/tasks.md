# Interactive Line Drawing Tasks

| Priority | タスク名 | 目的・定義 | 対象ファイル | DoD | 担当 |
| --- | --- | --- | --- | --- | --- |
| P0 | ラインモデル拡張 & ID 生成ユーティリティ | `ScaffoldLine` に `color`/`style` を追加し、`generateLineId` や `snapPointToGrid` ユーティリティを実装。既存読み込み時はデフォルト値を補完する | `src/types.ts`, `src/utils/lineGeometry.ts`, `src/utils/validation.ts`, `src/utils/lineId.ts`(新規), `src/App.tsx` | 型エラーなしでビルド成功、旧 JSON 読み込みで既存ラインに色/線種が設定される | 未割当 |
| P0 | ドラフト状態管理の導入 | `App` に `lineDraft`/`lineAppearance`/`lineDrawingWarning` を追加し、モード切替時にリセットする基盤を整える | `src/App.tsx`, `src/types.ts` | 状態が初期化され、描画モード外ではドラフトが存在しない | 未割当 |
| P0 | Canvas イベント実装 (ドラッグ & 2クリック) | `CanvasArea` にステージイベントを設定し、ドラフト更新・プレビュー描画を行う。Esc/右クリックキャンセルも実装 | `src/components/CanvasArea.tsx`, `src/utils/snap.ts`, `src/App.css` | ドラッグ/クリック操作でプレビューが表示され、キャンセルで消える | 未割当 |
| P0 | コミットロジック & バリデーション連携 | ドラフト確定時に `validateLineLengthValue` と `calculateLineLength` でチェックし、新しいラインを `lines` に追加。エラー時はメッセージ表示 | `src/App.tsx`, `src/utils/lineGeometry.ts`, `src/components/StatusBar.tsx`(必要なら) | 妥当な操作でラインが追加され、短すぎる場合はエラー表示される | 未割当 |
| P1 | カラー/線種選択 UI | `ToolPalette` 等に色/スタイル切替 UI を追加し、ドラフトと確定ラインに反映 | `src/components/ToolPalette.tsx`, `src/App.tsx`, `src/App.css` | UI から選択した色/線種がプレビュー・確定ラインに適用される | 未割当 |
| P1 | アクセシビリティ通知 & キーボード操作補完 | aria-live リージョンや Enter/Escape ショートカット、ステータス通知を追加 | `src/App.tsx`, `src/App.css`, `src/components/StatusBar.tsx` | 画面読み上げでモード開始/確定/キャンセルが通知され、Enter/Escape が動作する | 未割当 |
| P1 | JSON 入出力 & 既存データ互換テスト | JSON 読込/書込で `color`/`style` を扱い、デフォルト補完を確認。テスト追加 | `src/App.tsx`, `tests/line-drawing.test.ts`(新規) | JSON 保存/読込で色・線種が保持され、テストがパス | 未割当 |
| P1 | 単体/コンポーネントテスト | `snapPointToGrid`, ID 生成, ドラフト→コミットロジック、コンポーネント操作をテスト | `tests/*.ts`, `tests/components/*.tsx` | テストケースが設計に沿って追加され、`npm run test` がグリーン | 未割当 |
| P2 | ドキュメント更新 & QA チェックリスト反映 | 新機能をドキュメントに追記し、手動 QA 項目を追加 | `docs/scaffdraw-requirements.md`, `.sdd/specs/archives/*`, README 等 | ドキュメントに操作手順と制約が追加され、QA チェックリストが整備される | 未割当 |

## 依存関係 & 並行性
- モデル拡張とドラフト状態の基盤タスク (P0) を完了後、Canvas イベント・コミットロジックを実装。
- カラー/線種 UI はドラフト基盤ができたら並行可能。
- テスト・ドキュメントは機能完成後に実施。

## ポテンシャルブロッカー
- 既存 `CanvasArea` のイベント制御と干渉する可能性。段階的にガードを追加し、テストで回帰を確認する。
- JSON 互換の要件調整が未確定の場合、デフォルト補完方針の確認が必要。

設計参照: `.sdd/specs/interactive-line-drawing/design.md`
