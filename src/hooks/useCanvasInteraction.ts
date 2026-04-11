/**
 * Canvasのタッチ・マウス操作を処理するフック
 *
 * 状態マシン:
 *   IDLE → POSSIBLE_TAP（1本指タッチ開始）
 *   POSSIBLE_TAP → PANNING（8px以上移動）
 *   POSSIBLE_TAP → タップ発火（pointerup かつ移動 < 8px）
 *   IDLE → PINCHING（2本指タッチ開始）
 *   PANNING → PINCHING（2本目の指が加わる）
 *   PINCHING → PANNING（1本指が離れる）
 */

import { useRef, useCallback } from 'react'
import type { InteractionPhase, TouchPoint } from '../types/diagram'
import { useDiagramStore } from '../store/useDiagramStore'

/** タップと判定する最大移動量（px） */
const TAP_THRESHOLD = 8

/** 慣性スクロールの減衰率（1フレームあたり） */
const MOMENTUM_DECAY = 0.92

/** 慣性スクロールを打ち切る最低速度（px/ms） */
const MIN_MOMENTUM_VELOCITY = 0.05

interface UseCanvasInteractionReturn {
  /** canvas要素に付与するイベントハンドラー */
  onPointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void
  onPointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void
  onPointerUp: (e: React.PointerEvent<HTMLCanvasElement>) => void
  onPointerCancel: (e: React.PointerEvent<HTMLCanvasElement>) => void
  /** アンマウント時に慣性スクロールを止めるために公開 */
  stopMomentum: () => void
}

/**
 * @param onTap タップ確定時に呼ばれるコールバック（スクリーン座標）
 */
