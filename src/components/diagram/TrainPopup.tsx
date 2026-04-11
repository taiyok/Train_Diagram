/**
 * 列車タップ時のポップアップコンポーネント
 * 列車名、種別、停車駅リストを表示する
 */

import type { PopupInfo } from '../../types/diagram'
import { formatMinutes } from '../../utils/interpolation'

interface TrainPopupProps {
  /** ポップアップ情報（nullのとき非表示） */
  info: PopupInfo | null
  /** 閉じるボタンのハンドラー */
  onClose: () => void
  /** コンテナの幅（はみ出し防止用） */
  containerWidth: number
  /** コンテナの高さ（はみ出し防止用） */
  containerHeight: number
}

/** ポップアップの固定サイズ */
const POPUP_WIDTH = 220
const POPUP_HEIGHT_APPROX = 280

export function TrainPopup({ info, onClose, containerWidth, containerHeight }: TrainPopupProps) {
  if (!info) return null

  const { train, screenX, screenY } = info

  // はみ出し防止: 右端・下端を超えないよう位置を調整
  const left = Math.min(screenX + 12, containerWidth - POPUP_WIDTH - 8)
  const top = Math.min(screenY - 30, containerHeight - POPUP_HEIGHT_APPROX - 8)

  // 実際の停車駅のみ（補間による通過駅は除外）
  const scheduledStops = train.resolvedStops.filter((s) => s.isScheduledStop)

  return (
    <div
      className="absolute z-50 bg-white rounded-2xl shadow-2xl"
      style={{
        left: Math.max(8, left),
        top: Math.max(8, top),
        width: POPUP_WIDTH,
        borderLeft: `6px solid ${train.type.color}`,
      }}
      // クリック・タッチがキャンバスに伝わらないよう停止
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* ヘッダー */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between">
          <span className="text-2xl">{train.type.emoji}</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>
        <div
          className="font-black text-xl mt-1 leading-tight"
          style={{
            fontFamily: '"M PLUS Rounded 1c", "Noto Sans JP", sans-serif',
            color: '#1A1A2E',
          }}
        >
          {train.name}
        </div>
        <div
          className="inline-block mt-1 px-2 py-0.5 rounded-full text-white text-xs font-bold"
          style={{ backgroundColor: train.type.color }}
        >
          {train.type.name}
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* 停車駅リスト */}
      <div
        className="overflow-y-auto px-3 py-2"
        style={{ maxHeight: 180 }}
      >
        {scheduledStops.map((stop, i) => {
          const isFirst = i === 0
          const isLast = i === scheduledStops.length - 1
          const timeStr = isFirst
            ? formatMinutes(stop.departureMinutes ?? 0)
            : isLast
              ? formatMinutes(stop.arrivalMinutes ?? 0)
              : `${stop.arrivalMinutes !== null ? formatMinutes(stop.arrivalMinutes) : ''}着 ${stop.departureMinutes !== null ? formatMinutes(stop.departureMinutes) : ''}発`

          return (
            <div
              key={stop.station.name}
              className="flex items-center gap-2 py-1 text-sm"
              style={{ fontFamily: '"M PLUS Rounded 1c", "Noto Sans JP", sans-serif' }}
            >
              {/* 駅マーカー */}
              <div className="flex flex-col items-center w-4 shrink-0">
                {!isFirst && (
                  <div
                    className="w-0.5 h-2"
                    style={{ backgroundColor: train.type.color }}
                  />
                )}
                <div
                  className="w-3 h-3 rounded-full border-2 border-white"
                  style={{ backgroundColor: train.type.color }}
                />
                {!isLast && (
                  <div
                    className="w-0.5 h-2"
                    style={{ backgroundColor: train.type.color }}
                  />
                )}
              </div>
              {/* 駅名 */}
              <div className="font-bold text-gray-800 text-sm">{stop.station.name}</div>
              {/* 時刻 */}
              <div className="ml-auto text-gray-500 text-xs">{timeStr}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
