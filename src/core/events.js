/**
 * Centralized EventBus event-name constants.
 * Import these instead of using magic strings when calling eventBus.on/emit.
 */

export const PROJECT_CHANGED = 'project:changed';
export const PROJECT_LOADED = 'project:loaded';
export const PROJECT_SAVED = 'project:saved';
export const PROJECT_DELETED = 'project:deleted';

export const MEDIA_IMPORTED = 'media:imported';
export const MEDIA_DELETED = 'media:deleted';
export const MEDIA_SELECTED = 'media:selected';

export const TIMELINE_UPDATED = 'timeline:updated';

export const TEMPLATE_APPLIED = 'template:applied';

export const PREVIEW_PLAYING = 'preview:playing';
export const PREVIEW_PAUSED = 'preview:paused';
export const PREVIEW_SEEKED = 'preview:seeked';
export const PREVIEW_TICK = 'preview:tick';

export const EXPORT_PROGRESS = 'export:progress';
export const EXPORT_COMPLETE = 'export:complete';
export const EXPORT_FAILED = 'export:failed';

export const SCENARIO_IMPORTED = 'scenario:imported';

export const HISTORY_CHANGED = 'history:changed';
