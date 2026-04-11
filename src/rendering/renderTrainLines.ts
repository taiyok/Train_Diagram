/**
 * スジ（列車線）の描画
 * 描画コストを下げるため、種別ごとにまとめて strokeStyle を設定する
 */

import type { Train, ViewportState } from '../types/diagram'
import { worldXToScreen, worldYToScreen } from '../utils/coordinateUtils'

/**
 * 全列車のスジを描画する
 * @param highlightTypeId 強調表示する種別ID（null = 通常表示）
 */
export function renderTrainLines(
  ctx: CanvasRenderingContext2D,
  trains: Train[],
  viewport: ViewportState,
  highlightTypeId: string | null = null,
): void {
  ctx.save()

  // 種別ごとにグループ化して描画コストを削減
  const byType = new Map<string, Train[]>()
  for (const train of trains) {
    const list = byType.get(train.type.id) ?? []
    list.push(train)
    byType.set(train.type.id, list)
  }

  for (const [typeId, typeTrains] of byType) {
    const isHighlighted = highlightTypeId === null || highlightTypeId === typeId
    const alpha = isHighlighted ? 1.0 : 0.15

    for (const train of typeTrains) {
      drawTrainLine(ctx, train, viewport, alpha)
    }
  }

  ctx.restore()
}

/** 1本の列車のスジを描画する */
function drawTrainLine(
  ctx: CanvasRenderingContext2D,
  train: Train,
  viewport: ViewportState,
  alpha: number,
): void {
  const stops = train.resolvedStops
  if (stops.length === 0) return

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = train.type.color
  ctx.lineWidth = train.type.lineWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.setLineDash([])
  ctx.beginPath()

  let hasMoveTo = false

  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i]
    if (!stop) continue

    // 停車中の水平セグメント（到着〜発車）
    if (
      stop.isScheduledStop &&
      stop.arrivalMinutes !== null &&
      stop.departureMinutes !== null &&
      stop.arrivalMinutes !== stop.departureMinutes
    ) {
      const ax = worldXToScreen(stop.arrivalMinutes, viewport)
      const bx = worldXToScreen(stop.departureMinutes, viewport)
      const y = worldYToScreen(stop.station.distance, viewport)

      if (hasMoveTo) {
        ctx.lineTo(ax, y)
      } else {
        ctx.moveTo(ax, y)
        hasMoveTo = true
      }
      ctx.lineTo(bx, y)
    } else {
      // 通過または単一時刻
      const t = stop.departureMinutes ?? stop.arrivalMinutes
      if (t === null) continue

      const x = worldXToScreen(t, viewport)
      const y = worldYToScreen(stop.station.distance, viewport)

      if (hasMoveTo) {
        ctx.lineTo(x, y)
      } else {
        ctx.moveTo(x, y)
        hasMoveTo = true
      }
    }
  }

  ctx.stroke()
  ctx.restore()
}
