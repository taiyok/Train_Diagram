/**
 * 列車絵文字の描画
 * 各列車の現在位置（または終点・始点）に絵文字アイコンを表示する
 */

import type { Train, ViewportState } from '../types/diagram'
import { worldXToScreen, worldYToScreen } from '../utils/coordinateUtils'

/** 絵文字を描画するフォントサイズ */
const EMOJI_SIZE = 14

/**
 * 全列車の絵文字アイコンを描画する
 */
export function renderEmoji(
  ctx: CanvasRenderingContext2D,
  trains: Train[],
  viewport: ViewportState,
  currentMinutes: number,
): void {
  ctx.save()
  ctx.font = `${EMOJI_SIZE}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (const train of trains) {
    const pos = getTrainHeadPosition(train, currentMinutes)
    if (!pos) continue

    const screenX = worldXToScreen(pos.minutes, viewport)
    const screenY = worldYToScreen(pos.km, viewport)

    // ビューポート外なら描画しない
    if (screenX < -20 || screenX > viewport.canvasWidth + 20) continue
    if (screenY < -20 || screenY > viewport.canvasHeight + 20) continue

    ctx.fillText(train.type.emoji, screenX, screenY)
  }

  ctx.restore()
}

/**
 * 現在時刻における列車の先頭位置（分, km）を返す。
 * - 運行前: 始発駅
 * - 運行中: 線形補間で現在位置を推定
 * - 運行後: 終着駅
 */
function getTrainHeadPosition(
  train: Train,
  currentMinutes: number,
): { minutes: number; km: number } | null {
  const stops = train.resolvedStops
  if (stops.length === 0) return null

  const first = stops[0]
  const last = stops[stops.length - 1]
  if (!first || !last) return null

  const firstTime = first.departureMinutes ?? first.arrivalMinutes
  const lastTime = last.arrivalMinutes ?? last.departureMinutes

  if (firstTime === null || lastTime === null) return null

  // 運行前: 始発駅に表示
  if (currentMinutes <= firstTime) {
    return { minutes: firstTime, km: first.station.distance }
  }

  // 運行後: 終着駅に表示
  if (currentMinutes >= lastTime) {
    return { minutes: lastTime, km: last.station.distance }
  }

  // 運行中: 現在時刻を挟む2駅を探して線形補間
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]
    const b = stops[i + 1]
    if (!a || !b) continue

    const tA = a.departureMinutes ?? a.arrivalMinutes
    const tB = b.arrivalMinutes ?? b.departureMinutes

    if (tA === null || tB === null) continue

    if (currentMinutes >= tA && currentMinutes <= tB) {
      const frac = tB > tA ? (currentMinutes - tA) / (tB - tA) : 0
      const km = a.station.distance + frac * (b.station.distance - a.station.distance)
      return { minutes: currentMinutes, km }
    }
  }

  return { minutes: lastTime, km: last.station.distance }
}
