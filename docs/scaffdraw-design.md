# ScaffDraw ローカル MVP 設計資料

## 1. コンポーネント構造案
```
App
 ├─ HeaderBar
 │    ├─ SaveJSONButton
 │    ├─ SavePNGButton
 │    ├─ SavePDFButton
 │    └─ NewDrawingButton
 │
 ├─ SideBarLeft (ToolPalette)
 │    ├─ ToolButton(直線描画)
 │    ├─ ToolButton(割付)
 │    ├─ ToolButton(柱マーカー)
 │    ├─ ToolButton(階段)
 │    ├─ ToolButton(梁枠)
 │    └─ ToolButton(テキストメモ)
 │
 ├─ CanvasArea (Konva Stage/Layer)
 │    ├─ GridLayer
 │    ├─ BlockLayer
 │    │     └─ Block (Rect / Line)
 │    ├─ MarkerLayer
 │    │     └─ Marker (柱マーカー)
 │    └─ NoteLayer
 │          └─ Note (Text + 吹き出し)
 │
 ├─ SideBarRight (BlockListPanel)
 │    ├─ BlockListItem (編集・削除・分割)
 │    └─ BlockDetailEditor
 │
 └─ StatusBar
       ├─ MouseCoordinate
       └─ SpanLengthTotal
```

## 2. 状態管理方針（React vs Konva）
- **React（状態管理の中心）**
  - blocks: `id / 長さ / 種別(span, 階段, 梁枠, 等) / 座標`
  - markers: `id / 紐付ブロックID / 座標 / メモ`
  - notes: `id / テキスト / 座標`
  - uiMode: `"draw" | "edit" | "note" | "marker"`
  - selectedBlockId: 現在編集中のブロック ID
  - grid設定: 単位(300mm)、スナップ有無
  - ⇒ JSON 保存時は React state をそのままシリアライズ
- **Konva（描画とユーザー操作）**
  - GridLayer の描画管理
  - React state を基にブロック／マーカー／メモを描画
  - ドラッグ／クリックなどユーザー操作イベントを検出し、React に伝搬して state を更新

## 3. データフロー
1. 描画
   - React state → Konva 描画コンポーネントへ props として供給 → Stage/Layers を更新。
2. 操作
   - 例: ブロックをドラッグ → `onDragEnd` を Konva が受信 → React state (`setBlocks`) で座標更新 → 再描画。
3. 保存
   - `blocks / markers / notes` をまとめて JSON 化。
   - PNG: `stage.toDataURL()` を FileSaver.jsで保存。
   - PDF: PNG を jsPDF に埋め込んで書き出し。

## 4. 保存データ構造（JSON 例）
```json
{
  "blocks": [
    { "id": "b1", "length": 1800, "type": "span", "x": 0, "y": 0 },
    { "id": "line-12-span-1", "length": 1800, "type": "span", "x": 0, "y": 0, "sourceLineId": "line-12", "locked": true }
  ],
  "markers": [
    { "id": "m1", "blockId": "b1", "x": 1800, "y": 0, "note": "支柱2本" },
    { "id": "line-12-marker-1", "blockId": null, "lineId": "line-12", "x": 1800, "y": 0, "color": "red", "generated": true }
  ],
  "notes": [
    { "id": "n1", "text": "ここに階段", "x": 3600, "y": 0 }
  ],
  "lines": [
    {
      "id": "line-12",
      "startX": 0,
      "startY": 0,
      "endX": 3600,
      "endY": 0,
      "length": 3600,
      "color": "red",
      "style": "solid",
      "metadata": {
        "spans": [
          {
            "id": "line-12-span-1",
            "lineId": "line-12",
            "index": 0,
            "length": 1800,
            "start": { "x": 0, "y": 0 },
            "end": { "x": 1800, "y": 0 }
          }
        ],
        "spanChecksum": "line-12:3600:1800-1800"
      }
    }
  ]
}
```

## 5. 今後の拡張に向けた設計ポイント
- JSON 構造を SCAFF 本番と共通化しておけば、将来的に SaaS 側でそのまま読み込める。
- `type` フィールドのバリエーションを拡張することで、階段・梁枠・張出などの追加部材を柔軟にサポートできる。
- 状態管理は Redux / Zustand などに移行可能な構造を意識し、MVP でスケールさせやすい設計にしておく。
- 自動割付で生成されたスパンは `blocks` に `locked: true` + `sourceLineId` 付きで追加し、対応する `lines.metadata.spans` / `markers.generated` が再出力時の再現性を担保する。
