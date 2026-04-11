/**
 * ワールド座標 ↔ スクリーン座標の変換ユーティリティ
 *
 * ワールド座標系:
 *   X軸 = 0時からの経過分（0〜1440）
 *   Y軸 = 起点駅からの距離（km）
 *
 * スクリーン座標系:
 *   X軸 = Canvasの左端からのピクセル数
 *   Y軸 = Canvasの上端からのピクセル数
 */

import type { ViewportState } from '../types/diagram'

/** ワールドX（分）をスクリーンX（ピクセル）に変換 */
export function worldXToScreen(minutes: number, vp: ViewportState): number {
  return (minutes - vp.panMinutes) * vp.scaleX
}

/** ワールドY（km）をスクリーンY（ピクセル）に変換 */
export function worldYToScreen(km: number, vp: ViewportState): number {
  return (km - vp.panKm) * vp.scaleY
}

/** スクリーンX（ピクセル）をワールドX（分）に変換 */
export function screenXToWorld(screenX: number, vp: ViewportState): number {
  return screenX / vp.scaleX + vp.panMinutes
}

/** スクリーンY（ピクセル）をワールドY（km）に変換 */
export function screenYToWorld(screenY: number, vp: ViewportState): number {
  return screenY / vp.scaleY + vp.panKm
}

/** 現在のビューポートで表示されている時刻範囲（分）を返す */
export function getVisibleMinuteRange(vp: ViewportState): {
  minMinutes: number
  maxMinutes: number
} {
  return {
    minMinutes: vp.panMinutes,
    maxMinutes: vp.panMinutes + vp.canvasWidth / vp.scaleX,
  }
}

/** 現在のビューポートで表示されている距離範囲（km）を返す */
export function getVisibleKmRange(vp: ViewportState): {
  minKm: number
  maxKm: number
} {
  return {
    minKm: vp.panKm,
    maxKm: vp.panKm + vp.canvasHeight / vp.scaleY,
  }
}

/**
 * 東海道新幹線用の初期ビューポートを計算する。
 * 表示範囲: 6:00〜22:00（16時間）、東京〜新大阪（552.6km）
 */
export function createInitialViewport(
  canvasWidth: number,
  canvasHeight: number,
  totalKm: number,
  startHour = 6,
  endHour = 22,
): ViewportState {
  const totalMinutes = (endHour - startHour) * 60
  return {
    panMinutes: startHour * 60,
    panKm: 0,
    scaleX: canvasWidth / totalMinutes,
    scaleY: canvasHeight / totalKm,
    canvasWidth,
    canvasHeight,
  }
}
