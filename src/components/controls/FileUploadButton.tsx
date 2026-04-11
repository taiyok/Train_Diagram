/**
 * JSONファイルアップロードボタン
 */

import { useRef } from 'react'

interface FileUploadButtonProps {
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
}

export function FileUploadButton({ onChange }: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={onChange}
        aria-label="JSONファイルを読み込む"
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-bold transition-all duration-200 active:scale-95 shrink-0"
        style={{
          minHeight: 44,
          backgroundColor: '#FEF3C7',
          color: '#92400E',
          fontFamily: '"M PLUS Rounded 1c", "Noto Sans JP", sans-serif',
        }}
        aria-label="自分のJSONファイルを読み込む"
      >
        <span>📂</span>
        <span className="hidden sm:inline">よみこむ</span>
      </button>
    </>
  )
}
