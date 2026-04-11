/**
 * 通過駅の時刻補間ユーティリティ
 *
 * 時刻表データには停車駅しか記載されていないため、
 * 通過駅の時刻を前後の停車駅から線形補間で推定する。
 */

import type {
  DiagramDataRaw,
  TrainRaw,
  Train,
  TrainType,
  Station,
  ResolvedStop,
} from '../types/diagram'

/**
 * "HH:MM" 形式の時刻文字列を「0時からの分数」に変換する。
 * 25:30 のような翌日表記にも対応。
 */
export function parseTime(hhmm: string): number {
  const parts = hhmm.split(':')
  const h = parseInt(parts[0] ?? '0', 10)
  const m = parseInt(parts[1] ?? '0', 10)
  return h * 60 + m
}

/**
 * 分数を "HH:MM" 形式にフォーマットする。
 * 例: 362 → "06:02"
 */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * 生の路線データを描画用データに変換する。
 * - StationRaw → Station（distanceFraction を計算）
 * - TrainRaw → Train（全駅分の ResolvedStop を補間で生成）
 */
export function processData(raw: DiagramDataRaw): {
  stations: Station[]
  trainTypes: Map<string, TrainType>
  trains: Train[]
} {
  // 全距離の最大値（路線長）
  const maxDistance = Math.max(...raw.stations.map((s) => s.distance))

  // 駅リストを処理済みデータに変換
  const stations: Station[] = raw.stations.map((s) => ({
    name: s.name,
    distance: s.distance,
    distanceFraction: maxDistance > 0 ? s.distance / maxDistance : 0,
  }))

  // 駅名→Stationのマップ（高速アクセス用）
  const stationMap = new Map<string, Station>()
  for (const s of stations) {
    stationMap.set(s.name, s)
  }

  // 列車種別を Map に変換
  const trainTypes = new Map<string, TrainType>()
  for (const t of raw.trainTypes) {
    trainTypes.set(t.id, { ...t })
  }

  // 各列車の停車情報を補間で展開
  const trains: Train[] = []
  for (const trainRaw of raw.trains) {
    const type = trainTypes.get(trainRaw.typeId)
    if (!type) continue // 未知の種別はスキップ

    const resolvedStops = resolveTrainStops(trainRaw, stations, stationMap)
    if (resolvedStops.length === 0) continue

    // 運行時刻範囲を計算（ビューポートカリング用）
    let startMinutes = Infinity
    let endMinutes = -Infinity
    for (const stop of resolvedStops) {
      const t = stop.departureMinutes ?? stop.arrivalMinutes
      if (t !== null) {
        if (t < startMinutes) startMinutes = t
        if (t > endMinutes) endMinutes = t
      }
    }

    trains.push({
      id: trainRaw.id,
      name: trainRaw.name,
      type,
      direction: trainRaw.direction,
      resolvedStops,
      startMinutes: isFinite(startMinutes) ? startMinutes : 0,
      endMinutes: isFinite(endMinutes) ? endMinutes : 1440,
    })
  }

  return { stations, trainTypes, trains }
}

/**
 * 1本の列車について、路線上の全駅分の ResolvedStop[] を生成する。
 * 時刻表に含まれない通過駅は前後の停車駅から線形補間する。
 */
function resolveTrainStops(
  trainRaw: TrainRaw,
  allStations: Station[],
  stationMap: Map<string, Station>,
): ResolvedStop[] {
  // 停車駅の時刻情報を Map 化
  const scheduledMap = new Map<
    string,
    { arrivalMinutes: number | null; departureMinutes: number | null }
  >()

  for (const entry of trainRaw.timetable) {
    scheduledMap.set(entry.station, {
      arrivalMinutes: entry.arrival ? parseTime(entry.arrival) : null,
      departureMinutes: entry.departure ? parseTime(entry.departure) : null,
    })
  }

  // 時刻表に記載された停車駅（路線上の順序で並んでいる前提）
  const scheduledStations = trainRaw.timetable
    .map((e) => stationMap.get(e.station))
    .filter((s): s is Station => s !== undefined)

  if (scheduledStations.length < 2) return []

  // 路線上での始発・終着の距離範囲
  const originStation = scheduledStations[0]
  const terminusStation = scheduledStations[scheduledStations.length - 1]

  // 下り列車 → 距離昇順、上り列車 → 距離降順
  let stationsInOrder: Station[]
  if (trainRaw.direction === 'down') {
    stationsInOrder = allStations.filter(
      (s) =>
        s.distance >= originStation.distance &&
        s.distance <= terminusStation.distance,
    )
  } else {
    stationsInOrder = allStations
      .filter(
        (s) =>
          s.distance >= terminusStation.distance &&
          s.distance <= originStation.distance,
      )
      .slice()
      .reverse()
  }

  // 全駅分の ResolvedStop を構築
  const result: ResolvedStop[] = []

  for (let i = 0; i < stationsInOrder.length; i++) {
    const station = stationsInOrder[i]
    const scheduled = scheduledMap.get(station.name)

    if (scheduled) {
      // 停車駅：時刻表の値をそのまま使用
      result.push({
        station,
        arrivalMinutes: scheduled.arrivalMinutes,
        departureMinutes: scheduled.departureMinutes,
        isScheduledStop: true,
      })
    } else {
      // 通過駅：前後の停車駅から線形補間
      const interpolated = interpolatePassThrough(
        station,
        stationsInOrder,
        i,
        scheduledMap,
        trainRaw.direction,
      )
      result.push({
        station,
        arrivalMinutes: interpolated,
        departureMinutes: interpolated,
        isScheduledStop: false,
      })
    }
  }

  return result
}

/**
 * 通過駅の時刻を前後の停車駅から距離比で線形補間する。
 */
function interpolatePassThrough(
  target: Station,
  stationsInOrder: Station[],
  targetIndex: number,
  scheduledMap: Map<string, { arrivalMinutes: number | null; departureMinutes: number | null }>,
  direction: 'down' | 'up',
): number | null {
  // 前方の停車駅を探す（時刻表に含まれている最後の駅）
  let prevStation: Station | null = null
  let prevMinutes: number | null = null
  for (let i = targetIndex - 1; i >= 0; i--) {
    const s = stationsInOrder[i]
    const sched = scheduledMap.get(s!.name)
    if (sched) {
      prevStation = s!
      // 発車時刻があれば優先、なければ到着時刻
      prevMinutes = sched.departureMinutes ?? sched.arrivalMinutes
      break
    }
  }

  // 後方の停車駅を探す
  let nextStation: Station | null = null
  let nextMinutes: number | null = null
  for (let i = targetIndex + 1; i < stationsInOrder.length; i++) {
    const s = stationsInOrder[i]
    const sched = scheduledMap.get(s!.name)
    if (sched) {
      nextStation = s!
      // 到着時刻があれば優先、なければ発車時刻
      nextMinutes = sched.arrivalMinutes ?? sched.departureMinutes
      break
    }
  }

  if (
    prevStation === null ||
    nextStation === null ||
    prevMinutes === null ||
    nextMinutes === null
  ) {
    return null
  }

  // 距離に基づいて時刻を線形補間
  const totalDist =
    direction === 'down'
      ? nextStation.distance - prevStation.distance
      : prevStation.distance - nextStation.distance

  const targetDist =
    direction === 'down'
      ? target.distance - prevStation.distance
      : prevStation.distance - target.distance

  if (totalDist <= 0) return prevMinutes

  const fraction = targetDist / totalDist
  return Math.round(prevMinutes + fraction * (nextMinutes - prevMinutes))
}
