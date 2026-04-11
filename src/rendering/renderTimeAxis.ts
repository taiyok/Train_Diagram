/**
 * 時刻軸（横軸）の描画
 * 上部の固定パネルに時刻ラベルを表示する
 */

import type { ViewportState } from '../types/diagram'
import { worldXToScreen, getVisibleMinuteRange } from '../utils/coordinateUtils'
import { getTimeGridInterval } from './renderGrid'
import { formatMinutes } from '../utils/interpolation'

/**
 * 時刻軸Canvasに時刻ラベルを描画する
 * @param ctx 時刻軸専用のCanvasコンテキスト
 * @param viewport メインCanvasのビューポート（X座標の計算に使用）
 * @param panelWidth 時刻軸パネルの幅（px）
 * @param panelHeight 時刻軸パネルの高さ（px）
 */
export function renderTimeAxis(
  ctx: CanvasRenderingContext2D,
  viewport: ViewportState,
  panelWidth: number,
  panelHeight: number,
): void {
  ctx.clearRect(0, 0, panelWidth, panelHeight)

  // 背景
  ctx.fillStyle = '#FFF9E6'
  ctx.fillRect(0, 0, panelWidth, panelHeight)

  // 下ボーダー線
  ctx.strokeStyle = '#F0D070'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, panelHeight - 1)
  ctx.lineTo(panelWidth, panelHeight - 1)
  ctx.stroke()

  const { minMinutes, maxMinutes } = getVisibleMinuteRange(viewport)
  const interval = getTimeGridInterval(viewport.scaleX)
  const startMinutes = Math.floor(minMinutes / interval) * interval

  ctx.textAlign = 'center'
  ctx.fillStyle = '#7A5C00'

  for (let t = startMinutes; t <= maxMinutes + interval; t += interval) {
    const x = worldXToScreen(t, viewport)
    if (x < -50 || x > panelWidth + 50) continue

    const isHour = t % 60 === 0

    // 目盛り線
    ctx.strokeStyle = isHour ? '#D4A800' : '#E8CC60'
    ctx.lineWidth = isHour ? 1.5 : 0.5
    ctx.beginPath()
    ctx.moveTo(x, panelHeight - (isHour ? 10 : 5))
    ctx.lineTo(x, panelHeight)
    ctx.stroke()

    if (isHour) {
      // 時刻ラベル（HH:00 → "HH時"）
      ctx.font = 'bold 13px "M PLUS Rounded 1c", "Noto Sans JP", sans-serif'
      const h = Math.floor(t / 60)
      ctx.fillText(`${h}時`, x, panelHeight - 14)
    } else if (interval <= 10) {
      // ズームイン時は分ラベルも表示
      ctx.font = '10px "M PLUS Rounded 1c", "Noto Sans JP", sans-serif'
      ctx.fillText(formatMinutes(t), x, panelHeight - 14)
    }
  }
}
