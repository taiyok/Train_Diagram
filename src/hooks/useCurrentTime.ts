/**
 * 現在時刻を秒単位で更新するフック
 * ダイヤグラム上の「現在時刻マーカー」に使用する
 */

import { useState, useEffect } from 'react'

/** 現在時刻を「0時からの分数」として返す（1秒ごとに更新） */
export function useCurrentTime(): number {
  const [currentMinutes, setCurrentMinutes] = useState<number>(getNowMinutes())

  useEffect(() => {
    // 1秒ごとに現在時刻を更新
    const interval = setInterval(() => {
      setCurrentMinutes(getNowMinutes())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return currentMinutes
}

/** 現在時刻を「0時からの分数（小数点あり）」で返す */
function getNowMinutes(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60
}
