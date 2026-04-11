/**
 * ビューポートカリング — 表示範囲外の列車をスキップして描画コストを削減する
 */

import type { Train, ViewportState, FilterState } from '../types/diagram'
import { getVisibleMinuteRange } from './coordinateUtils'

/**
 * 現在のビューポートに表示すべき列車リストを返す。
 * - フィルター状態で非表示の種別を除外
 * - 表示時刻範囲外の列車を除外
 */
export function getVisibleTrains(
  trains: Train[],
  viewport: ViewportState,
  filterState: FilterState,
): Train[] {
  const { minMinutes, maxMinutes } = getVisibleMinuteRange(viewport)
  const result: Train[] = []

  for (const train of trains) {
    // フィルターで非表示の種別をスキップ
    if (filterState[train.type.id] === false) continue

    // 時刻範囲でカリング（列車の運行時刻がビューポートと重ならない場合はスキップ）
    if (train.endMinutes < minMinutes) continue
    if (train.startMinutes > maxMinutes) continue

    result.push(train)
  }

  return result
}
