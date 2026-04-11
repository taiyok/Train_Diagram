/**
 * 座標変換ユーティリティのテスト
 */

import { describe, it, expect } from 'vitest'
import {
  worldXToScreen,
  worldYToScreen,
  screenXToWorld,
  screenYToWorld,
  getVisibleMinuteRange,
  getVisibleKmRange,
  createInitialViewport,
} from '../utils/coordinateUtils'
import type { ViewportState } from '../types/diagram'

const viewport: ViewportState = {
  panMinutes: 360, // 6:00 が左端
  panKm: 0,
  scaleX: 2,       // 1分あたり2ピクセル
  scaleY: 1,       // 1kmあたり1ピクセル
  canvasWidth: 800,
  canvasHeight: 600,
}

describe('worldXToScreen', () => {
  it('パン起点（6:00）がスクリーンX=0になる', () => {
    expect(worldXToScreen(360, viewport)).toBe(0)
  })

  it('6:30（30分後）がX=60ピクセルになる', () => {
    expect(worldXToScreen(390, viewport)).toBe(60)
  })

  it('5:00（パン範囲外・左）が負の値になる', () => {
    expect(worldXToScreen(300, viewport)).toBe(-120)
  })
})

describe('worldYToScreen', () => {
  it('0kmがY=0になる', () => {
    expect(worldYToScreen(0, viewport)).toBe(0)
  })

  it('100kmがY=100ピクセルになる', () => {
    expect(worldYToScreen(100, viewport)).toBe(100)
  })
})

describe('往復変換（ワールド → スクリーン → ワールド）', () => {
  it('X座標が往復変換で一致する', () => {
    const original = 420 // 7:00
    const screen = worldXToScreen(original, viewport)
    const restored = screenXToWorld(screen, viewport)
    expect(restored).toBeCloseTo(original)
  })

  it('Y座標が往復変換で一致する', () => {
    const original = 250.5
    const screen = worldYToScreen(original, viewport)
    const restored = screenYToWorld(screen, viewport)
    expect(restored).toBeCloseTo(original)
  })
})

describe('getVisibleMinuteRange', () => {
  it('表示範囲の時刻区間が正しく計算される', () => {
    const { minMinutes, maxMinutes } = getVisibleMinuteRange(viewport)
    expect(minMinutes).toBe(360)                       // 6:00
    expect(maxMinutes).toBe(360 + 800 / 2)            // 6:00 + 400分 = 12:40
  })
})

describe('getVisibleKmRange', () => {
  it('表示範囲の距離区間が正しく計算される', () => {
    const { minKm, maxKm } = getVisibleKmRange(viewport)
    expect(minKm).toBe(0)
    expect(maxKm).toBe(600) // 600px / 1px/km
  })
})

describe('createInitialViewport', () => {
  it('指定した時間範囲でビューポートを初期化できる', () => {
    const vp = createInitialViewport(1000, 500, 552.6, 6, 22)
    expect(vp.panMinutes).toBe(360)  // 6時
    expect(vp.panKm).toBe(0)
    expect(vp.canvasWidth).toBe(1000)
    expect(vp.canvasHeight).toBe(500)
    // scaleX = 1000 / (16 * 60) = 1000/960
    expect(vp.scaleX).toBeCloseTo(1000 / 960, 5)
    // scaleY = 500 / 552.6
    expect(vp.scaleY).toBeCloseTo(500 / 552.6, 5)
  })
})
