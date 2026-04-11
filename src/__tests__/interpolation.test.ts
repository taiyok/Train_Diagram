/**
 * 時刻補間ユーティリティのテスト
 */

import { describe, it, expect } from 'vitest'
import { parseTime, formatMinutes, processData } from '../utils/interpolation'
import type { DiagramDataRaw } from '../types/diagram'

// --- parseTime のテスト ---
describe('parseTime', () => {
  it('通常の時刻を分に変換できる', () => {
    expect(parseTime('06:00')).toBe(360)
    expect(parseTime('12:30')).toBe(750)
    expect(parseTime('23:59')).toBe(1439)
    expect(parseTime('00:00')).toBe(0)
  })

  it('24時超表記（翌日便）を処理できる', () => {
    expect(parseTime('25:00')).toBe(1500)
    expect(parseTime('24:30')).toBe(1470)
  })

  it('一桁の時・分も正しく処理できる', () => {
    expect(parseTime('6:05')).toBe(365)
    expect(parseTime('0:01')).toBe(1)
  })
})

// --- formatMinutes のテスト ---
describe('formatMinutes', () => {
  it('分を HH:MM 形式にフォーマットできる', () => {
    expect(formatMinutes(0)).toBe('00:00')
    expect(formatMinutes(360)).toBe('06:00')
    expect(formatMinutes(362)).toBe('06:02')
    expect(formatMinutes(1439)).toBe('23:59')
  })
})

// --- processData のテスト（東海道新幹線シンプル版） ---
describe('processData', () => {
  const simpleData: DiagramDataRaw = {
    lineName: 'テスト路線',
    stations: [
      { name: 'A駅', distance: 0 },
      { name: 'B駅', distance: 50 },
      { name: 'C駅', distance: 100 },
      { name: 'D駅', distance: 150 },
    ],
    trainTypes: [
      { id: 'express', name: '特急', color: '#E93323', lineWidth: 3, emoji: '🚄' },
      { id: 'local', name: '普通', color: '#3753F6', lineWidth: 2, emoji: '🚃' },
    ],
    trains: [
      {
        // 特急: A→C→D（B駅を通過）
        id: 'exp1',
        name: '特急1号',
        typeId: 'express',
        direction: 'down',
        timetable: [
          { station: 'A駅', departure: '08:00' },
          { station: 'C駅', arrival: '08:40', departure: '08:42' },
          { station: 'D駅', arrival: '09:00' },
        ],
      },
      {
        // 普通: 全駅停車
        id: 'loc1',
        name: '普通1',
        typeId: 'local',
        direction: 'down',
        timetable: [
          { station: 'A駅', departure: '08:00' },
          { station: 'B駅', arrival: '08:25', departure: '08:27' },
          { station: 'C駅', arrival: '08:55', departure: '08:57' },
          { station: 'D駅', arrival: '09:20' },
        ],
      },
    ],
  }

  it('駅リストを正しく処理できる（distanceFraction の計算）', () => {
    const { stations } = processData(simpleData)
    expect(stations).toHaveLength(4)
    expect(stations[0]!.distanceFraction).toBe(0)
    expect(stations[1]!.distanceFraction).toBeCloseTo(50 / 150)
    expect(stations[2]!.distanceFraction).toBeCloseTo(100 / 150)
    expect(stations[3]!.distanceFraction).toBe(1)
  })

  it('列車種別を正しく読み込める', () => {
    const { trainTypes } = processData(simpleData)
    expect(trainTypes.size).toBe(2)
    expect(trainTypes.get('express')!.name).toBe('特急')
    expect(trainTypes.get('local')!.color).toBe('#3753F6')
  })

  it('全停車列車（普通）の resolvedStops が全駅分生成される', () => {
    const { trains } = processData(simpleData)
    const local = trains.find((t) => t.id === 'loc1')!
    expect(local.resolvedStops).toHaveLength(4)

    // 全停車なので isScheduledStop = true
    for (const stop of local.resolvedStops) {
      expect(stop.isScheduledStop).toBe(true)
    }

    // 始発駅: 到着なし、発車あり
    expect(local.resolvedStops[0]!.arrivalMinutes).toBeNull()
    expect(local.resolvedStops[0]!.departureMinutes).toBe(parseTime('08:00'))

    // 終着駅: 到着あり、発車なし
    expect(local.resolvedStops[3]!.arrivalMinutes).toBe(parseTime('09:20'))
    expect(local.resolvedStops[3]!.departureMinutes).toBeNull()
  })

  it('通過駅（B駅）の時刻が線形補間される', () => {
    const { trains } = processData(simpleData)
    const express = trains.find((t) => t.id === 'exp1')!

    // B駅は停車しないので isScheduledStop = false
    const bStop = express.resolvedStops.find((s) => s.station.name === 'B駅')!
    expect(bStop).toBeDefined()
    expect(bStop.isScheduledStop).toBe(false)

    // A駅発 08:00、C駅着 08:40、距離は A→B→C = 0→50→100
    // B駅は A→C の中間（50/100 = 0.5）なので 08:00 + 0.5 * 40分 = 08:20 = 500分
    const expectedB = parseTime('08:00') + 20 // = 500
    expect(bStop.arrivalMinutes).toBe(expectedB)
    expect(bStop.departureMinutes).toBe(expectedB)
  })

  it('運行時刻範囲（startMinutes/endMinutes）が正しく計算される', () => {
    const { trains } = processData(simpleData)
    const express = trains.find((t) => t.id === 'exp1')!
    expect(express.startMinutes).toBe(parseTime('08:00'))
    expect(express.endMinutes).toBe(parseTime('09:00'))
  })
})
