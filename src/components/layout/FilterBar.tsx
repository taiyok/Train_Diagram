/**
 * 下部フィルターバー
 * 列車種別の表示切り替えと路線切り替えを提供する
 */

import { useCallback } from 'react'
import { useDiagramStore } from '../../store/useDiagramStore'
import { TrainTypeFilterButton } from '../controls/TrainTypeFilterButton'
import { DataSwitcher } from '../controls/DataSwitcher'
import { FileUploadButton } from '../controls/FileUploadButton'
import { useFileUpload } from '../../hooks/useFileUpload'
import type { DatasetId, DiagramDataRaw } from '../../types/diagram'
import tokaidoData from '../../data/tokaido-shinkansen.json'
import tohokuData from '../../data/tohoku-shinkansen.json'
import yamanoteData from '../../data/jr-yamanote-line.json'
import chuoData from '../../data/chuo-line.json'
import tobuTojoData from '../../data/tobu-tojo-line.json'
import seibuIkebukuroData from '../../data/seibu-ikebukuro-line.json'
import jrSaikyoData from '../../data/jr-saikyo-line.json'
import fukutoshinData from '../../data/metro-fukutoshin-line.json'
import metroYurakuchoData from '../../data/metro-yurakucho-line.json'

export function FilterBar() {
  const trainTypes = useDiagramStore((s) => s.trainTypes)
  const filterState = useDiagramStore((s) => s.filterState)
  const activeDataset = useDiagramStore((s) => s.activeDataset)
  const toggleFilter = useDiagramStore((s) => s.toggleFilter)
  const resetFilter = useDiagramStore((s) => s.resetFilter)
  const loadData = useDiagramStore((s) => s.loadData)
  const viewport = useDiagramStore((s) => s.viewport)

  const { handleFileChange } = useFileUpload(viewport.canvasWidth, viewport.canvasHeight)

  // フィルターが1種別だけ有効かどうか（「でんしゃをさがそう！」モード）
  const activeCount = Object.values(filterState).filter(Boolean).length
  const totalCount = trainTypes.size
  const isSearchMode = activeCount === 1 && totalCount > 1

  // 路線切り替え
  const handleDatasetChange = useCallback(
    (id: DatasetId) => {
      const dataMap: Record<string, unknown> = {
        tokaido: tokaidoData,
        'tohoku-shinkansen': tohokuData,
        yamanote: yamanoteData,
        chuo: chuoData,
        'tobu-tojo': tobuTojoData,
        'seibu-ikebukuro': seibuIkebukuroData,
        'jr-saikyo': jrSaikyoData,
        fukutoshin: fukutoshinData,
        'metro-yurakucho': metroYurakuchoData,
      }
      const data = dataMap[id] ?? tokaidoData
      loadData(data as DiagramDataRaw, id, viewport.canvasWidth, viewport.canvasHeight)
    },
    [loadData, viewport.canvasWidth, viewport.canvasHeight],
  )

  return (
    <div
      className="flex flex-col border-t-4"
      style={{
        backgroundColor: '#FFF9E6',
        borderTopColor: '#F0D070',
      }}
    >
      {/* 「でんしゃをさがそう！」バナー */}
      {isSearchMode && (
        <div
          className="text-center py-1 text-lg font-black animate-bounce"
          style={{
            color: '#D97706',
            fontFamily: '"M PLUS Rounded 1c", "Noto Sans JP", sans-serif',
          }}
        >
          🔍 でんしゃをさがそう！
        </div>
      )}

      {/* コントロール行 */}
      <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto">
        {/* 列車種別フィルターボタン */}
        {[...trainTypes.values()].map((type) => (
          <TrainTypeFilterButton
            key={type.id}
            trainType={type}
            isActive={filterState[type.id] !== false}
            onToggle={() => toggleFilter(type.id)}
          />
        ))}

        {/* フィルターをリセット */}
        {isSearchMode && (
          <button
            onClick={resetFilter}
            className="flex items-center gap-1 px-3 py-2 rounded-full text-sm font-bold active:scale-95 shrink-0"
            style={{
              minHeight: 44,
              backgroundColor: '#F3F4F6',
              color: '#374151',
              fontFamily: '"M PLUS Rounded 1c", "Noto Sans JP", sans-serif',
            }}
          >
            全部みる
          </button>
        )}

        {/* 区切り */}
        <div className="w-px h-8 bg-amber-300 shrink-0 mx-1" />

        {/* データ切り替え */}
        <DataSwitcher activeDataset={activeDataset} onChange={handleDatasetChange} />

        {/* ファイルアップロード */}
        <FileUploadButton onChange={handleFileChange} />
      </div>
    </div>
  )
}
