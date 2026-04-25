/**
 * 全画面発車標ビュー
 *
 * 駅を選ぶと、その駅の次の電車を時刻順に一覧表示する。
 * 現在時刻に最も近い次の電車を強調し、時刻の経過とともに自動更新する。
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import { useDiagramStore } from '../../store/useDiagramStore'
import { useCurrentTime } from '../../hooks/useCurrentTime'
import { formatMinutes } from '../../utils/interpolation'
import type { Station, Train } from '../../types/diagram'

/** 発車情報1件 */
interface Departure {
  /** 列車データ */
  train: Train
  /** 発車（または到着）時刻（0時からの分数） */
  timeMinutes: number
  /** 終着駅（発車時刻なし）かどうか */
  isTerminal: boolean
}

/**
 * 指定駅の発車一覧を取得する。
 * フィルター適用・時刻昇順ソート済み。
 */
function getDepartures(
  trains: Train[],
  station: Station,
  filterState: Record<string, boolean>,
): Departure[] {
  const result: Departure[] = []
  for (const train of trains) {
    if (filterState[train.type.id] === false) continue
    for (const stop of train.resolvedStops) {
      if (!stop.isScheduledStop) continue
      if (stop.station.name !== station.name) continue
      const timeMinutes = stop.departureMinutes ?? stop.arrivalMinutes
      if (timeMinutes === null) continue
      result.push({
        train,
        timeMinutes,
        isTerminal: stop.departureMinutes === null,
      })
    }
  }
  return result.sort((a, b) => a.timeMinutes - b.timeMinutes)
}

interface DepartureBoardViewProps {
  onClose: () => void
}

export function DepartureBoardView({ onClose }: DepartureBoardViewProps) {
  const stations = useDiagramStore((s) => s.stations)
  const trains = useDiagramStore((s) => s.trains)
  const filterState = useDiagramStore((s) => s.filterState)
  const lineName = useDiagramStore((s) => s.lineName)
  const anchorStation = useDiagramStore((s) => s.anchorStation)

  const currentMinutes = useCurrentTime()

  // アンカー駅があればそれを初期選択、なければ先頭駅
  const [selectedStation, setSelectedStation] = useState<Station | null>(
    anchorStation ?? (stations.length > 0 ? stations[0] : null),
  )

  // 選択駅の全発車リスト（フィルター・ソート済み）
  const allDepartures = useMemo(() => {
    if (!selectedStation) return []
    return getDepartures(trains, selectedStation, filterState)
  }, [trains, selectedStation, filterState])

  // 現在時刻以降の最初の発車インデックス
  const nextIndex = useMemo(
    () => allDepartures.findIndex((d) => d.timeMinutes >= currentMinutes),
    [allDepartures, currentMinutes],
  )

  // 3分前から表示（直前に出た電車も見えるように）
  const departures = useMemo(
    () => allDepartures.filter((d) => d.timeMinutes >= currentMinutes - 3),
    [allDepartures, currentMinutes],
  )

  // 表示リスト内での「次の電車」インデックス
  const nowIndexInView = useMemo(
    () => departures.findIndex((d) => d.timeMinutes >= currentMinutes),
    [departures, currentMinutes],
  )

  // 「次の電車」の行にスクロールする
  const nextRowRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    nextRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [nextIndex])

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
        <span style={{ fontSize: 28 }}>🚉</span>
        <div className="flex-1 min-w-0">
          <div className="font-black text-xl leading-tight">つぎの でんしゃ</div>
          {lineName && (
            <div style={{ color: '#93c5fd', fontSize: 12 }}>{lineName}</div>
          )}
        </div>

        {/* 現在時刻 */}
        <div className="text-right shrink-0">
          <div style={{ color: '#fde68a', fontSize: 11 }}>いま</div>
          <div style={{ color: '#fde68a', fontWeight: 900, fontSize: 22, lineHeight: 1 }}>
            {formatMinutes(currentMinutes)}
          </div>
        </div>

        {/* 閉じるボタン */}
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
        style={{
          backgroundColor: '#111827',
          borderBottom: '1px solid #1f2937',
        }}
      >
        <span style={{ color: '#6b7280', fontSize: 12, flexShrink: 0 }}>えき：</span>
        {stations.map((station) => {
          const isSelected = selectedStation?.name === station.name
          return (
            <button
              key={station.name}
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

      {/* 発車一覧 */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {!selectedStation ? (
          <div
            style={{ color: '#6b7280', textAlign: 'center', marginTop: 64, fontSize: 18 }}
          >
            えきを えらんでね 👆
          </div>
        ) : departures.length === 0 ? (
          <div
            style={{ color: '#6b7280', textAlign: 'center', marginTop: 64, fontSize: 18 }}
          >
            でんしゃが ありません 🌙
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {departures.map((dep, i) => {
              const isPast = dep.timeMinutes < currentMinutes
              const isNext = i === nowIndexInView
              const minutesUntil = dep.timeMinutes - currentMinutes

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
                    padding: isNext ? '14px 16px' : '10px 14px',
                    opacity: isPast ? 0.35 : 1,
                    transition: 'opacity 0.3s',
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* 発車時刻 */}
                    <div
                      style={{
                        color: isNext ? '#fde68a' : minutesUntil <= 5 ? '#fcd34d' : '#e2e8f0',
                        fontSize: isNext ? 36 : 26,
                        fontWeight: 900,
                        lineHeight: 1,
                        minWidth: isNext ? 100 : 80,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatMinutes(dep.timeMinutes)}
                    </div>

                    {/* 絵文字 */}
                    <span style={{ fontSize: isNext ? 32 : 22, lineHeight: 1 }}>
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
                      <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>
                        {dep.train.name}
                      </div>
                    </div>

                    {/* あと何分 */}
                    {!isPast && minutesUntil <= 15 && (
                      <div
                        style={{
                          color: minutesUntil <= 3 ? '#f87171' : '#fcd34d',
                          fontWeight: 900,
                          fontSize: isNext ? 16 : 13,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        あと{Math.round(minutesUntil)}分
                      </div>
                    )}

                    {/* 方向 */}
                    <div
                      style={{
                        color: '#94a3b8',
                        fontSize: isNext ? 15 : 13,
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {dep.isTerminal ? (
                        <span style={{ color: '#f87171', fontWeight: 'bold' }}>終</span>
                      ) : dep.train.direction === 'down' ? (
                        '▼ 下り'
                      ) : (
                        '▲ 上り'
                      )}
                    </div>

                    {/* 次の電車バッジ */}
                    {isNext && (
                      <div
                        style={{
                          backgroundColor: '#fde68a',
                          color: '#1e3a8a',
                          fontWeight: 900,
                          fontSize: 12,
                          padding: '3px 10px',
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
