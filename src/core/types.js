/**
 * Shared JSDoc type definitions used across Trailer Studio.
 * This file exports no runtime values — it exists purely so other modules
 * can reference these types via:
 *   @param {import('../../core/types.js').Project} project
 *
 * Keeping typedefs here (instead of duplicating shapes per module) is the
 * single source of truth for every data shape in the app.
 */

/**
 * @typedef {Object} Project
 * @property {string} id - UUID
 * @property {string} title
 * @property {number} duration - seconds, max MAX_DURATION_SECONDS (see config.js)
 * @property {'9:16'} aspectRatio
 * @property {string} resolution - e.g. "1080x1920"
 * @property {number} fps
 * @property {string} templateId
 * @property {Clip[]} clips
 * @property {Outro} outro
 * @property {number} createdAt - epoch ms
 * @property {number} updatedAt - epoch ms
 */

/**
 * @typedef {Object} MediaAsset
 * @property {string} id - UUID
 * @property {'video'|'image'|'logo'} type
 * @property {string} name
 * @property {string} mimeType
 * @property {number} size - bytes
 * @property {Blob} blob - actual binary data
 * @property {number} [duration] - seconds, only present for video assets
 * @property {{width: number, height: number}} [dimensions]
 * @property {number} createdAt - epoch ms
 */

/**
 * @typedef {Object} Clip
 * @property {string} id - UUID
 * @property {string} mediaId - references MediaAsset.id
 * @property {number} start - seconds, position on the timeline
 * @property {number} end - seconds, position on the timeline
 * @property {number} order - track position index (single track in MVP)
 * @property {TextOverlay[]} textOverlays
 * @property {EffectInstance[]} effects
 * @property {string} [transition] - transition into this clip, e.g. "glitch"
 */

/**
 * @typedef {Object} TextOverlay
 * @property {string} id - UUID
 * @property {string} text
 * @property {number} start - seconds, relative to clip start
 * @property {number} end - seconds, relative to clip start
 */

/**
 * @typedef {Object} EffectInstance
 * @property {'fade'|'zoom'|'glitch'|'pan'} type
 * @property {Object} params - effect-specific parameters
 */

/**
 * @typedef {Object} Outro
 * @property {number} duration - seconds
 * @property {boolean} gameLogo
 * @property {boolean} studioLogo
 * @property {string} [gameLogoMediaId] - references MediaAsset.id
 * @property {string} [studioLogoMediaId] - references MediaAsset.id
 */

/**
 * @typedef {Object} Template
 * @property {string} id
 * @property {string} name
 * @property {Scene[]} sceneBlueprint - default scene/effect sequence
 * @property {Outro} outro
 */

/**
 * @typedef {Object} Scene
 * @property {number} start - seconds
 * @property {number} end - seconds
 * @property {string} media - media reference (filename/identifier from AI scenario)
 * @property {string} text
 * @property {string} transition
 * @property {string} effect
 */

/**
 * @typedef {Object} Scenario
 * @property {number} version
 * @property {{title: string, duration: number, aspectRatio: string, resolution: string, fps: number}} project
 * @property {string} template
 * @property {Scene[]} scenes
 * @property {{duration: number, gameLogo: boolean, studioLogo: boolean}} outro
 */

export {};
