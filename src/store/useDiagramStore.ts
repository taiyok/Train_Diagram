/**
 * アプリ全体のグローバル状態管理（Zustand）
 */

import { create } from 'zustand'
import type {
  Train,
  ViewportState,
  FilterState,
  PopupInfo,
  DatasetId,
  DiagramDataRaw,
  Station,
  TrainType,
} from '../types/diagram'
import { processData, parseTime } from '../utils/interpolation'
import { createTimeWindowViewport } from '../utils/coordinateUtils'

/** アプリ全体の状態型 */
interface DiagramState {
  /** 現在のデータセット識別子 */
  activeDataset: DatasetId

  /** 路線名 */
  lineName: string

  /** 処理済み駅リスト */
  stations: Station[]

  /** 列車種別マップ */
  trainTypes: Map<string, TrainType>

  /** 描画用列車リスト（補間済み） */
  trains: Train[]

  /** ビューポート状態（パン・ズーム） */
  viewport: ViewportState

  /** 種別ごとの表示フィルター */
  filterState: FilterState

  /** タップ時のポップアップ情報 */
  popupInfo: PopupInfo | null

  /** 選択中の主軸駅（縦方向の中心に表示・強調） */
  anchorStation: Station | null

  /** データ読み込み中フラグ */
  isLoading: boolean

  /** エラーメッセージ */
  errorMessage: string | null
}

/** アクション型 */
interface DiagramActions {
  /** JSONデータを読み込んで状態を更新する */
  loadData: (raw: DiagramDataRaw, datasetId: DatasetId, canvasWidth: number, canvasHeight: number) => void

  /** ビューポートを更新する */
  updateViewport: (viewport: Partial<ViewportState>) => void

  /** ビューポートのパン値を相対的に移動する */
  panViewport: (deltaMinutes: number, deltaKm: number) => void

  /** ビューポートのズームを変更する（アンカー点を基準に） */
  zoomViewport: (
    factor: number,
    anchorScreenX: number,
    anchorScreenY: number,
  ) => void

  /** 種別フィルターをトグルする */
  toggleFilter: (typeId: string) => void

  /** 全種別フィルターをリセットする（全表示） */
  resetFilter: () => void

  /** タップポップアップをセットする */
  setPopup: (info: PopupInfo | null) => void

  /**
   * 主軸駅を選択し、その駅が画面の縦中心に来るようビューポートをパンする。
   * null を渡すと選択解除。
   */
  setAnchorStation: (station: Station | null) => void

  /** ビューポートを現在時刻中心の3時間窓にリセットする */
  resetViewport: () => void

  /** Canvasのサイズを更新する */
  setCanvasSize: (width: number, height: number) => void
}

type DiagramStore = DiagramState & DiagramActions

/** ズームの最小・最大スケール */
const MIN_SCALE_X = 0.5   // ピクセル/分
const MAX_SCALE_X = 20    // ピクセル/分
const MIN_SCALE_Y = 0.3   // ピクセル/km
const MAX_SCALE_Y = 10    // ピクセル/km

