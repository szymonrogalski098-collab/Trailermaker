import { eventBus } from '../../core/event-bus.js';
import { TEMPLATE_APPLIED } from '../../core/events.js';
import { ValidationError } from '../../core/errors.js';
import { createClip } from '../timeline-engine/clip.js';
import { validateTemplateShape } from './template-schema.js';

/** @type {Map<string, import('../../core/types.js').Template>} */
const registry = new Map();

/**
 * Registers a template into the in-memory registry. Called for built-in
 * templates at app init; also the extensibility hook for a future custom
 * template editor (v0.5) since it works at runtime, not just load time.
 * @param {import('../../core/types.js').Template} template
 */
export function registerTemplate(template) {
  const { valid, errors } = validateTemplateShape(template);
  if (!valid) throw new ValidationError('Cannot register invalid template', errors);
  registry.set(template.id, template);
}

/**
 * @returns {import('../../core/types.js').Template[]}
 */
export function listTemplates() {
  return [...registry.values()];
}

/**
 * @param {string} id
 * @returns {import('../../core/types.js').Template|undefined}
 */
export function getTemplate(id) {
  return registry.get(id);
}

/**
 * Returns a new Project (does not mutate the input) with clips and outro
 * seeded from the template's scene blueprint.
 * @param {string} templateId
 * @param {import('../../core/types.js').Project} project
 * @returns {import('../../core/types.js').Project}
 */
export function applyTemplate(templateId, project) {
  const template = getTemplate(templateId);
  if (!template) throw new ValidationError(`No template registered with id ${templateId}`);

  const clips = template.sceneBlueprint.map((scene, index) =>
    createClip('', scene.start, scene.end, {
      order: index,
      transition: scene.transition,
      effects: scene.effect ? [{ type: scene.effect, params: {} }] : [],
      textOverlays: scene.text ? [{ id: crypto.randomUUID(), text: scene.text, start: 0, end: scene.end - scene.start }] : [],
    })
  );

  const updated = {
    ...project,
    templateId: template.id,
    clips,
    outro: { ...template.outro },
    updatedAt: Date.now(),
  };

  eventBus.emit(TEMPLATE_APPLIED, updated);
  return updated;
}
