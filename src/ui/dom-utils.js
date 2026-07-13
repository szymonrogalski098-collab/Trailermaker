/**
 * Small helper for building DOM trees without repeating
 * createElement/className/appendChild boilerplate in every view.
 *
 * @param {string} tag
 * @param {Object} [options]
 * @param {string} [options.className]
 * @param {Object<string, string>} [options.attrs] - arbitrary attributes (id, type, href, ...)
 * @param {string} [options.text] - textContent
 * @param {(Node|string)[]} [options.children]
 * @returns {HTMLElement}
 */
export function createElement(tag, options = {}) {
  const { className, attrs, text, children } = options;
  const el = document.createElement(tag);

  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value === false || value === undefined || value === null) continue;
      if (value === true) {
        el.setAttribute(key, '');
      } else {
        el.setAttribute(key, String(value));
      }
    }
  }
  if (children) {
    for (const child of children) {
      el.append(child instanceof Node ? child : document.createTextNode(child));
    }
  }

  return el;
}

/**
 * Removes every child node from an element.
 * @param {HTMLElement} el
 */
export function clearElement(el) {
  el.replaceChildren();
}
