import { computeCoverRect } from '../../preview-engine/canvas-renderer.js';
import { registerEffect } from './effect-registry.js';

const BAND_COUNT = 6;
const INTENSITY_PX = 14;

/**
 * Glitch (scanline slice displacement): the frame is split into horizontal
 * bands, each redrawn with a small independent horizontal offset that
 * varies over the clip's progress.
 * @type {import('./effect-registry.js').EffectRenderer}
 */
function renderGlitch(ctx, frameSource, progress, params) {
  const rect = computeCoverRect(ctx.canvas, frameSource);
  const intensity = params.intensity || INTENSITY_PX;
  const bandHeight = ctx.canvas.height / BAND_COUNT;

  for (let band = 0; band < BAND_COUNT; band++) {
    const shift = Math.sin(progress * 47 + band * 13) * intensity;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, band * bandHeight, ctx.canvas.width, bandHeight + 1);
    ctx.clip();
    ctx.drawImage(frameSource, rect.x + shift, rect.y, rect.width, rect.height);
    ctx.restore();
  }
}

registerEffect('glitch', renderGlitch);
