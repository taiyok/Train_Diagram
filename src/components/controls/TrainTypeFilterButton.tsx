/**
 * 列車種別フィルターボタン
 * タップで種別の表示/非表示を切り替える
 */

import type { TrainType } from '../../types/diagram'

interface TrainTypeFilterButtonProps {
  trainType: TrainType
  isActive: boolean
  onToggle: () => void
}

export function TrainTypeFilterButton({
  trainType,
  isActive,
  onToggle,
}: TrainTypeFilterButtonProps) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 px-3 py-2 rounded-full font-bold text-base transition-all duration-200 active:scale-95 select-none shrink-0"
      style={{
        backgroundColor: isActive ? trainType.color : '#D1D5DB',
        color: 'white',
        minHeight: 44,
        boxShadow: isActive ? `0 2px 8px ${trainType.color}60` : 'none',
        fontFamily: '"M PLUS Rounded 1c", "Noto Sans JP", sans-serif',
        opacity: isActive ? 1 : 0.55,
      }}
      aria-label={`${trainType.name}を${isActive ? '非表示にする' : '表示する'}`}
      aria-pressed={isActive}
    >
      <span className="text-lg">{trainType.emoji}</span>
      <span>{trainType.name}</span>
    </button>
  )
}