export function useCanvasInteraction(
  onTap: (screenX: number, screenY: number) => void,
): UseCanvasInteractionReturn {
  const panViewport = useDiagramStore((s) => s.panViewport)
  const zoomViewport = useDiagramStore((s) => s.zoomViewport)
  const getViewport = () => useDiagramStore.getState().viewport

  // 操作状態（Reactの再レンダリングを避けるためrefで管理）
  const phaseRef = useRef<InteractionPhase>('idle')
  const touchesRef = useRef<Map<number, TouchPoint>>(new Map())
  const startPointRef = useRef<{ x: number; y: number } | null>(null)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const lastPinchDistRef = useRef<number>(0)
  const lastPinchMidRef = useRef<{ x: number; y: number } | null>(null)

  // 慣性スクロール用
  const velocityRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 })
  const lastMoveTimeRef = useRef<number>(0)
  const momentumRafRef = useRef<number | null>(null)

  /** 2点間の距離を計算 */
  const getDistance = (a: TouchPoint, b: TouchPoint): number =>
    Math.hypot(a.x - b.x, a.y - b.y)

  /** 2点の中点を計算 */
  const getMidpoint = (
    a: TouchPoint,
    b: TouchPoint,
  ): { x: number; y: number } => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  })

  /** 慣性スクロールを開始する */
  const startMomentum = useCallback(() => {
    const { vx, vy } = velocityRef.current
    if (Math.abs(vx) < MIN_MOMENTUM_VELOCITY && Math.abs(vy) < MIN_MOMENTUM_VELOCITY) return

    let currentVx = vx
    let currentVy = vy
    let lastTime = performance.now()

    const tick = (now: number) => {
      // 実フレーム時間（ms）を使って変位を計算（120Hz/60Hz どちらでも正確）
      const dt = now - lastTime
      lastTime = now

      currentVx *= MOMENTUM_DECAY
      currentVy *= MOMENTUM_DECAY

      if (
        Math.abs(currentVx) < MIN_MOMENTUM_VELOCITY &&
        Math.abs(currentVy) < MIN_MOMENTUM_VELOCITY
      ) {
        momentumRafRef.current = null
        return
      }

      // ピクセル変位をワールド座標（分・km）に変換
      const viewport = getViewport()
      const deltaMinutes = -(currentVx * dt) / viewport.scaleX
      const deltaKm = -(currentVy * dt) / viewport.scaleY
      panViewport(deltaMinutes, deltaKm)

      momentumRafRef.current = requestAnimationFrame(tick)
    }

    momentumRafRef.current = requestAnimationFrame(tick)
  }, [panViewport])

  /** 慣性スクロールを停止する */
  const stopMomentum = useCallback(() => {
    if (momentumRafRef.current !== null) {
      cancelAnimationFrame(momentumRafRef.current)
      momentumRafRef.current = null
    }
    velocityRef.current = { vx: 0, vy: 0 }
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      stopMomentum()

      const point: TouchPoint = { id: e.pointerId, x: e.clientX, y: e.clientY }
      touchesRef.current.set(e.pointerId, point)

      const touches = [...touchesRef.current.values()]

      if (touches.length === 1) {
        // 1本指: タップの可能性あり
        phaseRef.current = 'possibleTap'
        startPointRef.current = { x: e.clientX, y: e.clientY }
        lastPointRef.current = { x: e.clientX, y: e.clientY }
        lastMoveTimeRef.current = performance.now()
      } else if (touches.length === 2) {
        // 2本指: ピンチズーム開始
        phaseRef.current = 'pinching'
        const [a, b] = touches as [TouchPoint, TouchPoint]
        lastPinchDistRef.current = getDistance(a, b)
        lastPinchMidRef.current = getMidpoint(a, b)
      }
    },
    [stopMomentum],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const existingPoint = touchesRef.current.get(e.pointerId)
      if (!existingPoint) return

      // タッチポイントを更新
      touchesRef.current.set(e.pointerId, {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
      })

      const touches = [...touchesRef.current.values()]

      if (phaseRef.current === 'pinching' && touches.length === 2) {
        // ピンチズーム処理
        const [a, b] = touches as [TouchPoint, TouchPoint]
        const newDist = getDistance(a, b)
        const newMid = getMidpoint(a, b)

        if (lastPinchDistRef.current > 0) {
          const zoomFactor = newDist / lastPinchDistRef.current
          zoomViewport(zoomFactor, newMid.x, newMid.y)
        }

        // ピンチ中のパン（中点の移動）
        if (lastPinchMidRef.current) {
          const viewport = getViewport()
          const dx = newMid.x - lastPinchMidRef.current.x
          const dy = newMid.y - lastPinchMidRef.current.y
          panViewport(-dx / viewport.scaleX, -dy / viewport.scaleY)
        }

        lastPinchDistRef.current = newDist
        lastPinchMidRef.current = newMid
      } else if (
        (phaseRef.current === 'panning' || phaseRef.current === 'possibleTap') &&
        touches.length === 1 &&
        lastPointRef.current
      ) {
        const dx = e.clientX - lastPointRef.current.x
        const dy = e.clientY - lastPointRef.current.y

        // タップ判定の距離チェック
        if (phaseRef.current === 'possibleTap' && startPointRef.current) {
          const totalDx = e.clientX - startPointRef.current.x
          const totalDy = e.clientY - startPointRef.current.y
          if (Math.hypot(totalDx, totalDy) > TAP_THRESHOLD) {
            phaseRef.current = 'panning'
          }
        }

        if (phaseRef.current === 'panning') {
          const viewport = getViewport()
          panViewport(-dx / viewport.scaleX, -dy / viewport.scaleY)

          // 速度を記録（慣性スクロール用）
          // px/ms 単位で保存し、tick() 内で実フレーム時間に基づいて変位を計算する
          const now = performance.now()
          const dt = now - lastMoveTimeRef.current
          if (dt > 0) {
            velocityRef.current = { vx: dx / dt, vy: dy / dt }
          }
          lastMoveTimeRef.current = now
        }

        lastPointRef.current = { x: e.clientX, y: e.clientY }
      }
    },
    [panViewport, zoomViewport],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const phase = phaseRef.current
      touchesRef.current.delete(e.pointerId)

      const remainingTouches = touchesRef.current.size

      if (phase === 'possibleTap' && remainingTouches === 0) {
        // タップ確定
        const rect = e.currentTarget.getBoundingClientRect()
        onTap(e.clientX - rect.left, e.clientY - rect.top)
        phaseRef.current = 'idle'
      } else if (phase === 'panning' && remainingTouches === 0) {
        // パン終了 → 慣性スクロール開始
        phaseRef.current = 'idle'
        startMomentum()
      } else if (phase === 'pinching' && remainingTouches === 1) {
        // 1本指が残ったのでパンモードへ
        phaseRef.current = 'panning'
        const remaining = [...touchesRef.current.values()][0]
        if (remaining) {
          lastPointRef.current = { x: remaining.x, y: remaining.y }
        }
      } else if (remainingTouches === 0) {
        phaseRef.current = 'idle'
      }
    },
    [onTap, startMomentum],
  )

  const onPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      touchesRef.current.delete(e.pointerId)
      if (touchesRef.current.size === 0) {
        phaseRef.current = 'idle'
        stopMomentum()
      }
    },
    [stopMomentum],
  )

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, stopMomentum }
}
