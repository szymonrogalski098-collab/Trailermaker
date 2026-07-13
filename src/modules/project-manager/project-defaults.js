import {
  ASPECT_RATIO,
  DEFAULT_FPS,
  DEFAULT_RESOLUTION,
  DEFAULT_TEMPLATE_ID,
  MAX_DURATION_SECONDS,
} from '../../config.js';

/**
 * Builds a fresh Project with sensible defaults, overridable per field.
 * @param {Partial<import('../../core/types.js').Project>} [overrides]
 * @returns {import('../../core/types.js').Project}
 */
export function createDefaultProject(overrides = {}) {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: 'Untitled trailer',
    duration: MAX_DURATION_SECONDS,
    aspectRatio: ASPECT_RATIO,
    resolution: DEFAULT_RESOLUTION,
    fps: DEFAULT_FPS,
    templateId: DEFAULT_TEMPLATE_ID,
    clips: [],
    outro: { duration: 2, gameLogo: true, studioLogo: true },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Validates a Project against MVP constraints (duration cap, fixed aspect
 * ratio, required fields). Returns a list of human-readable errors.
 * @param {import('../../core/types.js').Project} project
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateProjectShape(project) {
  const errors = [];

  if (!project || typeof project !== 'object') {
    return { valid: false, errors: ['Project must be an object'] };
  }
  if (!project.id) errors.push('Project.id is required');
  if (!project.title) errors.push('Project.title is required');
  if (typeof project.duration !== 'number' || project.duration <= 0) {
    errors.push('Project.duration must be a positive number');
  } else if (project.duration > MAX_DURATION_SECONDS) {
    errors.push(`Project.duration must not exceed ${MAX_DURATION_SECONDS}s`);
  }
  if (project.aspectRatio !== ASPECT_RATIO) {
    errors.push(`Project.aspectRatio must be ${ASPECT_RATIO}`);
  }
  if (!Array.isArray(project.clips)) errors.push('Project.clips must be an array');

  return { valid: errors.length === 0, errors };
}
