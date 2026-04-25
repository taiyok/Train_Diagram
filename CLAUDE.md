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
npm run build        # 本番ビルド（tsc -b → vite build）
npm run test         # Vitestでユニットテスト
npm run lint         # ESLint実行
npm run preview      # ビルド済みファイルのプレビュー
```

---

## ディレクトリ構造

```
src/
├── types/diagram.ts                      # 全TypeScriptインターフェース（唯一の真実）
├── data/
│   ├── jr-yamanote-line.json             # JR山手線（初期表示データ）
│   ├── chuo-line.json                    # JR中央線
│   ├── tobu-tojo-line.json               # 東武東上線
│   ├── seibu-ikebukuro-line.json         # 西武池袋線
│   ├── jr-saikyo-line.json               # JR埼京線
│   ├── metro-fukutoshin-line.json        # 東京メトロ副都心線
│   ├── metro-yurakucho-line.json         # 東京メトロ有楽町線
│   ├── tokaido-shinkansen.json           # 東海道新幹線（UIに未表示）
│   └── tohoku-shinkansen.json            # 東北新幹線（UIに未表示）
├── store/useDiagramStore.ts              # Zustandグローバルストア
├── hooks/
│   ├── useCanvasInteraction.ts           # タッチ状態マシン（idle→panning→pinching）
│   ├── useCurrentTime.ts                 # 100msごとの時刻更新フック
│   └── useFileUpload.ts                  # JSONアップロード + バリデーション
├── utils/
│   ├── coordinateUtils.ts                # worldToScreen / screenToWorld 変換
│   ├── interpolation.ts                  # 通過駅時刻の線形補間（コアアルゴリズム）
│   ├── culling.ts                        # ビューポートカリング
│   └── hitTest.ts                        # タップヒットテスト（点→線分距離）
├── rendering/
│   ├── DiagramRenderer.ts                # rAFループ管理・描画オーケストレーター
│   ├── renderGrid.ts                     # 駅水平線・時刻グリッド
│   ├── renderTrainLines.ts               # スジ描画
│   ├── renderCurrentTime.ts              # 現在時刻マーカー（赤縦線）
│   ├── renderEmoji.ts                    # 絵文字アイコン
│   ├── renderStationAxis.ts              # 左パネル・駅名軸描画
│   └── renderTimeAxis.ts                 # 上パネル・時刻軸描画
└── components/
    ├── controls/
    │   ├── DataSwitcher.tsx              # データセット選択（ラジオボタン風）
    │   ├── FileUploadButton.tsx          # カスタムJSONアップロードボタン
    │   └── TrainTypeFilterButton.tsx     # 種別フィルタートグルボタン
    ├── layout/
    │   ├── StationAxisPanel.tsx          # 左固定・駅軸Canvas
    │   ├── TimeAxisPanel.tsx             # 上固定・時刻軸Canvas
    │   └── FilterBar.tsx                 # 下部フィルターバー
    └── diagram/
        ├── DiagramCanvas.tsx             # メインCanvas + インタラクション配線
        └── TrainPopup.tsx                # タップポップアップ
