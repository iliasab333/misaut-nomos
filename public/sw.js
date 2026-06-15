// Service Worker para MisAutónomos
// Estrategia:
//  - NUNCA servir un index.html cacheado obsoleto. Las navegaciones (HTML) van
//    en NetworkFirst: el SW intenta la red primero y, solo si falla, cae a la
//    caché. Así, tras un deploy, el index referencia siempre los chunks JS con
//    el hash correcto y se evita el bucle de "Failed to fetch dynamically
//    imported module".
//  - skipWaiting + clientsClaim para que el SW nuevo tome el control sin
//    esperar a que se cierren todas las pestañas.
//  - cleanupOutdatedCaches: en cada activación se borran todas las cachés que
//    no sean la actual.
//  - Para los assets JS/CSS con hash y para el resto de recursos NO se cachea
//    nada: dejamos que el navegador use sus propias cabeceras HTTP (las que
//    sirve Vercel: immutable para /assets/*).

const SW_VERSION = 'v3-2026-06-13';
const HTML_CACHE = `misautonomos-html-${SW_VERSION}`;
const ALLOWED_CACHES = new Set([HTML_CACHE]);

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // cleanupOutdatedCaches: borrar todas las cachés que ya no pertenezcan a
    // esta versión del SW.
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => !ALLOWED_CACHES.has(k)).map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Solo interceptamos peticiones del propio origen.
  let url;
  try { url = new URL(req.url); } catch (_e) { return; }
  if (url.origin !== self.location.origin) return;

  // NetworkFirst para navegaciones (app shell / index.html).
  const acceptsHtml = (req.headers.get('accept') || '').includes('text/html');
  const isNavigation = req.mode === 'navigate' || req.destination === 'document' || acceptsHtml;

  if (!isNavigation) {
    // No tocar assets con hash: el navegador ya los cachea agresivamente con
    // las cabeceras de Vercel (immutable). Cualquier intercepción aquí solo
    // podría servir versiones obsoletas y provocar el bug que estamos
    // arreglando.
    return;
  }

  event.respondWith((async () => {
    try {
      const network = await fetch(req);
      // Solo guardamos respuestas válidas (HTTP 200 OK) en la caché.
      if (network && network.ok && network.type === 'basic') {
        const cache = await caches.open(HTML_CACHE);
        cache.put(req, network.clone()).catch(() => {});
      }
      return network;
    } catch (_err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      // Último recurso: el index cacheado del root.
      const fallback = await caches.match('/');
      if (fallback) return fallback;
      throw _err;
    }
  })());
});

// Permitir que la app le diga al SW que pase a activo sin esperar.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Recibir push notification
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || '',
      icon: '/logo-192.png',
      badge: '/logo-192.png',
      tag: data.tag || 'default',
      data: {
        url: data.url || '/',
        messageId: data.messageId
      },
      vibrate: [200, 100, 200],
      requireInteraction: false
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'MisAutónomos', options)
    );
  } catch (err) {
    console.error('Error procesando push:', err);
  }
});

// Click en notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
