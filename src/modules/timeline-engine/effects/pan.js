import { NotImplementedError } from '../../../core/errors.js';
import { registerEffect } from './effect-registry.js';

/**
 * Pan/shift (przesunięcie) effect. Canvas translate implementation lands
 * in ETAP 3.
 * @type {import('./effect-registry.js').EffectRenderer}
 */
function renderPan(_ctx, _frameSource, _progress, _params) {
  // TODO(ETAP-3): apply a translate transform interpolated by progress/params
  throw new NotImplementedError('pan effect rendering is implemented in ETAP 3');
}

registerEffect('pan', renderPan);
