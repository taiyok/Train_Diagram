/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // GitHub Pages プロジェクトサイト用のベースパス
  // ローカル開発時は VITE_BASE 環境変数を設定していなければ './' を使用
  base: process.env.VITE_BASE ?? '/Train_Diagram/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  test: {
    environment: 'node',
    globals: true,
  },
})
