import { NotImplementedError } from '../../../core/errors.js';
import { registerEffect } from './effect-registry.js';

/**
 * Zoom (Ken Burns style scale) effect. Canvas transform implementation
 * lands in ETAP 3.
 * @type {import('./effect-registry.js').EffectRenderer}
 */
function renderZoom(_ctx, _frameSource, _progress, _params) {
  // TODO(ETAP-3): apply a scale transform interpolated by progress/params
  throw new NotImplementedError('zoom effect rendering is implemented in ETAP 3');
}

registerEffect('zoom', renderZoom);
