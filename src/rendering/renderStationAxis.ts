/**
 * 駅軸（縦軸）の描画
 * 左側の固定パネルに駅名を距離比に応じたY位置で表示する
 */

import type { Station, ViewportState } from '../types/diagram'
import { worldYToScreen } from '../utils/coordinateUtils'

/** 主軸駅のハイライト色 */
const ANCHOR_COLOR = '#F97316'  // オレンジ

/**
 * 駅軸Canvasに駅名リストを描画する
 * @param ctx 駅軸専用のCanvasコンテキスト
 * @param stations 全駅リスト
 * @param viewport メインCanvasのビューポート（Y座標の計算に使用）
 * @param panelWidth 駅軸パネルの幅（px）
 * @param panelHeight 駅軸パネルの高さ（px）
 * @param anchorStation 選択中の主軸駅（null = 未選択）
 */
export function renderStationAxis(
  ctx: CanvasRenderingContext2D,
  stations: Station[],
  viewport: ViewportState,
  panelWidth: number,
  panelHeight: number,
  anchorStation: Station | null = null,
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

  for (const station of stations) {
    const y = worldYToScreen(station.distance, viewport)

    // ビューポート外はスキップ
    if (y < -2 || y > panelHeight + 2) continue

    const isAnchor = anchorStation?.name === station.name

    // アンカー駅: 背景帯を描画
    if (isAnchor) {
      ctx.fillStyle = ANCHOR_COLOR
      ctx.fillRect(0, y - 11, panelWidth - 2, 22)

      // アンカーアイコン（▶）
      ctx.fillStyle = 'white'
      ctx.font = 'bold 10px sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText('▶', 3, y + 1)
    }

    // 駅の横線（アンカー駅以外）
    if (!isAnchor) {
      ctx.strokeStyle = '#CBD5E1'
      ctx.lineWidth = 0.5
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(panelWidth, y)
      ctx.stroke()
    }

    // 駅名テキスト
    ctx.font = isAnchor
      ? 'bold 12px "M PLUS Rounded 1c", "Noto Sans JP", sans-serif'
      : 'bold 12px "M PLUS Rounded 1c", "Noto Sans JP", sans-serif'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = isAnchor ? 'white' : '#1A3A5C'
    ctx.fillText(station.name, panelWidth - 6, y + 1)
  }
}
