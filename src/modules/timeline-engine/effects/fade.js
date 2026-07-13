import { NotImplementedError } from '../../../core/errors.js';
import { registerEffect } from './effect-registry.js';

/**
 * Fade in/out effect. Canvas alpha-compositing implementation lands in ETAP 3.
 * @type {import('./effect-registry.js').EffectRenderer}
 */
function renderFade(_ctx, _frameSource, _progress, _params) {
  // TODO(ETAP-3): draw frameSource with alpha derived from progress/params
  throw new NotImplementedError('fade effect rendering is implemented in ETAP 3');
}

registerEffect('fade', renderFade);