```

---

## 主要な型定義（`src/types/diagram.ts`）

### JSONから読み込む生データ型
| 型 | 説明 |
|----|------|
| `StationRaw` | 駅名 + 起点からの距離(km) |
| `TrainTypeRaw` | 種別ID・名前・色・線幅・絵文字 |
| `TimetableEntry` | 個別の停車情報（到着・発車時刻） |
| `TrainRaw` | 列車1本（ID・名前・typeId・方向・時刻表） |
| `DiagramDataRaw` | JSON全体（lineName・stations・trainTypes・trains） |
| `Direction` | `'down' \| 'up'` |

### 処理済みデータ型（描画用）
| 型 | 説明 |
|----|------|
| `Station` | `distanceFraction`（0.0〜1.0）を付与した駅情報 |
| `TrainType` | 処理済み種別情報 |
| `ResolvedStop` | 通過駅を含む全停車情報（補間済み時刻付き） |
| `Train` | 全停車情報 + `startMinutes`/`endMinutes`（カリング用） |

### UI状態型
| 型 | 説明 |
|----|------|
| `ViewportState` | パン（panMinutes, panKm）+ スケール（scaleX, scaleY）+ Canvas寸法 |
| `FilterState` | `Record<typeId, boolean>` — 未登録IDは `undefined`（表示扱い） |
| `PopupInfo` | タップ選択した列車 + 画面座標 |
| `InteractionPhase` | `'idle' \| 'possibleTap' \| 'panning' \| 'pinching'` |
| `DatasetId` | `'chuo' \| 'tobu-tojo' \| 'seibu-ikebukuro' \| 'jr-saikyo' \| 'metro-yurakucho' \| 'fukutoshin' \| 'yamanote' \| 'custom'` |

---

## 状態管理（`src/store/useDiagramStore.ts`）

Zustandによるグローバルストア。主要プロパティとアクション：

### 状態プロパティ
- `activeDataset` — 現在の路線ID
- `lineName` — 路線名（表示用）
- `stations` — 処理済み駅リスト
- `trainTypes` — `Map<typeId, TrainType>`
- `trains` — 補間済み列車リスト
- `viewport` — パン・ズーム状態
- `filterState` — 種別ごと表示フラグ
- `popupInfo` — タップポップアップ情報
- `anchorStation` — 縦中心に固定する駅（強調表示）
- `isLoading` / `errorMessage` — ロード状態

### 主要アクション
| アクション | 説明 |
|-----------|------|
| `loadData(id, raw?)` | JSON読み込み・補間処理・ビューポート初期化 |
| `updateViewport(partial)` | ビューポートの部分更新 |
| `panViewport(dx, dy)` | 相対パン移動（クランプあり） |
| `zoomViewport(factor, pivot)` | アンカー点を保ったズーム |
| `toggleFilter(typeId)` | 種別表示トグル |
| `resetFilter()` | 全種別を表示に戻す |
| `setPopup(info)` | ポップアップ設定/消去 |
| `setAnchorStation(station)` | アンカー駅の設定 |
| `resetViewport()` | 現在時刻中心にリセット |
| `setCanvasSize(w, h)` | Canvas寸法更新 |

### ズーム制約
- X軸: MIN 0.5 〜 MAX 20 px/分
- Y軸: MIN 0.3 〜 MAX 10 px/km

---

## アーキテクチャの重要ポイント

### 状態管理とCanvas描画の分離
- Reactの再レンダリングを避けるため、`DiagramRenderer` クラスはZustandストアから直接読まず `update()` メソッド経由で状態を受け取る
- `useCanvasInteraction` の内部状態（フェーズ・タッチポイント）は `useRef` で管理し、Reactの再レンダリングを起こさない

### rAFループの設計
- `DiagramRenderer` が単一のrAFループを所有する
- インタラクションがなく時刻更新も不要な場合はループを停止（`rafId = null`）
- 変更があった場合のみ `markDirty()` → `requestAnimationFrame` を呼ぶ
- 時刻マーカーの更新は毎秒1回のみ行う（`useCurrentTime` は100msごとだがdirtyフラグで制御）

### 描画順序（`DiagramRenderer.ts`）
1. `renderGrid()` — 駅水平線・時刻グリッド
2. `renderCurrentTime()` — 現在時刻マーカー（赤縦線）
3. `renderTrainLines()` — スジ（可視列車のみ）
4. `renderEmoji()` — 現在時刻位置の絵文字アイコン

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
- 慣性の減衰係数: 0.92/フレーム、最低速度 0.05 px/ms

### 軸パネルの描画
- `renderStationAxis.ts`: 青背景（`#E8F4FD`）、駅名を右寄せ。アンカー駅はオレンジ（`#F97316`）で `▶` マーカー付き
- `renderTimeAxis.ts`: クリーム背景（`#FFF9E6`）、毎時ラベル + 10分刻みの目盛り。深ズーム時は分ラベルも表示

### レイアウト（`App.tsx`）
CSSグリッドで4領域に分割:
- 上部: タイトルバー（青グラデーション、44px最小高）
- 上部右: 時刻軸パネル（固定高 約60px）
- 中央左: 駅軸パネル（固定幅 約80px）
- 中央右: メインCanvas（flex-1）
- 下部: フィルターバー（高さ自動）

### フィルターバーの「でんしゃをさがそう！」モード
`FilterBar.tsx` で、1種別だけ表示ONかつ種別数が2以上のとき、バナーを表示する。

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
`vite.config.ts` で `process.env` を使う場合は `@types/node` が必要（devDependenciesに含まれている）。

### ビルド時の base パス
- ローカル開発: `VITE_BASE` 未設定 → `'/Train_Diagram/'`
- GitHub Actions: `VITE_BASE=/Train_Diagram/` が設定される

### DPR（デバイスピクセル比）対応
`DiagramCanvas.tsx` と各軸パネルでは `window.devicePixelRatio` を使ってCanvas解像度を設定している。Canvas の `width`/`height` 属性と CSS サイズを別々に管理すること。

### カスタムJSONのDatasetId
カスタムアップロードは `DatasetId = 'custom'` として扱う。`loadData('custom', rawData)` の形式で第2引数にパース済みオブジェクトを渡す。

---

## 依存パッケージ（主要）

| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| react / react-dom | ^19.0.0 | UIフレームワーク |
| zustand | ^5.0.0 | 状態管理 |
| vite | ^8.0.8 | ビルドツール |
| tailwindcss | ^4.0.0 | スタイリング |
| typescript | ~5.7.2 | 型システム |
| vitest | ^4.1.4 | テストフレームワーク |

---

## デプロイ

`main` ブランチへのプッシュで GitHub Actions が自動デプロイ:

```
.github/workflows/deploy.yml
→ npm ci → npm run build（VITE_BASE=/Train_Diagram/）
→ actions/deploy-pages
→ https://taiyok.github.io/Train_Diagram/
```
