/**
 * JSONファイルのアップロード処理フック
 */

import { useCallback } from 'react'
import type { DiagramDataRaw } from '../types/diagram'
import { useDiagramStore } from '../store/useDiagramStore'

/** ファイルアップロードフックの戻り値 */
interface UseFileUploadReturn {
  /** ファイル選択イベントのハンドラー */
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void
}

export function useFileUpload(
  canvasWidth: number,
  canvasHeight: number,
): UseFileUploadReturn {
  const loadData = useDiagramStore((s) => s.loadData)

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      // ファイル選択をリセット（同じファイルを再選択できるように）
      event.target.value = ''

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = e.target?.result
          if (typeof text !== 'string') return

          const data = JSON.parse(text) as DiagramDataRaw

          // 基本的なバリデーション
          if (!data.lineName || !Array.isArray(data.stations) || !Array.isArray(data.trains)) {
            throw new Error('JSONの形式が正しくありません')
          }

          loadData(data, 'custom', canvasWidth, canvasHeight)
        } catch (err) {
          alert(`ファイルの読み込みエラー: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
      reader.onerror = () => {
        alert('ファイルの読み込みに失敗しました。ファイルが壊れているか、アクセスが拒否されました。')
      }
      reader.readAsText(file)
    },
    [loadData, canvasWidth, canvasHeight],
  )

  return { handleFileChange }
}
