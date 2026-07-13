import { NotImplementedError } from '../../core/errors.js';

/**
 * Low-level Canvas 2D draw primitives shared by preview playback and (via
 * frame-stepping) MP4 export, so rendering logic is written once.
 * Real drawing implementation lands in ETAP 3.
 */

/**
 * Sizes a canvas to the project's aspect ratio/resolution.
 * @param {HTMLCanvasElement} _canvas
 * @param {string} _resolution - e.g. "1080x1920"
 */
export function setupCanvas(_canvas, _resolution) {
  throw new NotImplementedError('setupCanvas is implemented in ETAP 3');
}

/**
 * Draws a video/image frame source into the canvas, respecting
 * aspect-ratio cropping, and applies the active effect (if any) via the
 * effect registry.
 * @param {CanvasRenderingContext2D} _ctx
 * @param {HTMLVideoElement|HTMLImageElement} _frameSource
 * @param {import('../../core/types.js').EffectInstance[]} _effects
 * @param {number} _progress
 */
export function drawFrame(_ctx, _frameSource, _effects, _progress) {
  throw new NotImplementedError('drawFrame is implemented in ETAP 3');
}

/**
 * Draws a text overlay onto the canvas.
 * @param {CanvasRenderingContext2D} _ctx
 * @param {import('../../core/types.js').TextOverlay} _overlay
 */
export function drawTextOverlay(_ctx, _overlay) {
  throw new NotImplementedError('drawTextOverlay is implemented in ETAP 3');
}

/**
 * Composites the game logo and studio logo outro frame.
 * @param {CanvasRenderingContext2D} _ctx
 * @param {import('../../core/types.js').Outro} _outro
 */
export function drawOutro(_ctx, _outro) {
  throw new NotImplementedError('drawOutro is implemented in ETAP 3');
}
