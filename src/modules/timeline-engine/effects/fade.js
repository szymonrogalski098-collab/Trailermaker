import { computeCoverRect } from '../../preview-engine/canvas-renderer.js';
import { registerEffect } from './effect-registry.js';

const RAMP = 0.2;

/**
 * Fade in/out: full opacity in the middle, ramping to 0 over the first and
 * last RAMP fraction of the clip's active window.
 * @type {import('./effect-registry.js').EffectRenderer}
 */
function renderFade(ctx, frameSource, progress) {
  const fadeIn = Math.min(progress / RAMP, 1);
  const fadeOut = Math.min((1 - progress) / RAMP, 1);
  const alpha = Math.max(0, Math.min(fadeIn, fadeOut));

  const rect = computeCoverRect(ctx.canvas, frameSource);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(frameSource, rect.x, rect.y, rect.width, rect.height);
  ctx.restore();
}

registerEffect('fade', renderFade);