export const useDiagramStore = create<DiagramStore>((set, _get) => ({
  // --- 初期状態 ---
  activeDataset: 'tokaido',
  lineName: '',
  stations: [],
  trainTypes: new Map(),
  trains: [],
  viewport: {
    panMinutes: 360,
    panKm: 0,
    scaleX: 1,
    scaleY: 1,
    canvasWidth: 800,
    canvasHeight: 600,
  },
  filterState: {},
  popupInfo: null,
  anchorStation: null,
  isLoading: false,
  errorMessage: null,

  // --- アクション ---

  loadData: (raw, datasetId, canvasWidth, canvasHeight) => {
    try {
      const { stations, trainTypes, trains } = processData(raw)

      // 路線の総距離を計算
      const totalKm = Math.max(...stations.map((s) => s.distance))

      // 最早発車時刻・最遅到着時刻から表示範囲を決定
      let minTime = Infinity
      let maxTime = -Infinity
      for (const train of trains) {
        if (train.startMinutes < minTime) minTime = train.startMinutes
        if (train.endMinutes > maxTime) maxTime = train.endMinutes
      }

      const dataStartMinutes = isFinite(minTime) ? minTime : 360
      const dataEndMinutes = isFinite(maxTime) ? maxTime : 1320

      // 現在時刻を中心に3時間窓で初期ビューポートを設定
      const viewport = createTimeWindowViewport(
        canvasWidth,
        canvasHeight,
        totalKm,
        dataStartMinutes,
        dataEndMinutes,
      )

      // フィルター初期状態（全種別を表示）
      const filterState: FilterState = {}
      for (const [id] of trainTypes) {
        filterState[id] = true
      }

      set({
        activeDataset: datasetId,
        lineName: raw.lineName,
        stations,
        trainTypes,
        trains,
        viewport,
        filterState,
        popupInfo: null,
        anchorStation: null,
        errorMessage: null,
      })
    } catch (err) {
      set({
        errorMessage: `データの読み込みに失敗しました: ${err instanceof Error ? err.message : String(err)}`,
      })
    }
  },

  updateViewport: (partial) => {
    set((state) => ({
      viewport: { ...state.viewport, ...partial },
    }))
  },

  panViewport: (deltaMinutes, deltaKm) => {
    set((state) => {
      const vp = state.viewport
      const stations = state.stations
      const totalKm = stations.length > 0
        ? Math.max(...stations.map((s) => s.distance))
        : 600

      // パン範囲のクランプ（路線範囲外に出ないように）
      const newPanMinutes = Math.max(0, Math.min(1440, vp.panMinutes + deltaMinutes))
      const newPanKm = Math.max(0, Math.min(totalKm, vp.panKm + deltaKm))

      return {
        viewport: {
          ...vp,
          panMinutes: newPanMinutes,
          panKm: newPanKm,
        },
      }
    })
  },

  zoomViewport: (factor, anchorScreenX, anchorScreenY) => {
    set((state) => {
      const vp = state.viewport

      // アンカー点のワールド座標を保持したままズーム
      const anchorWorldMinutes = anchorScreenX / vp.scaleX + vp.panMinutes
      const anchorWorldKm = anchorScreenY / vp.scaleY + vp.panKm

      const newScaleX = Math.max(MIN_SCALE_X, Math.min(MAX_SCALE_X, vp.scaleX * factor))
      const newScaleY = Math.max(MIN_SCALE_Y, Math.min(MAX_SCALE_Y, vp.scaleY * factor))

      // アンカー点が画面上の同じ位置に来るようにパンを調整
      const newPanMinutes = anchorWorldMinutes - anchorScreenX / newScaleX
      const newPanKm = anchorWorldKm - anchorScreenY / newScaleY

      return {
        viewport: {
          ...vp,
          scaleX: newScaleX,
          scaleY: newScaleY,
          panMinutes: Math.max(0, newPanMinutes),
          panKm: Math.max(0, newPanKm),
        },
      }
    })
  },

  toggleFilter: (typeId) => {
    set((state) => ({
      filterState: {
        ...state.filterState,
        [typeId]: !state.filterState[typeId],
      },
      popupInfo: null,
    }))
  },

  resetFilter: () => {
    set((state) => {
      const filterState: FilterState = {}
      for (const [id] of state.trainTypes) {
        filterState[id] = true
      }
      return { filterState }
    })
  },

  setPopup: (info) => {
    set({ popupInfo: info })
  },

  setAnchorStation: (station) => {
    set((state) => {
      if (!station) return { anchorStation: null }

      const { viewport, stations } = state
      const totalKm =
        stations.length > 0 ? Math.max(...stations.map((s) => s.distance)) : 600

      // 選択駅が縦方向の中心に来るようにパン
      const visibleKm = viewport.canvasHeight / viewport.scaleY
      const newPanKm = Math.max(
        0,
        Math.min(totalKm - visibleKm, station.distance - visibleKm / 2),
      )

      return {
        anchorStation: station,
        viewport: { ...viewport, panKm: newPanKm },
      }
    })
  },

  resetViewport: () => {
    set((state) => {
      const { stations, trains, viewport } = state
      const totalKm =
        stations.length > 0 ? Math.max(...stations.map((s) => s.distance)) : 600

      let minTime = Infinity
      let maxTime = -Infinity
      for (const train of trains) {
        if (train.startMinutes < minTime) minTime = train.startMinutes
        if (train.endMinutes > maxTime) maxTime = train.endMinutes
      }

      const dataStartMinutes = isFinite(minTime) ? minTime : 360
      const dataEndMinutes = isFinite(maxTime) ? maxTime : 1320

      const newViewport = createTimeWindowViewport(
        viewport.canvasWidth,
        viewport.canvasHeight,
        totalKm,
        dataStartMinutes,
        dataEndMinutes,
      )
      return { viewport: newViewport, popupInfo: null }
    })
  },

  setCanvasSize: (width, height) => {
    set((state) => ({
      viewport: {
        ...state.viewport,
        canvasWidth: width,
        canvasHeight: height,
      },
    }))
  },
}))

// 型補完用の時刻パーサーを再エクスポート
export { parseTime }
