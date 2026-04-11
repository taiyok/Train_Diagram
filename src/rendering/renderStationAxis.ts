/**
 * 駅軸（縦軸）の描画
 * 左側の固定パネルに駅名を距離比に応じたY位置で表示する
 */

import type { Station, ViewportState } from '../types/diagram'
import { worldYToScreen } from '../utils/coordinateUtils'

/**
 * 駅軸Canvasに駅名リストを描画する
 * @param ctx 駅軸専用のCanvasコンテキスト
 * @param stations 全駅リスト
 * @param viewport メインCanvasのビューポート（Y座標の計算に使用）
 * @param panelWidth 駅軸パネルの幅（px）
 * @param panelHeight 駅軸パネルの高さ（px）
 */
export function renderStationAxis(
  ctx: CanvasRenderingContext2D,
  stations: Station[],
  viewport: ViewportState,
  panelWidth: number,
  panelHeight: number,
): void {
  ctx.clearRect(0, 0, panelWidth, panelHeight)

  // 背景
  ctx.fillStyle = '#E8F4FD'
  ctx.fillRect(0, 0, panelWidth, panelHeight)

  // 右ボーダー線
  ctx.strokeStyle = '#94C7E8'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(panelWidth - 1, 0)
  ctx.lineTo(panelWidth - 1, panelHeight)
  ctx.stroke()

  // 駅名テキスト
  ctx.font = 'bold 12px "M PLUS Rounded 1c", "Noto Sans JP", sans-serif'
  ctx.textAlign = 'right'
  ctx.fillStyle = '#1A3A5C'

  for (const station of stations) {
    const y = worldYToScreen(station.distance, viewport)

    // ビューポート外はスキップ
    if (y < -2 || y > panelHeight + 2) continue

    // 駅の横線
    ctx.strokeStyle = '#CBD5E1'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(panelWidth, y)
    ctx.stroke()

    // 駅名（右揃え、右余白4px）
    ctx.fillStyle = '#1A3A5C'
    ctx.fillText(station.name, panelWidth - 6, y + 1)
  }
}
