/* Magia do Tarot — service worker: deixa instalar como aplicativo e abre rápido.
   Páginas: sempre busca a versão nova (só usa a guardada sem internet).
   A API do Cigano nunca é guardada. */
const CACHE = 'magia-do-tarot-v1';
const BASE = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/image/cigano-avatar.webp'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE)).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put('/', copia)); return r; }).catch(() => caches.match('/')));
    return;
  }
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/image/') || url.pathname.startsWith('/icons/')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok) { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); } return r; })));
  }
});
