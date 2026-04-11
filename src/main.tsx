import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// アプリのエントリーポイント
const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('ルート要素が見つかりません')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
