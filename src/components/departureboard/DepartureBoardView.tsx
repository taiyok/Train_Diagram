/**
 * 全画面発車標ビュー
 *
 * 駅を選び、方向（上り/下り）を絞ると次の電車を大きく表示する。
 * 発車標は全種別を表示する（ダイヤ図のフィルター設定を無視）。
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import { useDiagramStore } from '../../store/useDiagramStore'
import { useCurrentTime } from '../../hooks/useCurrentTime'
import { formatMinutes } from '../../utils/interpolation'
import type { Station, Train, Direction } from '../../types/diagram'

/** 発車標の方向フィルター */
type DirectionFilter = 'all' | Direction

/** 発車情報1件 */
interface Departure {
  train: Train
  /** 発車時刻（0時からの分数）。終着駅は到着時刻 */
  timeMinutes: number
  isTerminal: boolean
}

/** 指定駅の全発車一覧を取得する（フィルター無視・時刻昇順） */
function getDepartures(trains: Train[], station: Station): Departure[] {
  const result: Departure[] = []
  for (const train of trains) {
    for (const stop of train.resolvedStops) {
      if (!stop.isScheduledStop) continue
      if (stop.station.name !== station.name) continue
      const timeMinutes = stop.departureMinutes ?? stop.arrivalMinutes
      if (timeMinutes === null) continue
      result.push({ train, timeMinutes, isTerminal: stop.departureMinutes === null })
    }
  }
  return result.sort((a, b) => a.timeMinutes - b.timeMinutes)
}

/** 「あと何分」の表示文字列。1分未満は null（「まもなく」で別表示） */
function formatCountdown(minutesUntil: number): string | null {
  if (minutesUntil < 1) return null
  return `あと${Math.floor(minutesUntil)}分`
}

interface DepartureBoardViewProps {
  onClose: () => void
}

