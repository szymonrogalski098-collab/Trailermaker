import { NotImplementedError } from '../../core/errors.js';
import { PlaybackClock } from './playback-clock.js';

/** @type {HTMLCanvasElement|null} */
let boundCanvas = null;

const clock = new PlaybackClock();

/**
 * Binds the engine to a canvas element. Real Canvas setup (sizing per
 * project resolution/aspect ratio) lands in ETAP 3.
 * @param {HTMLCanvasElement} canvas
 */
export function attach(canvas) {
  boundCanvas = canvas;
}

/**
 * Starts rAF-driven playback from the current time. Frame rendering
 * (Canvas + effects) lands in ETAP 3.
 */
export function play() {
  throw new NotImplementedError('PreviewEngine.play is implemented in ETAP 3');
}

/**
 * Pauses playback.
 */
export function pause() {
  throw new NotImplementedError('PreviewEngine.pause is implemented in ETAP 3');
}

/**
 * Seeks the playhead and redraws the current frame.
 * @param {number} _seconds
 */
export function seek(_seconds) {
  throw new NotImplementedError('PreviewEngine.seek is implemented in ETAP 3');
}

/**
 * @returns {number} current playhead position in seconds
 */
export function getCurrentTime() {
  return clock.currentTime;
}
