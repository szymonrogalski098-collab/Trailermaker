import { createLogger } from './core/logger.js';
import { openDatabase } from './storage/db.js';
import { EditorView } from './ui/views/editor-view.js';

// Self-registering modules: importing them runs their registerEffect/
// registerTemplate side effects so the registries are populated at boot.
import './modules/timeline-engine/effects/fade.js';
import './modules/timeline-engine/effects/zoom.js';
import './modules/timeline-engine/effects/glitch.js';
import './modules/timeline-engine/effects/pan.js';
import './modules/template-system/templates/crazygames-default.js';

const log = createLogger('App');

/**
 * Registers the offline service worker. No-op if unsupported.
 * @returns {Promise<void>}
 */
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('./service-worker.js', { scope: './' });
    log.info('Service worker registered');
  } catch (error) {
    log.error('Service worker registration failed', error);
  }
}

/**
 * App entry point: initializes storage, registers the service worker, and
 * mounts the root UI view. Real UI rendering lands in ETAP 2.
 */
async function bootstrap() {
  await openDatabase();
  log.info('IndexedDB ready');

  await registerServiceWorker();

  const root = document.getElementById('app');
  new EditorView(root);

  log.info('Trailer Studio bootstrapped (ETAP 1 architecture skeleton)');
}

bootstrap();
