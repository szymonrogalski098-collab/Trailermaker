import { computeCoverRect } from '../../preview-engine/canvas-renderer.js';
import { registerEffect } from './effect-registry.js';

const MAX_OFFSET_RATIO = 0.08;

/**
 * Pan/shift (przesunięcie): slightly oversized frame slides horizontally
 * across the canvas as the clip plays.
 * @type {import('./effect-registry.js').EffectRenderer}
 */
function renderPan(ctx, frameSource, progress, params) {
  const rect = computeCoverRect(ctx.canvas, frameSource);
  const offsetRatio = params.offsetRatio || MAX_OFFSET_RATIO;
  const maxOffset = ctx.canvas.width * offsetRatio;
  const offsetX = maxOffset * (progress * 2 - 1); // sweeps from -max to +max

  // Oversize slightly so the pan never reveals empty canvas at the edges.
  const overscan = 1 + offsetRatio * 2;

  ctx.save();
  ctx.drawImage(
    frameSource,
    rect.x - (rect.width * overscan - rect.width) / 2 + offsetX,
    rect.y - (rect.height * overscan - rect.height) / 2,
    rect.width * overscan,
    rect.height * overscan
  );
  ctx.restore();
}

registerEffect('pan', renderPan);
