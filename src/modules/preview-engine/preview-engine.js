import { DEFAULT_RESOLUTION } from '../../config.js';
import { eventBus } from '../../core/event-bus.js';
import { PREVIEW_PAUSED, PREVIEW_PLAYING, PREVIEW_SEEKED, PREVIEW_TICK } from '../../core/events.js';
import { ValidationError } from '../../core/errors.js';
import { getActiveProject } from '../project-manager/project-manager.js';
import { getClips, getTotalDuration } from '../timeline-engine/timeline-engine.js';
import { getMedia, getObjectURL } from '../media-manager/media-manager.js';
import { drawFrame, drawOutro, drawTextOverlay, setupCanvas } from './canvas-renderer.js';
import { PlaybackClock } from './playback-clock.js';

/** @type {CanvasRenderingContext2D|null} */
let ctx = null;

const clock = new PlaybackClock();
let isPlaying = false;

/**
 * Lazily-loaded <video>/<img> elements keyed by MediaAsset id.
 * @type {Map<string, {element: HTMLVideoElement|HTMLImageElement|null, ready: boolean}>}
 */
const mediaElementCache = new Map();

/** @type {HTMLVideoElement|null} currently playing video element, if any */
let activeVideoEl = null;

/**
 * Kicks off (if not already in flight) loading a media asset's element and
 * returns it once ready, or null while still loading — the next render
 * tick will pick it up once the async load resolves.
 * @param {string} mediaId
 * @returns {HTMLVideoElement|HTMLImageElement|null}
 */
function ensureFrameSource(mediaId) {
  const cached = mediaElementCache.get(mediaId);
  if (cached) return cached.ready ? cached.element : null;

  const entry = { element: null, ready: false };
  mediaElementCache.set(mediaId, entry);

  getMedia(mediaId).then((asset) => {
    if (!asset) return;
    const url = getObjectURL(asset);

    if (asset.type === 'video') {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.addEventListener(
        'loadeddata',
        () => {
          entry.element = video;
          entry.ready = true;
          if (!isPlaying) renderFrame(clock.currentTime);
        },
        { once: true }
      );
      video.src = url;
    } else {
      const img = new Image();
      img.onload = () => {
        entry.element = img;
        entry.ready = true;
        if (!isPlaying) renderFrame(clock.currentTime);
      };
      img.src = url;
    }
  });

  return null;
}

function pauseActiveVideo() {
  if (activeVideoEl) {
    activeVideoEl.pause();
    activeVideoEl = null;
  }
}

/**
 * @returns {number} total playable duration (timeline content + outro), 0 if nothing to play
 */
export function getSequenceDuration() {
  const project = getActiveProject();
  if (!project || getClips().length === 0) return 0;
  return getTotalDuration() + (project.outro?.duration || 0);
}

/**
 * Renders the frame at a given playhead position.
 * @param {number} t
 */
function renderFrame(t) {
  if (!ctx) return;
  const project = getActiveProject();
  if (!project) return;

  const clips = getClips();
  if (clips.length === 0) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    return;
  }

  const contentDuration = getTotalDuration();

  if (t >= contentDuration) {
    pauseActiveVideo();
    const { gameLogoMediaId, studioLogoMediaId } = project.outro;
    if (gameLogoMediaId) ensureFrameSource(gameLogoMediaId);
    if (studioLogoMediaId) ensureFrameSource(studioLogoMediaId);
    drawOutro(ctx, project.outro, {
      gameLogo: mediaElementCache.get(gameLogoMediaId)?.element || undefined,
      studioLogo: mediaElementCache.get(studioLogoMediaId)?.element || undefined,
    });
    return;
  }

  const clip = clips.find((c) => t >= c.start && t < c.end);
  if (!clip) {
    pauseActiveVideo();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    return;
  }

  const source = ensureFrameSource(clip.mediaId);
  if (!source) return;

  const localTime = t - clip.start;
  const clipDuration = clip.end - clip.start;
  const progress = clipDuration > 0 ? localTime / clipDuration : 0;

  if (source.tagName === 'VIDEO') {
    if (activeVideoEl !== source) {
      pauseActiveVideo();
      activeVideoEl = source;
      source.currentTime = localTime;
      if (isPlaying) source.play().catch(() => {});
    } else if (!isPlaying) {
      source.currentTime = localTime;
    }
  } else if (activeVideoEl) {
    pauseActiveVideo();
  }

  drawFrame(ctx, source, clip.effects, progress);

  for (const overlay of clip.textOverlays) {
    if (localTime >= overlay.start && localTime < overlay.end) {
      drawTextOverlay(ctx, overlay);
    }
  }
}

/**
 * Binds the engine to a canvas element, sized to the active project's
 * resolution.
 * @param {HTMLCanvasElement} canvas
 */
export function attach(canvas) {
  const project = getActiveProject();
  ctx = setupCanvas(canvas, project?.resolution || DEFAULT_RESOLUTION);
  renderFrame(clock.currentTime);
}

/**
 * Starts rAF-driven playback from the current time.
 */
export function play() {
  if (!ctx) throw new ValidationError('PreviewEngine.attach must be called before play');
  if (isPlaying) return;
  isPlaying = true;

  clock.start((t) => {
    const total = getSequenceDuration();
    if (t >= total) {
      pause();
      seek(0);
      return;
    }
    renderFrame(t);
    eventBus.emit(PREVIEW_TICK, t);
  });
  eventBus.emit(PREVIEW_PLAYING);
}

/**
 * Pauses playback.
 */
export function pause() {
  isPlaying = false;
  clock.stop();
  pauseActiveVideo();
  eventBus.emit(PREVIEW_PAUSED);
}

/**
 * Seeks the playhead and redraws the current frame.
 * @param {number} seconds
 */
export function seek(seconds) {
  const total = getSequenceDuration();
  const clamped = Math.max(0, Math.min(seconds, total));
  clock.seek(clamped);
  renderFrame(clamped);
  eventBus.emit(PREVIEW_SEEKED, clamped);
  eventBus.emit(PREVIEW_TICK, clamped);
}

/**
 * @returns {number} current playhead position in seconds
 */
export function getCurrentTime() {
  return clock.currentTime;
}

/**
 * @returns {boolean} whether playback is currently running
 */
export function isPreviewPlaying() {
  return isPlaying;
}
