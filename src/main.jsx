// Polyfill requestIdleCallback — Safari (iOS/macOS) no la implementa
if (typeof window !== 'undefined' && !window.requestIdleCallback) {
  window.requestIdleCallback = function(cb, options) {
    var start = Date.now();
    return setTimeout(function() {
      cb({
        didTimeout: false,
        timeRemaining: function() { return Math.max(0, 50 - (Date.now() - start)); }
      });
    }, (options && options.timeout) ? Math.min(options.timeout, 1) : 1);
  };
  window.cancelIdleCallback = function(id) { clearTimeout(id); };
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from '@/App.jsx'

// Self-host Inter (sustituye a Google Fonts; un solo round-trip, woff2 cacheado).
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'

// Preload de los woff2 (anti-CLS): que el navegador empiece a descargarlos en
// cuanto pueda, en paralelo a parsear el CSS, para que el swap ocurra antes
// del LCP. Combinado con la `Inter Fallback` size-adjust del index.html, el
// shift se aproxima a 0.
import inter400 from '@fontsource/inter/files/inter-latin-400-normal.woff2?url'
import inter600 from '@fontsource/inter/files/inter-latin-600-normal.woff2?url'
import inter700 from '@fontsource/inter/files/inter-latin-700-normal.woff2?url'

if (typeof document !== 'undefined') {
  ;[inter400, inter600, inter700].forEach((href) => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'font'
    link.type = 'font/woff2'
    link.crossOrigin = 'anonymous'
    link.href = href
    document.head.appendChild(link)
  })
}

import './globals.css'
import '@/index.css'

import './i18n';

// Capacitor: en nativo, inicia el listener de deep-links y persiste la sesión
// de Supabase con @capacitor/preferences. En web es no-op.
import { initDeepLinkAuth } from '@/lib/deepLinkAuth';
initDeepLinkAuth();

// ── Dark mode: sync with system preference ──────────────────────────────────
const applyColorScheme = (dark) => {
  document.documentElement.classList.toggle('dark', dark);
};
const mq = window.matchMedia('(prefers-color-scheme: dark)');
applyColorScheme(mq.matches);
mq.addEventListener('change', e => applyColorScheme(e.matches));

// Registrar Service Worker diferido (no bloquea renderizado).
// `updateViaCache: 'none'` evita que el navegador cachee el propio sw.js, así
// el SW nuevo se detecta en cada carga y no quedamos atascados en uno antiguo.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        // Forzar comprobación de actualización en cada arranque.
        reg.update().catch(() => {});
      })
      .catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
  <HelmetProvider>
    <App />
  </HelmetProvider>
  // </React.StrictMode>,
)

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:beforeUpdate' }, '*');
  });
  import.meta.hot.on('vite:afterUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:afterUpdate' }, '*');
  });
}