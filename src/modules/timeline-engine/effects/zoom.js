import { computeCoverRect } from '../../preview-engine/canvas-renderer.js';
import { registerEffect } from './effect-registry.js';

const MAX_SCALE = 1.15;

/**
 * Zoom (Ken Burns style scale-in) driven by clip progress.
 * @type {import('./effect-registry.js').EffectRenderer}
 */
function renderZoom(ctx, frameSource, progress, params) {
  const maxScale = params.maxScale || MAX_SCALE;
  const scale = 1 + (maxScale - 1) * progress;
  const rect = computeCoverRect(ctx.canvas, frameSource);
  const { width: cw, height: ch } = ctx.canvas;

  ctx.save();
  ctx.translate(cw / 2, ch / 2);
  ctx.scale(scale, scale);
  ctx.translate(-cw / 2, -ch / 2);
  ctx.drawImage(frameSource, rect.x, rect.y, rect.width, rect.height);
  ctx.restore();
}

registerEffect('zoom', renderZoom);
