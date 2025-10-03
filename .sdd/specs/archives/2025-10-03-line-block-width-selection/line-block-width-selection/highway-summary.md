# Highway Summary

## Design Highlights
- Added `BlockWidth` domain type (600mm / 355mm) with normalizationとバリデーションを追加し、既存ラインとの互換性を保ちながら値を制約。
- ライン編集ポップアップにデッキ幅ラジオチップを追加し、アクティブライン時のみ表示されるアクセシブルな操作系を実現。
- 自動生成スパンおよびブロックカードの高さに選択幅を反映し、キャンバス上のグレー帯は撤去してブロックの帯みで幅差を表現。

## Implementation Notes
- `ScaffoldLine` と自動生成ブロックに `blockWidth` / `width` を付与し、`normalizeScaffoldLine` で旧データを 600 mm に補正。
- `lineWidth.ts` を新設し、許可幅一覧・最小長チェック・クランプを集中管理、割付処理でも幅を伝搬。
- `CanvasArea` にて自動ブロックの高さを幅に合わせてスケールし、ライン下の半透明帯は描画しない設計に変更。ブロックリストからソースラインをアクティベートできるようにして幅編集導線を一本化。

## Tests
- `npm test`
