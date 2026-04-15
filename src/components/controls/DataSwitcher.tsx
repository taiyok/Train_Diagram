/**
 * サンプルデータ切り替えコンポーネント
 */

import type { DatasetId } from '../../types/diagram'

interface DataSwitcherProps {
  activeDataset: DatasetId
  onChange: (id: DatasetId) => void
}

/** 利用可能なサンプルデータセット */
const DATASETS: { id: DatasetId; label: string; emoji: string }[] = [
  { id: 'yamanote',          label: 'JR山手線',           emoji: '🔄' },
  { id: 'chuo',              label: 'JR中央線',           emoji: '🚇' },
  { id: 'jr-saikyo',         label: 'JR埼京線',           emoji: '🚃' },
  { id: 'tobu-tojo',         label: '東武東上線',         emoji: '🚃' },
  { id: 'seibu-ikebukuro',   label: '西武池袋線',         emoji: '🚋' },
  { id: 'fukutoshin',        label: '副都心線',           emoji: '🚇' },
  { id: 'metro-yurakucho',   label: '有楽町線',           emoji: '🚇' },
]

export function DataSwitcher({ activeDataset, onChange }: DataSwitcherProps) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {DATASETS.map((ds) => (
        <button
          key={ds.id}
          onClick={() => onChange(ds.id)}
          className="flex items-center gap-1 px-3 py-2 rounded-full text-sm font-bold transition-all duration-200 active:scale-95"
          style={{
            minHeight: 44,
            backgroundColor: activeDataset === ds.id ? '#0EA5E9' : '#E0F2FE',
            color: activeDataset === ds.id ? 'white' : '#0369A1',
            fontFamily: '"M PLUS Rounded 1c", "Noto Sans JP", sans-serif',
          }}
          aria-label={ds.label}
        >
          <span>{ds.emoji}</span>
          <span className="hidden sm:inline">{ds.label}</span>
        </button>
      ))}
    </div>
  )
}
