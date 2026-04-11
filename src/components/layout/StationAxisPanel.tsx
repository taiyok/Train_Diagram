/**
 * 駅軸パネル（左側固定）
 * メインCanvasのビューポートと同期して駅名を描画する
 */

import { useRef, useEffect } from 'react'
import { useDiagramStore } from '../../store/useDiagramStore'
import { renderStationAxis } from '../../rendering/renderStationAxis'

/** パネルの固定幅（px） */
export const STATION_PANEL_WIDTH = 88

export function StationAxisPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const stations = useDiagramStore((s) => s.stations)
  const viewport = useDiagramStore((s) => s.viewport)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const logicalWidth = STATION_PANEL_WIDTH
    const logicalHeight = viewport.canvasHeight

    // Canvasサイズ設定
    canvas.width = Math.round(logicalWidth * dpr)
    canvas.height = Math.round(logicalHeight * dpr)
    canvas.style.width = `${logicalWidth}px`
    canvas.style.height = `${logicalHeight}px`

    ctx.scale(dpr, dpr)
    renderStationAxis(ctx, stations, viewport, logicalWidth, logicalHeight)
  }, [stations, viewport])

  return (
    <div
      className="shrink-0 overflow-hidden"
      style={{ width: STATION_PANEL_WIDTH }}
    >
      <canvas ref={canvasRef} className="block" />
    </div>
  )
}