export function DepartureBoardView({ onClose }: DepartureBoardViewProps) {
  const stations = useDiagramStore((s) => s.stations)
  const trains = useDiagramStore((s) => s.trains)
  const lineName = useDiagramStore((s) => s.lineName)
  const anchorStation = useDiagramStore((s) => s.anchorStation)

  const currentMinutes = useCurrentTime()

  const [selectedStation, setSelectedStation] = useState<Station | null>(
    anchorStation ?? (stations.length > 0 ? stations[0] : null),
  )
  const [dirFilter, setDirFilter] = useState<DirectionFilter>('all')

  // 選択中の駅ボタンを横スクロールバーの中央に表示する
  const selectedBtnRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    selectedBtnRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }, [selectedStation])

  // 選択駅の全発車（フィルター無視）
  const allDepartures = useMemo(() => {
    if (!selectedStation) return []
    return getDepartures(trains, selectedStation)
  }, [trains, selectedStation])

  // 方向フィルター適用後の直近表示リスト
  // 「直前1本（2分以内）＋これから10本」に絞る
  const departures = useMemo(() => {
    const filtered = dirFilter === 'all'
      ? allDepartures
      : allDepartures.filter((d) => d.train.direction === dirFilter)

    // 直前の出発済みは最大1本だけ含める（2分以内）
    const upcoming = filtered.filter((d) => d.timeMinutes >= currentMinutes - 2)
    let lastPast: Departure | null = null
    for (const d of filtered) {
      if (d.timeMinutes < currentMinutes - 2) lastPast = d
      else break
    }
    return [...(lastPast ? [lastPast] : []), ...upcoming.slice(0, 10)]
  }, [allDepartures, dirFilter, currentMinutes])

  // 表示リスト内での「次の電車」インデックス
  const nextIndexInView = useMemo(
    () => departures.findIndex((d) => d.timeMinutes >= currentMinutes),
    [departures, currentMinutes],
  )

  // 「次の電車」行が変わったらスクロール
  const nextRowRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    nextRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [nextIndexInView])

  // 方向タブの定義
  const dirTabs: { key: DirectionFilter; label: string }[] = [
    { key: 'all', label: 'すべて' },
    { key: 'down', label: '▼ 下り' },
    { key: 'up', label: '▲ 上り' },
  ]

  return (
    <div
      className="flex flex-col"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        backgroundColor: '#0B1120',
        fontFamily: '"M PLUS Rounded 1c", "Noto Sans JP", sans-serif',
        color: 'white',
      }}
    >
      {/* ヘッダー */}
      <div
        className="flex items-center px-4 gap-3 shrink-0"
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
          minHeight: 52,
          borderBottom: '2px solid #3b82f6',
        }}
      >
        <span style={{ fontSize: 26 }}>🚉</span>
        <div className="flex-1 min-w-0">
          <div style={{ fontWeight: 900, fontSize: 18, lineHeight: 1.2 }}>つぎの でんしゃ</div>
          {lineName && <div style={{ color: '#93c5fd', fontSize: 12 }}>{lineName}</div>}
        </div>

        {/* 現在時刻 */}
        <div className="text-right shrink-0">
          <div style={{ color: '#fde68a', fontSize: 10 }}>いま</div>
          <div style={{ color: '#fde68a', fontWeight: 900, fontSize: 24, lineHeight: 1 }}>
            {formatMinutes(currentMinutes)}
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            backgroundColor: 'rgba(255,255,255,0.15)',
            color: 'white',
            fontWeight: 'bold',
            fontSize: 13,
            padding: '6px 14px',
            borderRadius: 9999,
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          ダイヤにもどる
        </button>
      </div>

      {/* 駅選択バー（横スクロール） */}
      <div
        className="shrink-0 flex items-center gap-2 px-3 py-2 overflow-x-auto"
        style={{ backgroundColor: '#111827', borderBottom: '1px solid #1f2937' }}
      >
        <span style={{ color: '#6b7280', fontSize: 12, flexShrink: 0 }}>えき：</span>
        {stations.map((station) => {
          const isSelected = selectedStation?.name === station.name
          return (
            <button
              key={station.name}
              ref={isSelected ? selectedBtnRef : null}
              onClick={() => setSelectedStation(station)}
              style={{
                backgroundColor: isSelected ? '#1d4ed8' : '#1f2937',
                color: isSelected ? 'white' : '#9ca3af',
                fontWeight: isSelected ? 900 : 'normal',
                fontSize: 14,
                padding: '5px 14px',
                borderRadius: 9999,
                border: isSelected ? '2px solid #60a5fa' : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
                flexShrink: 0,
              }}
            >
              {station.name}
            </button>
          )
        })}
      </div>

      {/* 方向タブ */}
      <div
        className="shrink-0 flex gap-2 px-3 py-2"
        style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #1f2937' }}
      >
        {dirTabs.map(({ key, label }) => {
          const isActive = dirFilter === key
          return (
            <button
              key={key}
              onClick={() => setDirFilter(key)}
              style={{
                backgroundColor: isActive ? '#f97316' : '#1f2937',
                color: isActive ? 'white' : '#9ca3af',
                fontWeight: isActive ? 900 : 'normal',
                fontSize: 14,
                padding: '6px 18px',
                borderRadius: 9999,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* 発車一覧 */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {!selectedStation ? (
          <p style={{ color: '#6b7280', textAlign: 'center', marginTop: 64, fontSize: 18 }}>
            えきを えらんでね 👆
          </p>
        ) : departures.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', marginTop: 64, fontSize: 18 }}>
            でんしゃが ありません 🌙
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {departures.map((dep, i) => {
              const isPast = dep.timeMinutes < currentMinutes
              const isNext = i === nextIndexInView
              const minutesUntil = dep.timeMinutes - currentMinutes
              const isImminent = !isPast && minutesUntil < 1
              const countdown = isPast ? null : formatCountdown(minutesUntil)

              return (
                <div
                  key={`${dep.train.id}-${dep.timeMinutes}`}
                  ref={isNext ? nextRowRef : null}
                  style={{
                    backgroundColor: isNext ? '#1e3a8a' : '#111827',
                    border: isNext
                      ? `2px solid ${dep.train.type.color}`
                      : '2px solid #1f2937',
                    borderRadius: 14,
                    padding: isNext ? '16px 18px' : '10px 14px',
                    opacity: isPast ? 0.3 : 1,
                    transition: 'opacity 0.4s',
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* 発車時刻 */}
                    <div
                      style={{
                        color: isNext || isImminent ? '#fde68a' : '#e2e8f0',
                        fontSize: isNext ? 40 : 26,
                        fontWeight: 900,
                        lineHeight: 1,
                        minWidth: isNext ? 108 : 82,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatMinutes(dep.timeMinutes)}
                    </div>

                    {/* 絵文字 */}
                    <span style={{ fontSize: isNext ? 34 : 22, lineHeight: 1, flexShrink: 0 }}>
                      {dep.train.type.emoji}
                    </span>

                    {/* 種別名・列車名 */}
                    <div className="flex-1 min-w-0">
                      <div
                        style={{
                          color: dep.train.type.color,
                          fontWeight: 900,
                          fontSize: isNext ? 20 : 16,
                          lineHeight: 1.2,
                        }}
                      >
                        {dep.train.type.name}
                      </div>
                      <div style={{ color: '#4b5563', fontSize: 12, marginTop: 2 }}>
                        {dep.train.name}
                        {dep.isTerminal && (
                          <span style={{ color: '#f87171', marginLeft: 6 }}>（終点）</span>
                        )}
                      </div>
                    </div>

                    {/* まもなく / あと何分 */}
                    {!isPast && (
                      <div
                        style={{
                          color: isImminent ? '#f87171' : minutesUntil <= 5 ? '#fcd34d' : '#94a3b8',
                          fontWeight: 900,
                          fontSize: isNext ? 17 : 13,
                          whiteSpace: 'nowrap',
                          textAlign: 'right',
                        }}
                      >
                        {isImminent ? 'まもなく' : countdown ?? ''}
                      </div>
                    )}

                    {/* 方向（すべて表示のとき特に重要） */}
                    {dirFilter === 'all' && !dep.isTerminal && (
                      <div
                        style={{
                          color: dep.train.direction === 'down' ? '#fb923c' : '#34d399',
                          fontWeight: 900,
                          fontSize: isNext ? 15 : 13,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {dep.train.direction === 'down' ? '▼ 下り' : '▲ 上り'}
                      </div>
                    )}

                    {/* 次の電車バッジ */}
                    {isNext && (
                      <div
                        style={{
                          backgroundColor: '#fde68a',
                          color: '#1e3a8a',
                          fontWeight: 900,
                          fontSize: 12,
                          padding: '4px 12px',
                          borderRadius: 9999,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        つぎ！
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
