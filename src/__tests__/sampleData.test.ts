/**
 * サンプルデータの整合性テスト
 * JSONが正しく処理され、全列車が補間済みデータを持つことを確認する
 */

import { describe, it, expect } from 'vitest'
import { processData } from '../utils/interpolation'
import type { DiagramDataRaw } from '../types/diagram'
import tokaidoRaw from '../data/tokaido-shinkansen.json'
import chuoRaw from '../data/chuo-line.json'

describe('東海道新幹線サンプルデータ', () => {
  const data = tokaidoRaw as DiagramDataRaw
  const { stations, trainTypes, trains } = processData(data)

  it('17駅が正しく読み込まれる', () => {
    expect(stations).toHaveLength(17)
    expect(stations[0]!.name).toBe('東京')
    expect(stations[16]!.name).toBe('新大阪')
  })

  it('3種別（のぞみ・ひかり・こだま）が存在する', () => {
    expect(trainTypes.size).toBe(3)
    expect(trainTypes.has('nozomi')).toBe(true)
    expect(trainTypes.has('hikari')).toBe(true)
    expect(trainTypes.has('kodama')).toBe(true)
  })

  it('全列車が処理される（少なくとも20本）', () => {
    expect(trains.length).toBeGreaterThanOrEqual(20)
  })

  it('のぞみ1号が17駅分のresolvedStopsを持つ（補間含む）', () => {
    const nozomi1 = trains.find((t) => t.id === 'nozomi1')
    expect(nozomi1).toBeDefined()
    // 東京→新大阪の全17駅分
    expect(nozomi1!.resolvedStops).toHaveLength(17)
  })

  it('のぞみ1号の通過駅（小田原）が補間されている', () => {
    const nozomi1 = trains.find((t) => t.id === 'nozomi1')!
    const odawara = nozomi1.resolvedStops.find((s) => s.station.name === '小田原')
    expect(odawara).toBeDefined()
    expect(odawara!.isScheduledStop).toBe(false)
    // 小田原の通過時刻は新横浜（06:18）〜名古屋（07:34）の間にある
    const expected = odawara!.arrivalMinutes!
    expect(expected).toBeGreaterThan(6 * 60 + 18)  // 06:18以降
    expect(expected).toBeLessThan(7 * 60 + 34)     // 07:34以前
  })

  it('こだま631号が全駅（17駅）に停車する', () => {
    const kodama = trains.find((t) => t.id === 'kodama631')
    expect(kodama).toBeDefined()
    const scheduledCount = kodama!.resolvedStops.filter((s) => s.isScheduledStop).length
    expect(scheduledCount).toBe(17)
  })

  it('上り列車（のぞみ2号）の resolvedStops が正しい順序', () => {
    const nozomi2 = trains.find((t) => t.id === 'nozomi2')
    expect(nozomi2).toBeDefined()
    expect(nozomi2!.direction).toBe('up')
    // 上り: 新大阪→東京 なので最初の駅は新大阪
    const firstStop = nozomi2!.resolvedStops[0]!
    expect(firstStop.station.name).toBe('新大阪')
  })

  it('全列車の startMinutes が endMinutes より小さい', () => {
    for (const train of trains) {
      expect(train.startMinutes).toBeLessThan(train.endMinutes)
    }
  })

  it('distanceFraction が 0〜1 の範囲に収まる', () => {
    for (const station of stations) {
      expect(station.distanceFraction).toBeGreaterThanOrEqual(0)
      expect(station.distanceFraction).toBeLessThanOrEqual(1)
    }
    expect(stations[0]!.distanceFraction).toBe(0)
    expect(stations[stations.length - 1]!.distanceFraction).toBe(1)
  })
})

describe('JR中央線サンプルデータ', () => {
  const data = chuoRaw as DiagramDataRaw
  const { stations, trainTypes, trains } = processData(data)

  it('20駅が読み込まれる', () => {
    expect(stations).toHaveLength(20)
    expect(stations[0]!.name).toBe('東京')
    expect(stations[19]!.name).toBe('高尾')
  })

  it('3種別が存在する', () => {
    expect(trainTypes.size).toBe(3)
  })

  it('全列車が少なくとも9本ある', () => {
    expect(trains.length).toBeGreaterThanOrEqual(9)
  })

  it('中央特快（ce1）が停車しない駅を正しく補間する', () => {
    const ce1 = trains.find((t) => t.id === 'ce1')
    expect(ce1).toBeDefined()
    // 中央特快は四ツ谷・中野・荻窪などを通過する
    const yotsuya = ce1!.resolvedStops.find((s) => s.station.name === '四ツ谷')
    expect(yotsuya!.isScheduledStop).toBe(false)
  })
})
