import { eventBus } from '../../core/event-bus.js';
import { PROJECT_CHANGED, PROJECT_SAVED, TIMELINE_UPDATED } from '../../core/events.js';
import { createLogger } from '../../core/logger.js';
import { getSetting, setSetting } from '../../storage/settings-store.js';
import { getActiveProject, saveProject } from './project-manager.js';

/**
 * Debounced autosave for the active project: saves ~1.5s after the last
 * edit (not on every single change, to avoid hammering IndexedDB) and
 * remembers which project was last active, so app.js can resume it on the
 * next load instead of always starting from a blank project.
 */

const log = createLogger('Autosave');
const DEBOUNCE_MS = 1500;
const LAST_ACTIVE_PROJECT_ID_KEY = 'lastActiveProjectId';

/** @type {ReturnType<typeof setTimeout>|null} */
let debounceTimer = null;

function scheduleSave() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    debounceTimer = null;
    const project = getActiveProject();
    if (!project) return;
    try {
      await saveProject(project);
    } catch (error) {
      log.error('Autosave failed', error);
    }
  }, DEBOUNCE_MS);
}

eventBus.on(TIMELINE_UPDATED, scheduleSave);
eventBus.on(PROJECT_CHANGED, scheduleSave);

// Any save — autosave or the manual "Save project" button — updates which
// project should be resumed on next load.
eventBus.on(PROJECT_SAVED, (project) => {
  if (project?.id) setSetting(LAST_ACTIVE_PROJECT_ID_KEY, project.id);
});

/**
 * @returns {string|null} the id of the project to resume on startup, if any
 */
export function getLastActiveProjectId() {
  return getSetting(LAST_ACTIVE_PROJECT_ID_KEY, null);
}
