import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

function init() {
  const rootEl = document.getElementById('root');
  if (!rootEl) {
    console.error('Fatal: #root element not found');
    return;
  }
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

// 防御性：确保 DOM 已就绪（兼容 script 在 head 中且无 type=module 的情况）
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
