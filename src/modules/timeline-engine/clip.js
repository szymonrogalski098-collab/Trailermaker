/**
 * Builds a new Clip anchored to a media asset.
 * @param {string} mediaId
 * @param {number} start
 * @param {number} end
 * @param {Partial<import('../../core/types.js').Clip>} [overrides]
 * @returns {import('../../core/types.js').Clip}
 */
export function createClip(mediaId, start, end, overrides = {}) {
  return {
    id: crypto.randomUUID(),
    mediaId,
    start,
    end,
    order: 0,
    textOverlays: [],
    effects: [],
    ...overrides,
  };
}
