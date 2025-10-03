# 技術設計書

## アーキテクチャ概要
既存の React + Vite + TypeScript 構成に機能追加する。スナップ単位はアプリケーションの共通状態として `App.tsx` で管理し、`ToolPalette` に UI を追加、`CanvasArea` では描画ロジックを拡張する。Konva ステージのグリッド描画やドラッグ後の座標処理にスナップ値を反映させるが、現行のデータモデル構造自体（Block/Marker/Note）は変更しない。

## 主要コンポーネント
### App コンポーネント
- 責務：全体状態管理（ブロック・マーカー・メモ・選択状態・スナップ単位）と各 UI コンポーネントの連携。
- 入力：ユーザー操作（UI イベント）、既存の初期データ。
- 出力：子コンポーネントへの props、保存ファイルへの出力。
- 依存関係：`ToolPalette`、`CanvasArea`、`BlockListPanel`、`StatusBar`。

### ToolPalette コンポーネント
- 責務：ツール操作 UI の提供。スナップ単位トグルボタンを追加し、現在値を表示。
- 入力：`activeMode`、`snapSize`、各種ハンドラ。
- 出力：モード変更イベント、スナップ切替イベント。
- 依存関係：`App` から提供されるハンドラ。

### CanvasArea コンポーネント
- 責務：Konva を用いたキャンバス描画とユーザー操作イベントの通知。グリッド表示をスナップ単位に応じて変化させ、ドラッグ終了時にスナップ値に丸める。
- 入力：`blocks`、`markers`、`notes`、`snapSize`、座標更新ハンドラ。
- 出力：`onMousePositionChange`、`onSelectBlock`、`onBlockDragEnd` 等。
- 依存関係：Konva Stage / Layer、`App` からの state。

### SnapUtil（新規ユーティリティ関数）
- 責務：座標をスナップ単位に応じて丸める共通処理。
- 入力：実数座標値、スナップ単位。
- 出力：丸め済み座標値。
- 依存関係：特になし（純粋関数）。

## データモデル
### SnapSettings
- `snapSize`: number — 現在選択されているスナップ単位。初期値 300。
※ 既存の Block / Marker / Note のフィールドは変更せず、座標値に丸め結果を保存する。

## 処理フロー
1. ユーザーがサイドバーのスナップトグルをクリックすると `App` の `snapSize` state が 150↔300 で切り替わる。
2. `ToolPalette` は props 経由で受け取った `snapSize` を表示ラベルに反映。
3. `CanvasArea` は再レンダリングされ、グリッド表示関数が `snapSize` を参照して 150mm 補助線と 300mm 主線を描く。
4. ユーザーがブロック等をドラッグすると、`dragend` イベントで座標を取得し、共通スナップ関数で丸めた値を `App` に通知。`App` は該当ブロックの座標を更新。
5. 新規要素の配置やメモ追加時も、snapSize を参照して初期座標を丸める。

## エラーハンドリング
- 不正なスナップ値（150/300 以外）が設定されることは想定しないが、防御的にスナップ関数内で 1 以上の値のみ許容し、それ以外はそのまま返す。
- Konva drag イベントで座標が取得できないケース（null）では処理をスキップし、state を変えない。
- スナップ切替時にグリッド描画が失敗した場合はコンソールにログを出し、既定の 300mm 表示にフォールバック。

## 既存コードとの統合
- 変更が必要なファイル：
  - `src/App.tsx`：`snapSize` state 追加、ハンドラ実装、子コンポーネントへの props 受け渡し。
  - `src/components/ToolPalette.tsx`：スナップトグル UI の追加、プロップ定義の更新。
  - `src/components/CanvasArea.tsx`：グリッド描画ロジック拡張、ドラッグ終了イベントでスナップ計算。
  - `src/components/BlockListPanel.tsx`（必要に応じて）：座標表示をスナップ値に合わせて更新（丸め後の値を表示）。
  - `src/App.css` などスタイル調整（トグルボタンの見た目）。
- 新規作成ファイル：
  - `src/utils/snap.ts`（想定）：`snapToGrid(value: number, snapSize: number): number` を提供し、複数箇所で再利用。
