import { eventBus } from '../../core/event-bus.js';
import { SCENARIO_IMPORTED } from '../../core/events.js';
import { SchemaError } from '../../core/errors.js';
import { createClip } from '../timeline-engine/clip.js';
import { createProject, setActiveProject } from '../project-manager/project-manager.js';
import { validateScenarioShape } from './scenario-schema.js';

/**
 * Validates a raw parsed-JSON value against the fixed AI scenario schema.
 * @param {unknown} raw
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateScenario(raw) {
  return validateScenarioShape(raw);
}

/**
 * Converts a validated Scenario into a Project. Pure function — does not
 * touch storage or the active project.
 *
 * `scene.media` is just a filename/identifier the AI referenced, not an
 * actual imported Blob, so the resulting clip's mediaId is left as that raw
 * string as an unresolved placeholder; matching it to a real imported
 * MediaAsset is a media-library concern handled in ETAP 2/3.
 *
 * @param {import('../../core/types.js').Scenario} scenario
 * @returns {import('../../core/types.js').Project}
 */
export function scenarioToProject(scenario) {
  const clips = scenario.scenes.map((scene, index) =>
    createClip(scene.media, scene.start, scene.end, {
      order: index,
      transition: scene.transition,
      effects: scene.effect ? [{ type: scene.effect, params: {} }] : [],
      textOverlays: scene.text
        ? [{ id: crypto.randomUUID(), text: scene.text, start: 0, end: scene.end - scene.start }]
        : [],
    })
  );

  return createProject({
    title: scenario.project.title,
    duration: scenario.project.duration,
    aspectRatio: scenario.project.aspectRatio,
    resolution: scenario.project.resolution,
    fps: scenario.project.fps,
    templateId: scenario.template,
    clips,
    outro: { ...scenario.outro },
  });
}

/**
 * Parses, validates, and imports a scenario JSON string as the active
 * project.
 * @param {string} jsonText
 * @returns {Promise<import('../../core/types.js').Project>}
 */
export async function importScenarioJson(jsonText) {
  let raw;
  try {
    raw = JSON.parse(jsonText);
  } catch (cause) {
    throw new SchemaError('Scenario JSON is not valid JSON', [String(cause)]);
  }

  const { valid, errors } = validateScenarioShape(raw);
  if (!valid) throw new SchemaError('Scenario JSON does not match the expected schema', errors);

  const project = scenarioToProject(raw);
  setActiveProject(project);
  eventBus.emit(SCENARIO_IMPORTED, project);
  return project;
}
