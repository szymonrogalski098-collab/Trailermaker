import { createLogger } from './core/logger.js';
import { openDatabase } from './storage/db.js';
import { createProject, setActiveProject } from './modules/project-manager/project-manager.js';
import { EditorView } from './ui/views/editor-view.js';

// Self-registering modules: importing them runs their registerEffect/
// registerTemplate side effects (or, for history-manager, subscribes it to
// the EventBus) so they're active before bootstrap() runs.
import './modules/timeline-engine/effects/fade.js';
import './modules/timeline-engine/effects/zoom.js';
import './modules/timeline-engine/effects/glitch.js';
import './modules/timeline-engine/effects/pan.js';
import './modules/template-system/templates/crazygames-default.js';
import './modules/history-manager/history-manager.js';

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
 * App entry point: initializes storage, registers the service worker,
 * ensures a working project is active, and mounts the root UI view.
 */
async function bootstrap() {
  await openDatabase();
  log.info('IndexedDB ready');

  await registerServiceWorker();

  setActiveProject(createProject());

  const root = document.getElementById('app');
  new EditorView(root);

  log.info('Trailer Studio bootstrapped');
}

bootstrap();
