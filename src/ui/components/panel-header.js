import { createElement } from '../dom-utils.js';

/**
 * Builds a standard panel section heading.
 * @param {string} titleText
 * @returns {HTMLHeadingElement}
 */
export function createPanelHeader(titleText) {
  return /** @type {HTMLHeadingElement} */ (createElement('h2', { className: 'panel-header', text: titleText }));
}
