/**
 * ビューポートカリングのテスト
 */

import { describe, it, expect } from 'vitest'
import { getVisibleTrains } from '../utils/culling'
import type { Train, ViewportState, FilterState } from '../types/diagram'

/** テスト用ダミー列車を作るヘルパー */
function makeTrain(
  id: string,
  typeId: string,
  startMinutes: number,
  endMinutes: number,
): Train {
  return {
    id,
    name: id,
    type: { id: typeId, name: typeId, color: '#000', lineWidth: 2, emoji: '🚃' },
    direction: 'down',
    resolvedStops: [],
    startMinutes,
    endMinutes,
  }
}

// 6:00〜10:00（360〜600分）がビューポートの表示範囲
const viewport: ViewportState = {
  panMinutes: 360,
  panKm: 0,
  scaleX: 800 / 240, // 800px で 4時間
  scaleY: 1,
  canvasWidth: 800,
  canvasHeight: 600,
}

describe('getVisibleTrains', () => {
  const trains = [
    makeTrain('t1', 'a', 300, 370), // 一部だけ範囲内（左端とオーバーラップ）
    makeTrain('t2', 'a', 400, 500), // 完全に範囲内
    makeTrain('t3', 'a', 580, 620), // 右端とオーバーラップ
    makeTrain('t4', 'a', 100, 350), // 範囲外（左側）
    makeTrain('t5', 'a', 620, 700), // 範囲外（右側）
    makeTrain('t6', 'b', 400, 500), // 種別 b（フィルター対象）
  ]

  it('ビューポート内の列車のみが返される', () => {
    const filter: FilterState = { a: true, b: true }
    const visible = getVisibleTrains(trains, viewport, filter)
    const ids = visible.map((t) => t.id)
    expect(ids).toContain('t1') // オーバーラップ → 表示
    expect(ids).toContain('t2')
    expect(ids).toContain('t3') // オーバーラップ → 表示
    expect(ids).not.toContain('t4') // 範囲外
    expect(ids).not.toContain('t5') // 範囲外
  })

  it('フィルターで非表示の種別がスキップされる', () => {
    const filter: FilterState = { a: true, b: false }
    const visible = getVisibleTrains(trains, viewport, filter)
    expect(visible.find((t) => t.id === 't6')).toBeUndefined()
  })

  it('全種別フィルターOFF のときは何も返さない', () => {
    const filter: FilterState = { a: false, b: false }
    const visible = getVisibleTrains(trains, viewport, filter)
    expect(visible).toHaveLength(0)
  })

  it('フィルターが空のときは種別に関わらず全列車を返す（デフォルト表示）', () => {
    const filter: FilterState = {}
    const visible = getVisibleTrains(trains, viewport, filter)
    // filterState[typeId] が undefined のとき === false は偽 → デフォルトで表示される
    expect(visible.length).toBeGreaterThan(0)
  })
})
