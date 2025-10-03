# Project Structure

## ルートディレクトリ構成
```
/
├── src/                  # React + TypeScript ソース
│   ├── components/       # UI 部品（HeaderBar, CanvasArea など）
│   ├── App.tsx           # 画面全体のレイアウトと状態管理
│   ├── App.css           # 画面レイアウト用スタイル
│   ├── styles.css        # グローバルスタイル
│   └── types.ts          # ドメインモデル型定義
├── docs/                 # 要件定義・設計資料
│   ├── scaffdraw-requirements.md
│   └── scaffdraw-design.md
├── dist/                 # Vite ビルド成果物
├── node_modules/         # npm 依存（バージョン管理対象外）
├── package.json          # npm スクリプトと依存定義
├── tsconfig*.json        # TypeScript 設定
├── vite.config.ts        # Vite 設定
└── .sdd/                 # 仕様駆動開発ドキュメント
    ├── description.md
    ├── specs/
    └── steering/
```

## コード構成パターン
- React コンポーネントは `src/components` に用途ごとに分割し、`App.tsx` が状態と各コンポーネントを調停する。
- Konva を使った描画ロジックは `CanvasArea.tsx` に集約し、ステージ参照やグリッド描画、ブロックレンダリングを担う。
- ドメインデータ（Block, Marker, Note 等）の型定義を `types.ts` にまとめ、シリアライズにも利用。

## ファイル命名規則
- React コンポーネント: PascalCase (`HeaderBar.tsx`, `BlockListPanel.tsx`)
- 型定義: camelCase もしくは PascalCase のインターフェース名 (`Block`, `Marker`)
- スタイル: `.css` 拡張子で画面・グローバルごとに分割
- ドキュメント: Markdown (`.md`) で要件・設計を管理

## 主要な設計原則
- 仕様駆動開発ドキュメントを起点に、要件→設計→実装を段階的に進める。
- 状態管理と描画を分離し、React state をソースオブトゥルースとして Konva へ props 連携。
- 完全ローカル動作を前提にしつつ、将来的な SCAFF 連携を見据えた JSON 互換データモデルを維持。
