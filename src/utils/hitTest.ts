/**
 * タップヒットテスト — タップ位置から最も近いスジ（列車線）を特定する
 */

import type { Train, ViewportState } from '../types/diagram'
import { worldXToScreen, worldYToScreen } from './coordinateUtils'

/**
 * 点 (px, py) から線分 (ax,ay)→(bx,by) への最短距離を返す
 */
function pointToSegmentDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy

  // 線分の長さがゼロの場合は始点との距離を返す
  if (lenSq === 0) return Math.hypot(px - ax, py - ay)

  // 線分上の最近傍点を求めるパラメータ t（0〜1にクランプ）
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq))

  // 最近傍点の座標
  const nearX = ax + t * dx
  const nearY = ay + t * dy

  return Math.hypot(px - nearX, py - nearY)
}

/**
 * タップ位置 (tapX, tapY) に最も近いスジを持つ列車を返す。
 * ヒット判定半径 = max(種別線幅 * 4, 12) px
 *
 * @returns ヒットした列車、なければ null
 */
export function hitTestTrains(
  tapX: number,
  tapY: number,
  visibleTrains: Train[],
  viewport: ViewportState,
): Train | null {
  let bestTrain: Train | null = null
  let bestDistance = Infinity

  for (const train of visibleTrains) {
    // この列車のヒット判定半径
    const hitRadius = Math.max(train.type.lineWidth * 4, 12)

    const stops = train.resolvedStops

    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i]
      const b = stops[i + 1]

      // A駅の発車時刻（なければ到着時刻）
      const tA = a.departureMinutes ?? a.arrivalMinutes
      // B駅の到着時刻（なければ発車時刻）
      const tB = b.arrivalMinutes ?? b.departureMinutes

      if (tA === null || tB === null) continue

      const ax = worldXToScreen(tA, viewport)
      const ay = worldYToScreen(a.station.distance, viewport)
      const bx = worldXToScreen(tB, viewport)
      const by = worldYToScreen(b.station.distance, viewport)

      const dist = pointToSegmentDistance(tapX, tapY, ax, ay, bx, by)

      if (dist < hitRadius && dist < bestDistance) {
        bestDistance = dist
        bestTrain = train
      }

      // 停車中の水平線セグメント（到着〜発車）
      if (a.isScheduledStop && a.arrivalMinutes !== null && a.departureMinutes !== null) {
        const ax2 = worldXToScreen(a.arrivalMinutes, viewport)
        const bx2 = worldXToScreen(a.departureMinutes, viewport)
        const y = worldYToScreen(a.station.distance, viewport)

        const distH = pointToSegmentDistance(tapX, tapY, ax2, y, bx2, y)
        if (distH < hitRadius && distH < bestDistance) {
          bestDistance = distH
          bestTrain = train
        }
      }
    }
  }

  return bestTrain
}
