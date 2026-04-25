/**
 * 全画面発車標ビュー
 *
 * 左列に下り、右列に上りを並べて表示する。
 * 発車標は全種別を表示する（ダイヤ図のフィルター設定を無視）。
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import { useDiagramStore } from '../../store/useDiagramStore'
import { useCurrentTime } from '../../hooks/useCurrentTime'
import { formatMinutes } from '../../utils/interpolation'
import type { Station, Train, Direction } from '../../types/diagram'

/** 発車情報1件 */
interface Departure {
  train: Train
  timeMinutes: number
  isTerminal: boolean
}

/** 指定駅・指定方向の発車一覧（直前1本＋次の5本、フィルター無視） */
function getDepartures(
  trains: Train[],
  station: Station,
  direction: Direction,
  currentMinutes: number,
): Departure[] {
  const all: Departure[] = []
  for (const train of trains) {
    if (train.direction !== direction) continue
    for (const stop of train.resolvedStops) {
      if (!stop.isScheduledStop) continue
      if (stop.station.name !== station.name) continue
      const timeMinutes = stop.departureMinutes ?? stop.arrivalMinutes
      if (timeMinutes === null) continue
      all.push({ train, timeMinutes, isTerminal: stop.departureMinutes === null })
    }
  }
  all.sort((a, b) => a.timeMinutes - b.timeMinutes)

  // 直前2分以内に出た電車を1本だけ先頭に含める
  let lastPast: Departure | null = null
  for (const d of all) {
    if (d.timeMinutes < currentMinutes - 2) lastPast = d
    else break
  }
  const upcoming = all.filter((d) => d.timeMinutes >= currentMinutes - 2).slice(0, 5)
  return [...(lastPast ? [lastPast] : []), ...upcoming]
}

/** 「あと何分」の表示文字列。1分未満は null（「まもなく」で別表示） */
function formatCountdown(minutesUntil: number): string | null {
  if (minutesUntil < 1) return null
  return `あと${Math.floor(minutesUntil)}分`
}

/** 1方向分の発車列 */
function DirectionColumn({
  label,
  accentColor,
  departures,
  currentMinutes,
}: {
  label: string
  accentColor: string
  departures: Departure[]
  currentMinutes: number
}) {
  const nextIndex = departures.findIndex((d) => d.timeMinutes >= currentMinutes)

  return (
    <div
      className="flex flex-col flex-1 min-w-0"
      style={{
        backgroundColor: '#111827',
        borderRadius: 16,
        border: `2px solid ${accentColor}44`,
        overflow: 'hidden',
      }}
    >
      {/* 列ヘッダー */}
      <div
        className="flex items-center px-4 py-2 shrink-0"
        style={{ backgroundColor: `${accentColor}22`, borderBottom: `2px solid ${accentColor}66` }}
      >
        <span style={{ color: accentColor, fontWeight: 900, fontSize: 16 }}>{label}</span>
      </div>

      {/* 発車リスト */}
      <div className="flex flex-col gap-2 p-2 flex-1">
        {departures.length === 0 ? (
          <p style={{ color: '#4b5563', textAlign: 'center', marginTop: 32, fontSize: 14 }}>
            でんしゃが ありません 🌙
          </p>
        ) : (
          departures.map((dep, i) => {
            const isPast = dep.timeMinutes < currentMinutes
            const isNext = i === nextIndex
            const minutesUntil = dep.timeMinutes - currentMinutes
            const isImminent = !isPast && minutesUntil < 1
            const countdown = isPast ? null : formatCountdown(minutesUntil)

            return (
              <div
                key={`${dep.train.id}-${dep.timeMinutes}`}
                style={{
                  backgroundColor: isNext ? '#1e3a8a' : '#1f2937',
                  border: isNext ? `2px solid ${dep.train.type.color}` : '2px solid transparent',
                  borderRadius: 12,
                  padding: isNext ? '12px 14px' : '8px 12px',
                  opacity: isPast ? 0.3 : 1,
                  transition: 'opacity 0.4s',
                }}
              >
                <div className="flex items-center gap-2">
                  {/* 発車時刻 */}
                  <div
                    style={{
                      color: isNext || isImminent ? '#fde68a' : '#e2e8f0',
                      fontSize: isNext ? 32 : 22,
                      fontWeight: 900,
                      lineHeight: 1,
                      minWidth: isNext ? 90 : 70,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatMinutes(dep.timeMinutes)}
                  </div>

                  {/* 絵文字 */}
                  <span style={{ fontSize: isNext ? 26 : 18, lineHeight: 1, flexShrink: 0 }}>
                    {dep.train.type.emoji}
                  </span>

                  {/* 種別名 */}
                  <div className="flex-1 min-w-0">
                    <div
                      style={{
                        color: dep.train.type.color,
                        fontWeight: 900,
                        fontSize: isNext ? 16 : 13,
                        lineHeight: 1.2,
                      }}
                    >
                      {dep.train.type.name}
                    </div>
                    {dep.isTerminal && (
                      <div style={{ color: '#f87171', fontSize: 11 }}>終点</div>
                    )}
                  </div>

                  {/* まもなく / あと何分 / バッジ */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {isNext ? (
                      <div
                        style={{
                          backgroundColor: '#fde68a',
                          color: '#1e3a8a',
                          fontWeight: 900,
                          fontSize: 12,
                          padding: '3px 10px',
                          borderRadius: 9999,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        つぎ！
                      </div>
                    ) : !isPast && (
                      <div
                        style={{
                          color: isImminent ? '#f87171' : minutesUntil <= 5 ? '#fcd34d' : '#6b7280',
                          fontWeight: 700,
                          fontSize: 12,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isImminent ? 'まもなく' : countdown ?? ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
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

  // 選択中の駅ボタンを横スクロールバーの中央に表示する
  const selectedBtnRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    selectedBtnRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }, [selectedStation])

  const downDeps = useMemo(
    () => (selectedStation ? getDepartures(trains, selectedStation, 'down', currentMinutes) : []),
    [trains, selectedStation, currentMinutes],
  )

  const upDeps = useMemo(
    () => (selectedStation ? getDepartures(trains, selectedStation, 'up', currentMinutes) : []),
    [trains, selectedStation, currentMinutes],
  )

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

      {/* 駅選択バー */}
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

      {/* 下り・上り 2カラム */}
      {!selectedStation ? (
        <p style={{ color: '#6b7280', textAlign: 'center', marginTop: 80, fontSize: 18 }}>
          えきを えらんでね 👆
        </p>
      ) : (
        <div className="flex flex-1 min-h-0 gap-3 px-3 py-3">
          <DirectionColumn
            label="▼ 下り"
            accentColor="#fb923c"
            departures={downDeps}
            currentMinutes={currentMinutes}
          />
          <DirectionColumn
            label="▲ 上り"
            accentColor="#34d399"
            departures={upDeps}
            currentMinutes={currentMinutes}
          />
        </div>
      )}
    </div>
  )
}
