/**
 * ダイヤグラムの描画オーケストレーター
 *
 * rAFループを管理し、各描画モジュールを順番に呼び出す。
 * クラスベースで実装し、DiagramCanvas の useRef で保持する。
 */

import type { Train, ViewportState, FilterState } from '../types/diagram'
import { getVisibleTrains } from '../utils/culling'
import { renderGrid } from './renderGrid'
import { renderTrainLines } from './renderTrainLines'
import { renderCurrentTime } from './renderCurrentTime'
import { renderEmoji } from './renderEmoji'

export class DiagramRenderer {
  private ctx: CanvasRenderingContext2D
  private rafId: number | null = null
  private isDirty = false

  // 最新の描画パラメーターを保持（rAFコールバック内で参照）
  private trains: Train[] = []
  private viewport: ViewportState
  private filterState: FilterState = {}
  private currentMinutes = 0
  private highlightTypeId: string | null = null

  // 時刻マーカーの前回更新時刻（毎秒再描画を抑制）
  private lastTimeUpdate = 0

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D コンテキストの取得に失敗しました')
    this.ctx = ctx

    // 初期ビューポート（後で setViewport で上書きされる）
    this.viewport = {
      panMinutes: 360,
      panKm: 0,
      scaleX: 1,
      scaleY: 1,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
    }
  }

  /** 描画パラメーターを更新してフレームを要求する */
  update(
    trains: Train[],
    viewport: ViewportState,
    filterState: FilterState,
    currentMinutes: number,
    highlightTypeId: string | null,
  ): void {
    this.trains = trains
    this.viewport = viewport
    this.filterState = filterState
    this.currentMinutes = currentMinutes
    this.highlightTypeId = highlightTypeId
    this.markDirty()
  }

  /** 次のフレームで再描画するようにマークする */
  markDirty(): void {
    this.isDirty = true
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(this.loop)
    }
  }

  /** rAFループ */
  private loop = (): void => {
    if (this.isDirty) {
      this.drawFrame()
      this.isDirty = false
    }

    // 1秒以上経過していれば時刻マーカーのために再描画
    const now = performance.now()
    if (now - this.lastTimeUpdate > 1000) {
      this.isDirty = true
      this.lastTimeUpdate = now
    }

    if (this.isDirty) {
      this.rafId = requestAnimationFrame(this.loop)
    } else {
      this.rafId = null
    }
  }

  /** 1フレーム分の描画を実行する */
  private drawFrame(): void {
    const { ctx, viewport } = this
    const { canvasWidth, canvasHeight } = viewport

    // キャンバスをクリア
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    // 背景色
    ctx.fillStyle = '#FFFBF0'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    if (this.trains.length === 0) {
      this.drawEmptyState()
      return
    }

    // 表示範囲の計算
    const timeStart = viewport.panMinutes
    const timeEnd = viewport.panMinutes + canvasWidth / viewport.scaleX

    // 1. グリッド描画
    const allStations = [
      ...new Map(
        this.trains.flatMap((t) =>
          t.resolvedStops.map((s) => [s.station.name, s.station])
        )
      ).values(),
    ].sort((a, b) => a.distance - b.distance)

    renderGrid(ctx, allStations, viewport, timeStart, timeEnd)

    // 2. 現在時刻マーカー
    renderCurrentTime(ctx, this.currentMinutes, viewport)

    // 3. スジ描画（ビューポートカリング済み）
    const visibleTrains = getVisibleTrains(this.trains, viewport, this.filterState)
    renderTrainLines(ctx, visibleTrains, viewport, this.highlightTypeId)

    // 4. 絵文字アイコン
    renderEmoji(ctx, visibleTrains, viewport, this.currentMinutes)
  }

  /** データ未読み込み時の表示 */
  private drawEmptyState(): void {
    const { ctx, viewport } = this
    ctx.fillStyle = '#94A3B8'
    ctx.font = 'bold 20px "M PLUS Rounded 1c", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(
      '🚂 データを読み込んでいます...',
      viewport.canvasWidth / 2,
      viewport.canvasHeight / 2,
    )
  }

  /** rAFループを停止する（コンポーネントのアンマウント時） */
  dispose(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }
}
