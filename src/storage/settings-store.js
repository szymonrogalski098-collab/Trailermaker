/**
 * Thin wrapper over localStorage for simple app settings (last-opened
 * project id, UI preferences, theme, ...). Project/media data must NOT go
 * through here — that belongs in IndexedDB (see db.js).
 */

const PREFIX = 'trailerstudio:settings:';

/**
 * @param {string} key
 * @param {any} defaultValue
 * @returns {any}
 */
export function getSetting(key, defaultValue = null) {
  const raw = localStorage.getItem(PREFIX + key);
  if (raw === null) return defaultValue;
  try {
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

/**
 * @param {string} key
 * @param {any} value
 */
export function setSetting(key, value) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}

/**
 * @param {string} key
 */
export function removeSetting(key) {
  localStorage.removeItem(PREFIX + key);
}
