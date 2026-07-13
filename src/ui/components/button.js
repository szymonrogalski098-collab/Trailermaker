import { createElement } from '../dom-utils.js';

/**
 * Builds a styled <button>. Purely visual — the caller wires up its own
 * click handler (or none yet, in UI-only stages).
 * @param {string} label
 * @param {Object} [options]
 * @param {'primary'|'secondary'|'icon'} [options.variant='secondary']
 * @param {'sm'|'md'} [options.size='md']
 * @param {string} [options.id]
 * @param {boolean} [options.disabled]
 * @param {boolean} [options.block] - full width
 * @returns {HTMLButtonElement}
 */
export function createButton(label, options = {}) {
  const { variant = 'secondary', size = 'md', id, disabled = false, block = false } = options;

  const classNames = ['btn', `btn--${variant}`, `btn--${size}`];
  if (block) classNames.push('btn--block');

  return /** @type {HTMLButtonElement} */ (
    createElement('button', {
      className: classNames.join(' '),
      text: label,
      attrs: { type: 'button', id, disabled },
    })
  );
}
