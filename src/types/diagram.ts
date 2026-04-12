// ============================================================
// ダイヤグラムビューア 型定義
// ============================================================

// ------------------------------------------------------------
// JSONファイルから読み込む生データの型
// ------------------------------------------------------------

/** 駅情報（路線の全駅リスト） */
export interface StationRaw {
  /** 駅名（例: "東京"） */
  name: string
  /** 起点駅からの距離（km） */
  distance: number
}

/** 列車種別（色・線幅・絵文字） */
export interface TrainTypeRaw {
  /** 種別ID（例: "nozomi"） */
  id: string
  /** 表示名（例: "のぞみ"） */
  name: string
  /** CSS16進カラーコード */
  color: string
  /** Canvas描画の線幅（論理ピクセル） */
  lineWidth: number
  /** 絵文字アイコン（例: "🚄"） */
  emoji: string
}

/** 時刻表の1エントリ（停車駅ごと） */
export interface TimetableEntry {
  /** 駅名（StationRaw.name と一致必須） */
  station: string
  /** 到着時刻 "HH:MM"（始発駅は省略） */
  arrival?: string
  /** 発車時刻 "HH:MM"（終着駅は省略） */
  departure?: string
}

/** 下り・上りの方向 */
export type Direction = 'down' | 'up'

/** 列車1本分の生データ */
export interface TrainRaw {
  /** 列車ID（ユニーク） */
  id: string
  /** 列車名（例: "のぞみ1号"） */
  name: string
  /** 種別ID（TrainTypeRaw.id と対応） */
  typeId: string
  /** 下り（down）または上り（up） */
  direction: Direction
  /** 停車駅の時刻表（停車駅のみ記載） */
  timetable: TimetableEntry[]
}

/** JSONファイル全体の型 */
export interface DiagramDataRaw {
  /** 路線名（例: "東海道新幹線"） */
  lineName: string
  /** 路線上の全駅リスト（距離昇順） */
  stations: StationRaw[]
  /** 列車種別リスト */
  trainTypes: TrainTypeRaw[]
  /** 全列車データ */
  trains: TrainRaw[]
}

// ------------------------------------------------------------
// 処理済みデータ（補間済み、描画用）
// ------------------------------------------------------------

/** 処理済みの駅情報 */
export interface Station {
  /** 駅名 */
  name: string
  /** 起点からの距離（km） */
  distance: number
  /** 路線全体に対する距離の割合（0.0〜1.0） */
  distanceFraction: number
}

/** 処理済みの列車種別 */
export interface TrainType {
  id: string
  name: string
  color: string
  lineWidth: number
  emoji: string
}

/**
 * 通過駅を含む全駅の停車情報（補間済み）
 * スジを描画するための全座標データ
 */
export interface ResolvedStop {
  /** 駅情報 */
  station: Station
  /** 到着時刻（0時からの分数）。始発駅は null */
  arrivalMinutes: number | null
  /** 発車時刻（0時からの分数）。終着駅は null */
  departureMinutes: number | null
  /** true = 実際の停車駅 / false = 補間による通過時刻 */
  isScheduledStop: boolean
}

/** 描画用に処理された列車データ */
export interface Train {
  /** 列車ID */
  id: string
  /** 列車名 */
  name: string
  /** 列車種別 */
  type: TrainType
  /** 方向 */
  direction: Direction
  /** 全駅分の停車情報（補間済み） */
  resolvedStops: ResolvedStop[]
  /** 運行開始時刻（分）— ビューポートカリング用 */
  startMinutes: number
  /** 運行終了時刻（分）— ビューポートカリング用 */
  endMinutes: number
}

// ------------------------------------------------------------
// ビューポート・インタラクション状態
// ------------------------------------------------------------

/** ビューポート状態（パン・ズーム） */
export interface ViewportState {
  /** 表示左端の時刻（0時からの分数） */
  panMinutes: number
  /** 表示上端の距離（km） */
  panKm: number
  /** X軸のスケール（ピクセル/分） */
  scaleX: number
  /** Y軸のスケール（ピクセル/km） */
  scaleY: number
  /** Canvasの幅（ピクセル） */
  canvasWidth: number
  /** Canvasの高さ（ピクセル） */
  canvasHeight: number
}

/** 列車種別ごとの表示フィルター状態 */
export type FilterState = Record<string, boolean>

/** タップ時のポップアップ情報 */
export interface PopupInfo {
  /** 対象列車 */
  train: Train
  /** ポップアップを表示するスクリーンX座標 */
  screenX: number
  /** ポップアップを表示するスクリーンY座標 */
  screenY: number
}

/** タッチポイント情報 */
export interface TouchPoint {
  /** ポインターID */
  id: number
  /** X座標 */
  x: number
  /** Y座標 */
  y: number
}

/** タッチ操作の状態 */
export type InteractionPhase = 'idle' | 'possibleTap' | 'panning' | 'pinching'

/** アプリ全体のデータセット識別子 */
export type DatasetId = 'tokaido' | 'chuo' | 'tobu-tojo' | 'seibu-ikebukuro' | 'jr-saikyo' | 'metro-yurakucho' | 'tohoku-shinkansen' | 'custom'
