import { eventBus } from '../../core/event-bus.js';
import { TIMELINE_UPDATED } from '../../core/events.js';
import { ValidationError } from '../../core/errors.js';
import { getActiveProject } from '../project-manager/project-manager.js';
import { createClip } from './clip.js';

/**
 * @returns {import('../../core/types.js').Project}
 */
function requireActiveProject() {
  const project = getActiveProject();
  if (!project) throw new ValidationError('No active project — call ProjectManager.setActiveProject first');
  return project;
}

/**
 * @param {import('../../core/types.js').Project} project
 * @param {string} clipId
 * @returns {import('../../core/types.js').Clip}
 */
function requireClip(project, clipId) {
  const clip = project.clips.find((c) => c.id === clipId);
  if (!clip) throw new ValidationError(`No clip found with id ${clipId}`);
  return clip;
}

function notifyUpdated() {
  eventBus.emit(TIMELINE_UPDATED, requireActiveProject());
}

/**
 * Appends a new clip referencing a media asset to the active project's
 * single track.
 * @param {string} mediaId
 * @param {number} start
 * @param {number} end
 * @returns {import('../../core/types.js').Clip}
 */
export function addClip(mediaId, start, end) {
  const project = requireActiveProject();
  const clip = createClip(mediaId, start, end, { order: project.clips.length });
  project.clips.push(clip);
  notifyUpdated();
  return clip;
}

/**
 * @param {string} clipId
 */
export function removeClip(clipId) {
  const project = requireActiveProject();
  project.clips = project.clips.filter((c) => c.id !== clipId);
  notifyUpdated();
}

/**
 * @param {string} clipId
 * @param {{start?: number, end?: number}} changes
 */
export function updateClipTiming(clipId, changes) {
  const project = requireActiveProject();
  const clip = requireClip(project, clipId);
  if (changes.start !== undefined) clip.start = changes.start;
  if (changes.end !== undefined) clip.end = changes.end;
  if (clip.end <= clip.start) {
    throw new ValidationError(`Clip ${clipId} end must be greater than start`);
  }
  notifyUpdated();
}

/**
 * Moves a clip to a new position within the single track.
 * @param {string} clipId
 * @param {number} newOrder
 */
export function reorderClip(clipId, newOrder) {
  const project = requireActiveProject();
  const clip = requireClip(project, clipId);
  const others = project.clips.filter((c) => c.id !== clipId).sort((a, b) => a.order - b.order);
  others.splice(newOrder, 0, clip);
  others.forEach((c, index) => {
    c.order = index;
  });
  notifyUpdated();
}

/**
 * @param {string} clipId
 * @param {import('../../core/types.js').EffectInstance} effect
 */
export function addEffect(clipId, effect) {
  const project = requireActiveProject();
  const clip = requireClip(project, clipId);
  clip.effects.push(effect);
  notifyUpdated();
}

/**
 * @param {string} clipId
 * @param {string} effectType
 */
export function removeEffect(clipId, effectType) {
  const project = requireActiveProject();
  const clip = requireClip(project, clipId);
  clip.effects = clip.effects.filter((e) => e.type !== effectType);
  notifyUpdated();
}

/**
 * @param {string} clipId
 * @param {import('../../core/types.js').TextOverlay} overlay
 */
export function addTextOverlay(clipId, overlay) {
  const project = requireActiveProject();
  const clip = requireClip(project, clipId);
  clip.textOverlays.push(overlay);
  notifyUpdated();
}

/**
 * @returns {number} total timeline duration derived from the furthest clip end
 */
export function getTotalDuration() {
  const project = requireActiveProject();
  return project.clips.reduce((max, clip) => Math.max(max, clip.end), 0);
}

/**
 * @returns {import('../../core/types.js').Clip[]} clips ordered by track position
 */
export function getClips() {
  const project = requireActiveProject();
  return [...project.clips].sort((a, b) => a.order - b.order);
}
