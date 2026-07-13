import { ASPECT_RATIO, EFFECT_TYPES, MAX_DURATION_SECONDS } from '../../config.js';

const REQUIRED_PROJECT_FIELDS = ['title', 'duration', 'aspectRatio', 'resolution', 'fps'];
const REQUIRED_SCENE_FIELDS = ['start', 'end', 'media', 'text', 'transition', 'effect'];
const REQUIRED_OUTRO_FIELDS = ['duration', 'gameLogo', 'studioLogo'];

/**
 * Structural validation of a raw parsed-JSON value against the fixed AI
 * scenario schema (see docs/architecture.md for the canonical shape).
 * @param {unknown} raw
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateScenarioShape(raw) {
  const errors = [];

  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Scenario must be an object'] };
  }

  if (raw.version !== 1) errors.push('Scenario.version must be 1');

  if (!raw.project || typeof raw.project !== 'object') {
    errors.push('Scenario.project is required');
  } else {
    for (const field of REQUIRED_PROJECT_FIELDS) {
      if (raw.project[field] === undefined) errors.push(`Scenario.project.${field} is required`);
    }
    if (typeof raw.project.duration === 'number' && raw.project.duration > MAX_DURATION_SECONDS) {
      errors.push(`Scenario.project.duration must not exceed ${MAX_DURATION_SECONDS}s`);
    }
    if (raw.project.aspectRatio !== undefined && raw.project.aspectRatio !== ASPECT_RATIO) {
      errors.push(`Scenario.project.aspectRatio must be ${ASPECT_RATIO}`);
    }
  }

  if (typeof raw.template !== 'string' || !raw.template) {
    errors.push('Scenario.template is required');
  }

  if (!Array.isArray(raw.scenes) || raw.scenes.length === 0) {
    errors.push('Scenario.scenes must be a non-empty array');
  } else {
    raw.scenes.forEach((scene, index) => {
      for (const field of REQUIRED_SCENE_FIELDS) {
        if (scene[field] === undefined) errors.push(`Scenario.scenes[${index}].${field} is required`);
      }
      if (scene.effect && !EFFECT_TYPES.includes(scene.effect)) {
        errors.push(`Scenario.scenes[${index}].effect "${scene.effect}" is not a recognized effect type`);
      }
      if (typeof scene.start === 'number' && typeof scene.end === 'number' && scene.end <= scene.start) {
        errors.push(`Scenario.scenes[${index}].end must be greater than start`);
      }
    });
  }

  if (!raw.outro || typeof raw.outro !== 'object') {
    errors.push('Scenario.outro is required');
  } else {
    for (const field of REQUIRED_OUTRO_FIELDS) {
      if (raw.outro[field] === undefined) errors.push(`Scenario.outro.${field} is required`);
    }
  }

  return { valid: errors.length === 0, errors };
}
