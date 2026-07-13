/**
 * A small requestAnimationFrame-driven clock. Generic and Canvas-agnostic
 * so it is reusable by both real-time preview playback and (later) offline
 * frame-stepping during export.
 */
export class PlaybackClock {
  constructor() {
    /** @type {number} seconds */
    this.currentTime = 0;
    /** @type {number|null} */
    this._rafId = null;
    /** @type {number|null} */
    this._lastTimestamp = null;
  }

  /**
   * Starts the clock, invoking `onTick(currentTime)` every animation frame.
   * @param {(currentTime: number) => void} onTick
   */
  start(onTick) {
    if (this._rafId !== null) return;
    const step = (timestamp) => {
      if (this._lastTimestamp !== null) {
        this.currentTime += (timestamp - this._lastTimestamp) / 1000;
        onTick(this.currentTime);
      }
      // onTick can call stop() synchronously (e.g. playback reached the
      // end) — if it did, _rafId is now null and this loop must not
      // reschedule itself, or stop() gets silently undone and the clock
      // keeps ticking forever with a "paused" isPlaying state.
      if (this._rafId === null) return;
      this._lastTimestamp = timestamp;
      this._rafId = requestAnimationFrame(step);
    };
    this._rafId = requestAnimationFrame(step);
  }

  /** Stops the clock without resetting currentTime. */
  stop() {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._lastTimestamp = null;
  }

  /**
   * Moves the clock to an explicit position.
   * @param {number} seconds
   */
  seek(seconds) {
    this.currentTime = seconds;
  }
}
