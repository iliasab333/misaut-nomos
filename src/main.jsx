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

// Self-host Inter — woff2 cacheado, un solo round-trip.
// IMPORTANTE: NO importamos @fontsource/inter/*.css porque usa
// `font-display: swap`, que provoca reflow visible al cambiar de la fuente
// de sistema (fallback) a Inter. Lo declaramos abajo con `font-display: optional`
// (si Inter no está lista en ~100 ms, el navegador deja la fallback fija
// para esta sesión → CERO swap, CERO reflow). Inter se cachea y aplica en
// visitas posteriores.
import inter400 from '@fontsource/inter/files/inter-latin-400-normal.woff2?url'
import inter500 from '@fontsource/inter/files/inter-latin-500-normal.woff2?url'
import inter600 from '@fontsource/inter/files/inter-latin-600-normal.woff2?url'
import inter700 from '@fontsource/inter/files/inter-latin-700-normal.woff2?url'

if (typeof document !== 'undefined') {
  // 1) Preload de los pesos críticos para que la descarga empiece YA y entre
  //    dentro de la ventana ~100 ms de `font-display: optional`.
  ;[inter400, inter600, inter700].forEach((href) => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'font'
    link.type = 'font/woff2'
    link.crossOrigin = 'anonymous'
    link.href = href
    document.head.appendChild(link)
  })

  // 2) @font-face con font-display: optional — antirreflow real.
  const fontFaceCSS = `
@font-face{font-family:'Inter';font-style:normal;font-display:optional;font-weight:400;src:url(${inter400}) format('woff2')}
@font-face{font-family:'Inter';font-style:normal;font-display:optional;font-weight:500;src:url(${inter500}) format('woff2')}
@font-face{font-family:'Inter';font-style:normal;font-display:optional;font-weight:600;src:url(${inter600}) format('woff2')}
@font-face{font-family:'Inter';font-style:normal;font-display:optional;font-weight:700;src:url(${inter700}) format('woff2')}
`.trim()
  const style = document.createElement('style')
  style.setAttribute('data-inter-override', 'true')
  style.textContent = fontFaceCSS
  document.head.appendChild(style)
}

import './globals.css'
import '@/index.css'

import './i18n';

// Capacitor: en nativo, inicia el listener de deep-links y persiste la sesión
// de Supabase con @capacitor/preferences. En web es no-op.
import { initDeepLinkAuth } from '@/lib/deepLinkAuth';
initDeepLinkAuth();

// Capacitor iOS: StatusBar por defecto en Style.Dark (texto oscuro sobre
// fondo claro) porque la mayor parte de las pantallas usan fondo blanco.
// Las pantallas con hero azul (dashboard) pueden cambiarlo localmente.
import { setStatusBarStyle } from '@/lib/native';
setStatusBarStyle('dark');

// Capacitor: en nativo, registra el dispositivo con APNs/FCM y guarda el
// token en sessionStorage para que el frontend pueda sincronizarlo con
// OneSignal o con tu backend cuando el usuario inicie sesión. En web es no-op.
import { initPushNotifications, isNative } from '@/lib/native';
if (isNative()) {
  // Diferimos un tick para no bloquear el primer paint.
  setTimeout(() => {
    initPushNotifications({
      onToken: (token) => {
        try { sessionStorage.setItem('apns_token', token); } catch (_) { /* noop */ }
      },
      onMessage: (notif) => {
        // Toast nativo opcional — por ahora, log y dejar que iOS muestre la notificación.
        console.log('[push] received:', notif?.title, notif?.body);
      },
    });
  }, 800);
}

// ── Dark mode: sync with system preference ──────────────────────────────────
const applyColorScheme = (dark) => {
  document.documentElement.classList.toggle('dark', dark);
};
const mq = window.matchMedia('(prefers-color-scheme: dark)');
applyColorScheme(mq.matches);
mq.addEventListener('change', e => applyColorScheme(e.matches));

// Microsoft Clarity: heatmaps de clic, scrollmaps y session recordings.
// Gratis para siempre, sin coste por tráfico. Necesita VITE_CLARITY_PROJECT_ID
// en Vercel env. Si falta, no se carga (no rompe nada).
// Se carga DIFERIDO tras el primer paint para no penalizar el LCP.
const CLARITY_PROJECT_ID = import.meta.env.VITE_CLARITY_PROJECT_ID;
if (CLARITY_PROJECT_ID && typeof window !== 'undefined') {
  const loadClarity = () => {
    if (window.clarity) return;
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CLARITY_PROJECT_ID);
  };
  // Tras la primera interacción O 4s tras carga — lo que ocurra primero.
  // Así no entra en el LCP y se asegura registro completo de sesión.
  ['click', 'touchstart', 'scroll', 'keydown'].forEach((e) =>
    window.addEventListener(e, loadClarity, { once: true, passive: true }),
  );
  setTimeout(loadClarity, 4000);
}

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