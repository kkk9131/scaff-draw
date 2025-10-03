# Technology Stack

## アーキテクチャ
クライアントサイドのみで完結するシングルページアプリケーション。Vite をビルドツールとし、React 18 + TypeScript で UI を構築。キャンバス描画は Konva / react-konva を使用し、保存系処理は FileSaver.js と jsPDF で実現します。バックエンド連携は無く、ローカルブラウザ上での完全オフライン動作を前提としています。

## 使用技術
### 言語とフレームワーク
- TypeScript 5.x：型付きフロントエンド実装
- React 18：コンポーネントベース UI
- Vite 4：開発サーバーとビルド

### 依存関係
- konva 9.x：キャンバス描画エンジン
- react-konva 18.x：React とのバインディング
- file-saver 2.x：JSON / PNG のローカル保存
- jspdf 2.x：PDF 出力
- html2canvas / purify-es などは jsPDF 経由でバンドル（生成物に含まれる）

## 開発環境
### 必要なツール
- Node.js 18 以上（npm 同梱）
- 任意のモダンブラウザ（動作確認用）

### よく使うコマンド
- 起動: `npm run dev`
- ビルド: `npm run build`
- Lint: `npm run lint` (※ eslint 設定済み、必要に応じて)

## 環境変数
現状のローカル専用アプリでは環境変数は不要。将来的に SCAFF API と連携する際に追加を検討。
