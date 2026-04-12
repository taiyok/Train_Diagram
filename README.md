# でんしゃダイヤグラム

子ども向けのインタラクティブな鉄道ダイヤグラム（時刻表）ビューアです。  
iPad・タブレットでの使用に最適化されており、ピンチズームやドラッグパンでダイヤグラムを探索できます。

**デモ: https://taiyok.github.io/Train_Diagram/**

---

## 機能

- **ダイヤグラム表示** — 列車の運行を斜め線（スジ）で可視化
- **ピンチズーム / ドラッグパン** — 慣性スクロール付き、タッチ操作に最適化
- **列車タップ** — タップで列車名・種別・停車駅リストをポップアップ表示
- **種別フィルター** — 「のぞみだけ見る」などで特定種別に絞り込み
- **現在時刻マーカー** — リアルタイムで動く赤い縦線
- **絵文字アイコン** — 各列車の先頭位置に絵文字を表示
- **サンプルデータ切り替え** — 東海道新幹線 / JR中央線を内蔵
- **JSONアップロード** — カスタムデータを読み込んで任意の路線を表示

---

## 技術スタック

| 項目 | 採用技術 |
|------|---------|
| フレームワーク | React 19 + TypeScript |
| ビルド | Vite 8 |
| スタイル | Tailwind CSS v4 |
| 状態管理 | Zustand |
| 描画 | HTML5 Canvas（rAFループ） |
| テスト | Vitest |
| ホスティング | GitHub Pages |

---

## ローカルで動かす

```bash
git clone https://github.com/taiyok/Train_Diagram.git
cd Train_Diagram
npm install
npm run dev
```

`http://localhost:5173` で起動します。

### iPadからローカルサーバーに接続する

```bash
# 同じWi-Fiネットワーク内のデバイスからアクセス可能にする
npm run dev -- --host

# または cloudflared でどこからでもアクセス可能なURLを発行
npx cloudflared tunnel --url http://localhost:5173
```

---

## コマンド一覧

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run test` | テスト実行 |
| `npm run preview` | ビルド済みファイルのプレビュー |

---

## カスタムデータのフォーマット

JSONファイルをアップロードすることで任意の路線を表示できます。

```json
{
  "lineName": "路線名",
  "stations": [
    { "name": "駅名", "distance": 0 },
    { "name": "次の駅", "distance": 12.3 }
  ],
  "trainTypes": [
    {
      "id": "express",
      "name": "特急",
      "color": "#E93323",
      "lineWidth": 3,
      "emoji": "🚄"
    }
  ],
  "trains": [
    {
      "id": "train1",
      "name": "特急1号",
      "typeId": "express",
      "direction": "down",
      "timetable": [
        { "station": "駅名", "departure": "06:00" },
        { "station": "次の駅", "arrival": "06:15" }
      ]
    }
  ]
}
```

**ポイント:**
- `distance` は起点からの距離（km）。Y軸の位置はこの値に比例します
- `timetable` には停車駅のみ記載。通過駅の時刻は自動補間されます
- `direction`: `"down"`（起点→終点）/ `"up"`（終点→起点）
- 時刻フォーマット: `"HH:MM"`。翌日表記（`"25:30"` など）も対応

サンプルデータは [`src/data/`](src/data/) を参照してください。

---

## ライセンス

MIT
