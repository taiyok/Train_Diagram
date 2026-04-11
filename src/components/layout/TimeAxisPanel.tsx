/**
 * 時刻軸パネル（上部固定）
 * メインCanvasのビューポートと同期して時刻ラベルを描画する
 */

import { useRef, useEffect } from 'react'
import { useDiagramStore } from '../../store/useDiagramStore'
import { renderTimeAxis } from '../../rendering/renderTimeAxis'
import { STATION_PANEL_WIDTH } from './StationAxisPanel'

/** パネルの固定高さ（px） */
export const TIME_PANEL_HEIGHT = 40

export function TimeAxisPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewport = useDiagramStore((s) => s.viewport)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const logicalWidth = viewport.canvasWidth
    const logicalHeight = TIME_PANEL_HEIGHT

    canvas.width = Math.round(logicalWidth * dpr)
    canvas.height = Math.round(logicalHeight * dpr)
    canvas.style.width = `${logicalWidth}px`
    canvas.style.height = `${logicalHeight}px`

    ctx.scale(dpr, dpr)
    renderTimeAxis(ctx, viewport, logicalWidth, logicalHeight)
  }, [viewport])

  return (
    <div
      className="overflow-hidden shrink-0"
      style={{
        height: TIME_PANEL_HEIGHT,
        // 駅軸パネルの幅だけ右にずらす
        marginLeft: STATION_PANEL_WIDTH,
      }}
    >
      <canvas ref={canvasRef} className="block" />
    </div>
  )
}
