/**
 * メインのダイヤグラムCanvasコンポーネント
 *
 * DiagramRenderer クラスのライフサイクルを管理し、
 * タッチ/マウス操作とリアルタイム時刻更新を接続する。
 */

import { useRef, useEffect, useCallback, useState } from 'react'
import { useDiagramStore } from '../../store/useDiagramStore'
import { DiagramRenderer } from '../../rendering/DiagramRenderer'
import { useCurrentTime } from '../../hooks/useCurrentTime'
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction'
import { hitTestTrains } from '../../utils/hitTest'
import { getVisibleTrains } from '../../utils/culling'
import { TrainPopup } from './TrainPopup'
import type { PopupInfo } from '../../types/diagram'

export function DiagramCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<DiagramRenderer | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const trains = useDiagramStore((s) => s.trains)
  const viewport = useDiagramStore((s) => s.viewport)
  const filterState = useDiagramStore((s) => s.filterState)
  const setCanvasSize = useDiagramStore((s) => s.setCanvasSize)
  const setPopup = useDiagramStore((s) => s.setPopup)

  const currentMinutes = useCurrentTime()
  const [popupInfo, setLocalPopup] = useState<PopupInfo | null>(null)

  // フィルターで強調表示すべき種別IDを取得
  const activeFilters = Object.entries(filterState).filter(([, v]) => v).map(([k]) => k)
  const inactiveFilters = Object.entries(filterState).filter(([, v]) => !v).map(([k]) => k)
  const highlightTypeId =
    inactiveFilters.length > 0 && activeFilters.length === 1
      ? activeFilters[0] ?? null
      : null

  // --- Renderer の初期化と破棄 ---
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    rendererRef.current = new DiagramRenderer(canvas)

    return () => {
      rendererRef.current?.dispose()
      rendererRef.current = null
    }
  }, [])

  // --- Canvasのリサイズ監視 ---
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        const canvas = canvasRef.current
        if (canvas) {
          // デバイスピクセル比に対応
          const dpr = window.devicePixelRatio || 1
          canvas.width = Math.round(width * dpr)
          canvas.height = Math.round(height * dpr)
          canvas.style.width = `${width}px`
          canvas.style.height = `${height}px`

          const ctx = canvas.getContext('2d')
          ctx?.scale(dpr, dpr)

          setCanvasSize(Math.round(width), Math.round(height))
        }
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [setCanvasSize])

  // --- 描画パラメーター変更時に再描画 ---
  useEffect(() => {
    rendererRef.current?.update(
      trains,
      viewport,
      filterState,
      currentMinutes,
      highlightTypeId,
    )
  }, [trains, viewport, filterState, currentMinutes, highlightTypeId])

  // --- タップハンドラー ---
  const handleTap = useCallback(
    (screenX: number, screenY: number) => {
      const visibleTrains = getVisibleTrains(trains, viewport, filterState)
      const hit = hitTestTrains(screenX, screenY, visibleTrains, viewport)

      if (hit) {
        const info: PopupInfo = { train: hit, screenX, screenY }
        setLocalPopup(info)
        setPopup(info)
      } else {
        setLocalPopup(null)
        setPopup(null)
      }
    },
    [trains, viewport, filterState, setPopup],
  )

  const { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, stopMomentum } =
    useCanvasInteraction(handleTap)

  // アンマウント時に慣性スクロールのrAFを確実に停止する
  useEffect(() => {
    return () => {
      stopMomentum()
    }
  }, [stopMomentum])

  const handleClosePopup = useCallback(() => {
    setLocalPopup(null)
    setPopup(null)
  }, [setPopup])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{ backgroundColor: '#FFFBF0' }}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ cursor: 'grab', touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      />

      {/* タップポップアップ */}
      <TrainPopup
        info={popupInfo}
        onClose={handleClosePopup}
        containerWidth={viewport.canvasWidth}
        containerHeight={viewport.canvasHeight}
      />
    </div>
  )
}
