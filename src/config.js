/**
 * App-wide constants. Centralized here so no module hardcodes magic
 * numbers/strings for project constraints.
 */

export const MAX_DURATION_SECONDS = 20;
export const ASPECT_RATIO = '9:16';
export const DEFAULT_RESOLUTION = '1080x1920';
export const DEFAULT_FPS = 60;
export const DEFAULT_TEMPLATE_ID = 'crazygames_default';

export const EFFECT_TYPES = /** @type {const} */ (['fade', 'zoom', 'glitch', 'pan']);
export const MEDIA_TYPES = /** @type {const} */ (['video', 'image', 'logo']);
