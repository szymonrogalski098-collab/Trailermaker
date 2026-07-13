/**
 * @typedef {(ctx: CanvasRenderingContext2D, frameSource: HTMLVideoElement|HTMLImageElement, progress: number, params: Object) => void} EffectRenderer
 * progress is a 0..1 value representing how far through the effect's active window playback currently is.
 */

/** @type {Map<string, EffectRenderer>} */
const registry = new Map();

/**
 * Registers a renderer for an effect type. Called once per effect module at
 * app init. This is the extensibility point for adding new effects without
 * touching existing effect code (v1.0 requirement).
 * @param {string} type
 * @param {EffectRenderer} renderer
 */
export function registerEffect(type, renderer) {
  registry.set(type, renderer);
}

/**
 * @param {string} type
 * @returns {EffectRenderer|undefined}
 */
export function getEffectRenderer(type) {
  return registry.get(type);
}

/**
 * @returns {string[]} all currently registered effect type names
 */
export function listRegisteredEffects() {
  return [...registry.keys()];
}
