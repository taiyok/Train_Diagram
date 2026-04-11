/**
 * 現在時刻マーカー（赤い縦線）の描画
 */

import type { ViewportState } from '../types/diagram'
import { worldXToScreen, getVisibleMinuteRange } from '../utils/coordinateUtils'

/**
 * 現在時刻を示す赤い縦線と「いまここ」ラベルを描画する
 */
export function renderCurrentTime(
  ctx: CanvasRenderingContext2D,
  currentMinutes: number,
  viewport: ViewportState,
): void {
  const { minMinutes, maxMinutes } = getVisibleMinuteRange(viewport)

  // ビューポート外なら描画しない
  if (currentMinutes < minMinutes || currentMinutes > maxMinutes) return

  const x = worldXToScreen(currentMinutes, viewport)
  const { canvasHeight } = viewport

  ctx.save()

  // 縦線
  ctx.strokeStyle = '#EF4444'  // 赤
  ctx.lineWidth = 2
  ctx.setLineDash([6, 3])
  ctx.globalAlpha = 0.9
  ctx.beginPath()
  ctx.moveTo(x, 0)
  ctx.lineTo(x, canvasHeight)
  ctx.stroke()

  // 「いまここ」ラベル（上部）
  ctx.setLineDash([])
  ctx.globalAlpha = 1
  ctx.fillStyle = '#EF4444'
  ctx.font = 'bold 11px "M PLUS Rounded 1c", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('いまここ', x, 14)

  ctx.restore()
}
