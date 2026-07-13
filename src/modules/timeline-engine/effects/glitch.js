import { NotImplementedError } from '../../../core/errors.js';
import { registerEffect } from './effect-registry.js';

/**
 * Glitch (RGB shift / slice displacement) effect. Canvas pixel manipulation
 * implementation lands in ETAP 3.
 * @type {import('./effect-registry.js').EffectRenderer}
 */
function renderGlitch(_ctx, _frameSource, _progress, _params) {
  // TODO(ETAP-3): slice-displace drawn image data based on progress/params
  throw new NotImplementedError('glitch effect rendering is implemented in ETAP 3');
}

registerEffect('glitch', renderGlitch);
