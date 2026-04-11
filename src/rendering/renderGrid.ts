/**
 * グリッド線の描画
 * - 水平線: 各駅の位置
 * - 垂直線: 時刻のグリッド（表示スケールに応じて間隔を自動調整）
 */

import type { Station, ViewportState } from '../types/diagram'
import { worldXToScreen, worldYToScreen } from '../utils/coordinateUtils'

/**
 * 現在のズームレベルに適した時刻グリッド間隔（分）を返す
 */
export function getTimeGridInterval(scaleX: number): number {
  const pixelsPerHour = scaleX * 60
  if (pixelsPerHour >= 300) return 5    // 5分間隔
  if (pixelsPerHour >= 150) return 10   // 10分間隔
  if (pixelsPerHour >= 60)  return 30   // 30分間隔
  return 60                              // 1時間間隔
}

/**
 * ダイヤグラムのグリッドを描画する
 */
export function renderGrid(
  ctx: CanvasRenderingContext2D,
  stations: Station[],
  viewport: ViewportState,
  timeRangeStart: number, // 表示開始時刻（分）
  timeRangeEnd: number,   // 表示終了時刻（分）
): void {
  const { canvasWidth, canvasHeight } = viewport

  // --- 水平線（各駅） ---
  ctx.save()
  for (const station of stations) {
    const y = worldYToScreen(station.distance, viewport)
    if (y < -1 || y > canvasHeight + 1) continue

    ctx.strokeStyle = '#CBD5E1'  // スレートグレー
    ctx.lineWidth = 1
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(canvasWidth, y)
    ctx.stroke()
  }

  // --- 垂直線（時刻グリッド） ---
  const interval = getTimeGridInterval(viewport.scaleX)
  const startMinutes = Math.floor(timeRangeStart / interval) * interval
  const endMinutes = timeRangeEnd

  for (let t = startMinutes; t <= endMinutes; t += interval) {
    const x = worldXToScreen(t, viewport)
    if (x < -1 || x > canvasWidth + 1) continue

    const isHour = t % 60 === 0

    ctx.strokeStyle = isHour ? '#94A3B8' : '#E2E8F0'
    ctx.lineWidth = isHour ? 1.5 : 0.5
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, canvasHeight)
    ctx.stroke()
  }

  ctx.restore()
}
