/**
 * アプリのルートコンポーネント
 * CSS Gridで全体レイアウトを構成する:
 *
 *   ┌──────────┬────────────────────────────┐
 *   │  (角)    │     時刻軸                  │ ← TIME_PANEL_HEIGHT
 *   ├──────────┼────────────────────────────┤
 *   │  駅軸    │     メインCanvas           │ ← flex-1
 *   ├──────────┴────────────────────────────┤
 *   │          フィルターバー               │ ← auto
 *   └───────────────────────────────────────┘
 */

import { useEffect, useState } from 'react'
import { useDiagramStore } from './store/useDiagramStore'
import { DiagramCanvas } from './components/diagram/DiagramCanvas'
import { StationAxisPanel, STATION_PANEL_WIDTH } from './components/layout/StationAxisPanel'
import { TimeAxisPanel, TIME_PANEL_HEIGHT } from './components/layout/TimeAxisPanel'
import { FilterBar } from './components/layout/FilterBar'
import { DepartureBoardView } from './components/departureboard/DepartureBoardView'
import type { DiagramDataRaw } from './types/diagram'
import yamanoteData from './data/jr-yamanote-line.json'

export default function App() {
  const loadData = useDiagramStore((s) => s.loadData)
  const lineName = useDiagramStore((s) => s.lineName)
  const errorMessage = useDiagramStore((s) => s.errorMessage)
  const resetViewport = useDiagramStore((s) => s.resetViewport)

  const [viewMode, setViewMode] = useState<'diagram' | 'board'>('diagram')

  // 初回起動時に東海道新幹線のサンプルデータを読み込む
  useEffect(() => {
    // Canvas サイズが確定する前のデフォルト値で初期化（ResizeObserver がすぐに正確な値に更新する）
    // TITLE_BAR_HEIGHT: タイトルバーの概算高さ（minHeight: 44px）
    const TITLE_BAR_HEIGHT = 44
    loadData(yamanoteData as DiagramDataRaw, 'yamanote', window.innerWidth - STATION_PANEL_WIDTH, window.innerHeight - TIME_PANEL_HEIGHT - TITLE_BAR_HEIGHT)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className="flex flex-col"
      style={{
        height: '100dvh',
        backgroundColor: '#FFFBF0',
        fontFamily: '"M PLUS Rounded 1c", "Noto Sans JP", sans-serif',
      }}
    >
      {/* タイトルバー */}
      <div
        className="flex items-center px-3 py-1.5 shrink-0"
        style={{
          background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
          minHeight: 44,
        }}
      >
        <span className="text-2xl mr-2">🚄</span>
        <span
          className="text-white font-black text-lg"
          style={{ fontFamily: '"M PLUS Rounded 1c", sans-serif' }}
        >
          でんしゃダイヤグラム
        </span>
        {lineName && (
          <span
            className="ml-3 text-blue-200 text-sm font-bold"
            style={{ fontFamily: '"M PLUS Rounded 1c", sans-serif' }}
          >
            {lineName}
          </span>
        )}
        <div className="ml-auto flex gap-2">
          {/* 発車標モードボタン */}
          <button
            onClick={() => setViewMode('board')}
            className="active:scale-95 transition-transform"
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              fontFamily: '"M PLUS Rounded 1c", sans-serif',
              fontWeight: 'bold',
              fontSize: 13,
              padding: '4px 12px',
              borderRadius: 9999,
              minHeight: 32,
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            aria-label="次の電車を見る"
          >
            🚉 つぎの でんしゃ
          </button>

          {/* 現在時刻にもどるボタン */}
          <button
            onClick={resetViewport}
            className="active:scale-95 transition-transform"
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              fontFamily: '"M PLUS Rounded 1c", sans-serif',
              fontWeight: 'bold',
              fontSize: 13,
              padding: '4px 12px',
              borderRadius: 9999,
              minHeight: 32,
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            aria-label="現在時刻の表示にもどる"
          >
            🕐 いまを見る
          </button>
        </div>
      </div>

      {/* エラー表示 */}
      {errorMessage && (
        <div className="bg-red-100 border-l-4 border-red-500 px-4 py-2 text-red-700 text-sm">
          {errorMessage}
        </div>
      )}

      {/* 時刻軸 */}
      <TimeAxisPanel />

      {/* 中段: 駅軸 + メインCanvas */}
      <div className="flex flex-1 min-h-0">
        <StationAxisPanel />
        <div className="flex-1 min-w-0 min-h-0">
          <DiagramCanvas />
        </div>
      </div>

      {/* フィルターバー */}
      <FilterBar />

      {/* 発車標モード（全画面オーバーレイ） */}
      {viewMode === 'board' && (
        <DepartureBoardView onClose={() => setViewMode('diagram')} />
      )}
    </div>
  )
}
