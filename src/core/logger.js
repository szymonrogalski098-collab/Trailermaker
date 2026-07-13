/**
 * Small namespaced logging wrapper around console.*.
 * Centralizing this makes it trivial to silence logs in production later
 * without touching every module.
 */

const ENABLED = true;

/**
 * Creates a namespaced logger, e.g. `const log = createLogger('MediaManager')`.
 * @param {string} namespace
 * @returns {{info: Function, warn: Function, error: Function, debug: Function}}
 */
export function createLogger(namespace) {
  const prefix = `[${namespace}]`;
  return {
    info: (...args) => ENABLED && console.info(prefix, ...args),
    warn: (...args) => ENABLED && console.warn(prefix, ...args),
    error: (...args) => console.error(prefix, ...args),
    debug: (...args) => ENABLED && console.debug(prefix, ...args),
  };
}
