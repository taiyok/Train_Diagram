/**
 * 駅軸パネル（左側固定）
 * メインCanvasのビューポートと同期して駅名を描画する。
 * 駅名をタップすると「主軸駅」として選択し、その駅を縦中心にスクロールする。
 */

import { useRef, useEffect, useCallback } from 'react'
import { useDiagramStore } from '../../store/useDiagramStore'
import { renderStationAxis } from '../../rendering/renderStationAxis'
import { worldYToScreen } from '../../utils/coordinateUtils'
import type { Station } from '../../types/diagram'

/** パネルの固定幅（px） */
export const STATION_PANEL_WIDTH = 88

/** 駅のタップ判定しきい値（スクリーンピクセル） */
const HIT_THRESHOLD_PX = 20

/**
 * タップされたY座標に最も近い駅を返す。
 * しきい値（HIT_THRESHOLD_PX）内に駅がなければ null を返す。
 */
function findNearestStation(
  screenY: number,
  stations: Station[],
  viewport: Parameters<typeof worldYToScreen>[1],
): Station | null {
  let closest: Station | null = null
  let minDist = HIT_THRESHOLD_PX

  for (const station of stations) {
    const stationY = worldYToScreen(station.distance, viewport)
    const dist = Math.abs(stationY - screenY)
    if (dist < minDist) {
      minDist = dist
      closest = station
    }
  }

  return closest
}

export function StationAxisPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const stations = useDiagramStore((s) => s.stations)
  const viewport = useDiagramStore((s) => s.viewport)
  const anchorStation = useDiagramStore((s) => s.anchorStation)
  const setAnchorStation = useDiagramStore((s) => s.setAnchorStation)

  // Canvas 再描画（ビューポートまたは anchorStation が変わったとき）
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const logicalWidth = STATION_PANEL_WIDTH
    const logicalHeight = viewport.canvasHeight

    canvas.width = Math.round(logicalWidth * dpr)
    canvas.height = Math.round(logicalHeight * dpr)
    canvas.style.width = `${logicalWidth}px`
    canvas.style.height = `${logicalHeight}px`

    ctx.scale(dpr, dpr)
    renderStationAxis(ctx, stations, viewport, logicalWidth, logicalHeight, anchorStation)
  }, [stations, viewport, anchorStation])

  // 駅タップ処理
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // ポインターキャプチャとイベント伝播を止めてメインCanvasに干渉しないようにする
      e.stopPropagation()

      const rect = e.currentTarget.getBoundingClientRect()
      const screenY = e.clientY - rect.top

      const hit = findNearestStation(screenY, stations, viewport)

      if (hit) {
        // 同じ駅を再タップしたら選択解除
        setAnchorStation(anchorStation?.name === hit.name ? null : hit)
      }
    },
    [stations, viewport, anchorStation, setAnchorStation],
  )

  return (
    <div
      className="shrink-0 overflow-hidden"
      style={{ width: STATION_PANEL_WIDTH, cursor: 'pointer' }}
      onPointerDown={handlePointerDown}
    >
      <canvas ref={canvasRef} className="block" style={{ pointerEvents: 'none' }} />
    </div>
  )
}
