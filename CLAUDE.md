# CLAUDE.md — エージェント向け開発ガイド

このファイルはAIエージェント（Claude等）がこのリポジトリで作業する際の指示書です。

---

## プロジェクト概要

子ども向けのHTML5 Canvas製鉄道ダイヤグラムビューア。  
iPad/タブレットでのタッチ操作に最適化。NAVITIMEのダイヤグラム機能の無料代替を目指す。

**デモ:** https://taiyok.github.io/Train_Diagram/

---

## 必須ルール

### コメント・ドキュメントは日本語で書く
ソースコード内のすべてのコメント・JSDoc・インラインドキュメントは**日本語**で記述する。英語コメントは禁止。

```typescript
// ✅ 正しい
/** ビューポートのパン値を相対的に移動する */

// ❌ 禁止
/** Moves the viewport pan value relatively */
```

### ブランチ運用
- 開発は `claude/` プレフィックスのフィーチャーブランチで行う
- `main` への直接プッシュは禁止
- 作業完了後はPRを作成してマージする

---

## 開発コマンド

```bash
npm run dev          # 開発サーバー（localhost:5173）
npm run dev -- --host  # ネットワーク公開（iPad実機テスト用）
npm run build        # 本番ビルド（tsc → vite build）
npm run test         # Vitestでユニットテスト
npm run preview      # ビルド済みファイルのプレビュー
```

---

## ディレクトリ構造

```
src/
├── types/diagram.ts              # 全TypeScriptインターフェース（唯一の真実）
├── data/
│   ├── tokaido-shinkansen.json   # 東海道新幹線サンプルデータ
│   └── chuo-line.json            # JR中央線サンプルデータ
├── store/useDiagramStore.ts      # Zustandグローバルストア
├── hooks/
│   ├── useCanvasInteraction.ts   # タッチ状態マシン（idle→panning→pinching）
│   ├── useCurrentTime.ts         # 1秒ごとの時刻更新フック
│   └── useFileUpload.ts          # JSONアップロード + バリデーション
├── utils/
│   ├── coordinateUtils.ts        # worldToScreen / screenToWorld 変換
│   ├── interpolation.ts          # 通過駅時刻の線形補間（コアアルゴリズム）
│   ├── culling.ts                # ビューポートカリング
│   └── hitTest.ts                # タップヒットテスト（点→線分距離）
├── rendering/
│   ├── DiagramRenderer.ts        # rAFループ管理・描画オーケストレーター
│   ├── renderGrid.ts             # 駅水平線・時刻グリッド
│   ├── renderTrainLines.ts       # スジ描画
│   ├── renderCurrentTime.ts      # 現在時刻マーカー（赤縦線）
│   └── renderEmoji.ts            # 絵文字アイコン
└── components/
    ├── layout/AppShell.tsx        # CSSグリッドレイアウト
    ├── layout/StationAxisPanel.tsx # 左固定・駅軸Canvas
    ├── layout/TimeAxisPanel.tsx   # 上固定・時刻軸Canvas
    ├── layout/FilterBar.tsx       # 下部フィルターバー
    ├── diagram/DiagramCanvas.tsx  # メインCanvas + インタラクション配線
    └── diagram/TrainPopup.tsx     # タップポップアップ
```

---

## アーキテクチャの重要ポイント

### 状態管理とCanvas描画の分離
- React の再レンダリングを避けるため、`DiagramRenderer` クラスはZustandストアから直接状態を読まずに `update()` メソッド経由で受け取る
- `useCanvasInteraction` の内部状態（フェーズ・タッチポイント）は `useRef` で管理し、Reactの再レンダリングを起こさない

### rAFループの設計
- `DiagramRenderer` が単一のrAFループを所有する
- インタラクションがなく時刻更新も不要な場合はループを停止（`rafId = null`）
- 変更があった場合のみ `markDirty()` → `requestAnimationFrame` を呼ぶ

### 座標系
- X軸: 0時からの経過分（0〜1440）
- Y軸: 起点駅からの距離（km）
- `screenX = (worldMinutes - panMinutes) * scaleX`
- `screenY = (worldKm - panKm) * scaleY`

### 通過駅の補間
`src/utils/interpolation.ts` の `interpolatePassThrough()`:
- JSONには停車駅のみ記載
- 前後の停車駅間の距離比で線形補間
- `25:30` のような翌日表記（24時超）に対応

### タッチ状態マシン
```
IDLE → POSSIBLE_TAP（1本指）
POSSIBLE_TAP → PANNING（8px以上移動）
POSSIBLE_TAP → タップ発火（pointerup + 移動<8px）
IDLE → PINCHING（2本指）
PANNING → PINCHING（2本目追加）
PINCHING → PANNING（1本指が離れる）
```
- `setPointerCapture` でCanvas外へのドラッグも追跡
- 慣性スクロールは速度を px/ms で保存し、rAFの実フレーム時間で変位計算（120Hz対応）

---

## テスト

```bash
npm run test
```

テストファイルは `src/__tests__/` 以下:

| ファイル | 内容 |
|---------|------|
| `interpolation.test.ts` | 時刻パース・通過駅補間アルゴリズム |
| `coordinateUtils.test.ts` | 座標変換の往復テスト |
| `culling.test.ts` | ビューポートカリング・フィルター |
| `hitTest.test.ts` | タップヒットテスト |
| `sampleData.test.ts` | サンプルJSONの整合性 |

**新機能を追加する際は必ずテストを追加すること。**

---

## よくあるミス・注意事項

### `filterState[typeId] === false` の判定
`=== false` を使う（`!== true` にしない）。  
`filterState` に未登録のIDは `undefined` となりデフォルト表示扱いになる（`FilterBar` の `isActive={filterState[type.id] !== false}` と一致）。

### `allStations` のキャッシュ
`DiagramRenderer.update()` で `trains !== this.trains` の比較は `this.trains = trains` の**前**に行うこと。後に行うと常に同一参照になり再計算されない。

### `process.env` の型
`vite.config.ts` で `process.env` を使う場合は `@types/node` が必要。

### ビルド時の base パス
- ローカル開発: `VITE_BASE` 未設定 → `'./'`
- GitHub Actions: `VITE_BASE=/Train_Diagram/` が設定される

---

## デプロイ

`main` ブランチへのプッシュで GitHub Actions が自動デプロイ:

```
.github/workflows/deploy.yml
→ npm ci → npm run build（VITE_BASE=/Train_Diagram/）
→ actions/deploy-pages
→ https://taiyok.github.io/Train_Diagram/
```
