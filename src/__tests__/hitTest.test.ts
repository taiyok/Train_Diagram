/**
 * ヒットテストのテスト
 */

import { describe, it, expect } from 'vitest'
import { hitTestTrains } from '../utils/hitTest'
import type { Train, ViewportState, ResolvedStop, Station } from '../types/diagram'

/** テスト用の駅 */
function makeStation(name: string, distance: number): Station {
  return { name, distance, distanceFraction: distance / 100 }
}

/** 停車情報（補間なし） */
function makeStop(station: Station, arrival: number | null, departure: number | null): ResolvedStop {
  return { station, arrivalMinutes: arrival, departureMinutes: departure, isScheduledStop: true }
}

/** テスト用ダミー列車 */
function makeTrain(id: string, stops: ResolvedStop[]): Train {
  const times = stops.flatMap((s) => [s.arrivalMinutes, s.departureMinutes]).filter((t) => t !== null) as number[]
  return {
    id,
    name: id,
    type: { id: 'express', name: '特急', color: '#E93323', lineWidth: 3, emoji: '🚄' },
    direction: 'down',
    resolvedStops: stops,
    startMinutes: Math.min(...times),
    endMinutes: Math.max(...times),
  }
}

// シンプルなビューポート（1px = 1分 = 1km）
const viewport: ViewportState = {
  panMinutes: 0,
  panKm: 0,
  scaleX: 1, // 1px/分
  scaleY: 1, // 1px/km
  canvasWidth: 800,
  canvasHeight: 600,
}

describe('hitTestTrains', () => {
  const stA = makeStation('A', 0)
  const stB = makeStation('B', 100)
  const stC = makeStation('C', 200)

  // A(t=0, km=0) → B(t=100, km=100) → C(t=200, km=200) の斜め線
  const train = makeTrain('t1', [
    makeStop(stA, null, 0),
    makeStop(stB, 100, 100),
    makeStop(stC, 200, null),
  ])

  it('スジ上のタップがヒットする', () => {
    // 線分の中間点 (50, 50) をタップ
    const hit = hitTestTrains(50, 50, [train], viewport)
    expect(hit).not.toBeNull()
    expect(hit?.id).toBe('t1')
  })

  it('スジから遠い位置はヒットしない', () => {
    // (300, 0) はスジから大きく離れている
    const hit = hitTestTrains(300, 0, [train], viewport)
    expect(hit).toBeNull()
  })

  it('列車が空のときは null を返す', () => {
    const hit = hitTestTrains(50, 50, [], viewport)
    expect(hit).toBeNull()
  })

  it('複数列車があるとき最も近い列車をヒットする', () => {
    // 2本目の列車: A(t=0, km=0) → B(t=100, km=200)
    const stB2 = makeStation('B2', 200)
    const train2 = makeTrain('t2', [
      makeStop(stA, null, 0),
      makeStop(stB2, 100, null),
    ])

    // (50, 50) は t1（傾き1の直線）に近い、t2（傾き2の直線）は y=100 の位置
    const hit = hitTestTrains(50, 50, [train, train2], viewport)
    expect(hit?.id).toBe('t1')
  })
})
