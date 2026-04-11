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

import { useEffect } from 'react'
import { useDiagramStore } from './store/useDiagramStore'
import { DiagramCanvas } from './components/diagram/DiagramCanvas'
import { StationAxisPanel, STATION_PANEL_WIDTH } from './components/layout/StationAxisPanel'
import { TimeAxisPanel, TIME_PANEL_HEIGHT } from './components/layout/TimeAxisPanel'
import { FilterBar } from './components/layout/FilterBar'
import type { DiagramDataRaw } from './types/diagram'
import tokaidoData from './data/tokaido-shinkansen.json'

export default function App() {
  const loadData = useDiagramStore((s) => s.loadData)
  const lineName = useDiagramStore((s) => s.lineName)
  const errorMessage = useDiagramStore((s) => s.errorMessage)

  // 初回起動時に東海道新幹線のサンプルデータを読み込む
  useEffect(() => {
    // Canvas サイズが確定する前のデフォルト値で初期化
    loadData(tokaidoData as DiagramDataRaw, 'tokaido', window.innerWidth - STATION_PANEL_WIDTH, window.innerHeight - TIME_PANEL_HEIGHT - 80)
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
    </div>
  )
}
