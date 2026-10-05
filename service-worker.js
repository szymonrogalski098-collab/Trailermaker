// Offline-first service worker: precaches the app shell and the pinned Three.js build.
const VERSION = 'rs-v1';
const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const SHELL = [
  './', 'index.html', 'style.css', 'manifest.json', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  'src/app.js', 'src/blocks.js', 'src/world.js', 'src/power.js', 'src/behaviors.js', 'src/piston.js', 'src/engine.js',
  'src/editor.js', 'src/storage.js', 'src/i18n.js', 'src/icons.js', 'src/models.js', 'src/gestures.js',
  'src/layer2d.js', 'src/view3d.js', 'src/ui.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(SHELL);
    try { await cache.add(new Request(THREE_URL, { mode: 'cors' })); } catch (err) { /* 3D stays optional offline */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== VERSION) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith((async () => {
    const cached = await caches.match(event.request, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const res = await fetch(event.request);
      if (res.ok && (new URL(event.request.url).origin === location.origin || event.request.url === THREE_URL)) {
        (await caches.open(VERSION)).put(event.request, res.clone());
      }
      return res;
    } catch (err) {
      if (event.request.mode === 'navigate') return caches.match('index.html');
      throw err;
    }
  })());
});
