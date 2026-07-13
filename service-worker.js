/**
 * Service worker for Trailer Studio.
 *
 * Strategy: cache-first for the static app shell (HTML/JS/CSS/icons), so
 * the app keeps working fully offline once installed. Bump CACHE_NAME on
 * every release to invalidate old caches. Project/media data is never
 * cached here — it lives exclusively in IndexedDB (see src/storage/db.js).
 *
 * All paths below are relative to the service worker's own scope, never
 * assuming a root "/", so this keeps working when deployed to a GitHub
 * Pages subpath (e.g. https://user.github.io/Trailermaker/).
 */

const CACHE_NAME = 'trailer-studio-v5';

/**
 * FFmpeg.wasm core (~30MB) is vendored locally but deliberately NOT
 * precached at install time — most users never export, and forcing that
 * download on every install would be wasteful. It's cached on-demand,
 * cache-first, the first time export actually fetches it (see the fetch
 * handler below), then reused offline from then on.
 */
const FFMPEG_CORE_PREFIX = './src/vendor/ffmpeg/core/';

// Hand-maintained app-shell manifest (no bundler in ETAP 1). TODO: generate
// this automatically once a build step exists.
const APP_SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './src/app.js',
  './src/config.js',
  './src/core/errors.js',
  './src/core/event-bus.js',
  './src/core/events.js',
  './src/core/logger.js',
  './src/core/types.js',
  './src/storage/db.js',
  './src/storage/media-store.js',
  './src/storage/projects-store.js',
  './src/storage/settings-store.js',
  './src/modules/export-engine/export-engine.js',
  './src/modules/history-manager/history-manager.js',
  './src/vendor/ffmpeg/lib/classes.js',
  './src/vendor/ffmpeg/lib/const.js',
  './src/vendor/ffmpeg/lib/errors.js',
  './src/vendor/ffmpeg/lib/index.js',
  './src/vendor/ffmpeg/lib/types.js',
  './src/vendor/ffmpeg/lib/utils.js',
  './src/vendor/ffmpeg/lib/worker.js',
  './src/modules/json-parser/scenario-parser.js',
  './src/modules/json-parser/scenario-schema.js',
  './src/modules/media-manager/media-manager.js',
  './src/modules/media-manager/media-utils.js',
  './src/modules/preview-engine/canvas-renderer.js',
  './src/modules/preview-engine/playback-clock.js',
  './src/modules/preview-engine/preview-engine.js',
  './src/modules/project-manager/project-defaults.js',
  './src/modules/project-manager/project-manager.js',
  './src/modules/template-system/template-manager.js',
  './src/modules/template-system/template-schema.js',
  './src/modules/template-system/templates/crazygames-default.js',
  './src/modules/timeline-engine/clip.js',
  './src/modules/timeline-engine/timeline-engine.js',
  './src/modules/timeline-engine/effects/effect-registry.js',
  './src/modules/timeline-engine/effects/fade.js',
  './src/modules/timeline-engine/effects/zoom.js',
  './src/modules/timeline-engine/effects/glitch.js',
  './src/modules/timeline-engine/effects/pan.js',
  './src/ui/dom-utils.js',
  './src/ui/components/button.js',
  './src/ui/components/panel-header.js',
  './src/ui/views/editor-view.js',
  './src/ui/views/timeline-view.js',
  './src/ui/views/media-library-view.js',
  './src/ui/views/export-view.js',
  './src/ui/views/settings-panel-view.js',
  './src/ui/views/templates-panel-view.js',
  './src/styles/base.css',
  './src/styles/layout.css',
  './src/styles/components.css',
  './src/styles/sidebar-panels.css',
  './src/styles/timeline.css',
  './src/styles/preview.css',
  './src/styles/export.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isFfmpegCore = url.pathname.includes(FFMPEG_CORE_PREFIX.replace('./', '/'));

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          // Cache the (large) ffmpeg core/wasm the first time export fetches
          // it, so subsequent exports work fully offline too.
          if (isFfmpegCore && response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          if (request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return undefined;
        });
    })
  );
});
