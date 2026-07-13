import { ValidationError } from '../../core/errors.js';
import { eventBus } from '../../core/event-bus.js';
import { EXPORT_COMPLETE, EXPORT_FAILED, EXPORT_PROGRESS } from '../../core/events.js';
import { createLogger } from '../../core/logger.js';
import { getMedia } from '../media-manager/media-manager.js';
import { drawFrame, drawOutro, drawTextOverlay, setupCanvas } from '../preview-engine/canvas-renderer.js';
import { FFmpeg } from '../../vendor/ffmpeg/lib/index.js';

const log = createLogger('ExportEngine');

/** Vendored locally (not a CDN) so export works fully offline on GitHub Pages. */
const CORE_JS_URL = new URL('../../vendor/ffmpeg/core/ffmpeg-core.js', import.meta.url).href;

/** Rendering (frame capture) accounts for this fraction of overall progress; the rest is encoding. */
const RENDER_PROGRESS_SHARE = 0.85;

/** @type {Set<(progress: {ratio: number, stage: string}) => void>} */
const progressHandlers = new Set();

/**
 * @param {number} ratio
 * @param {string} stage
 */
function emitProgress(ratio, stage) {
  const payload = { ratio: Math.min(1, Math.max(0, ratio)), stage };
  progressHandlers.forEach((handler) => handler(payload));
  eventBus.emit(EXPORT_PROGRESS, payload);
}

/**
 * @param {number} index
 * @returns {string}
 */
function frameFileName(index) {
  return `frame${String(index).padStart(6, '0')}.png`;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<Blob>}
 */
function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('canvas.toBlob failed'))), 'image/png');
  });
}

/**
 * Seeks a video element to a given time and waits for the frame to be
 * ready, with a timeout fallback in case 'seeked' never fires.
 * @param {HTMLVideoElement} video
 * @param {number} time
 * @returns {Promise<void>}
 */
function seekVideo(video, time) {
  const target = Math.min(time, video.duration || time);
  if (Math.abs(video.currentTime - target) < 0.005) return Promise.resolve();

  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(onSeeked, 500);
    video.addEventListener('seeked', onSeeked);
    video.currentTime = target;
  });
}

/**
 * Preloads a <video>/<img> element for every distinct media asset
 * referenced by the project's clips and outro, awaited upfront so
 * frame-by-frame export can access them synchronously.
 * @param {import('../../core/types.js').Clip[]} clips
 * @param {import('../../core/types.js').Outro} outro
 * @returns {Promise<Map<string, HTMLVideoElement|HTMLImageElement>>}
 */
async function preloadMedia(clips, outro) {
  const mediaIds = new Set(clips.map((c) => c.mediaId));
  if (outro.gameLogoMediaId) mediaIds.add(outro.gameLogoMediaId);
  if (outro.studioLogoMediaId) mediaIds.add(outro.studioLogoMediaId);

  const elements = new Map();

  await Promise.all(
    [...mediaIds].map(async (mediaId) => {
      const asset = await getMedia(mediaId);
      if (!asset) return;

      const url = URL.createObjectURL(asset.blob);
      if (asset.type === 'video') {
        const video = document.createElement('video');
        video.muted = true;
        video.preload = 'auto';
        await new Promise((resolve, reject) => {
          video.addEventListener('loadeddata', resolve, { once: true });
          video.addEventListener('error', () => reject(new Error(`Failed to load video ${asset.name}`)), { once: true });
          video.src = url;
        });
        elements.set(mediaId, video);
      } else {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error(`Failed to load image ${asset.name}`));
          img.src = url;
        });
        elements.set(mediaId, img);
      }
    })
  );

  return elements;
}

/**
 * Renders a single frame at time `t` into the canvas context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} t
 * @param {import('../../core/types.js').Clip[]} clips
 * @param {import('../../core/types.js').Outro} outro
 * @param {Map<string, HTMLVideoElement|HTMLImageElement>} mediaElements
 * @param {number} contentDuration
 */
async function renderExportFrame(ctx, t, clips, outro, mediaElements, contentDuration) {
  if (t >= contentDuration) {
    drawOutro(ctx, outro, {
      gameLogo: mediaElements.get(outro.gameLogoMediaId),
      studioLogo: mediaElements.get(outro.studioLogoMediaId),
    });
    return;
  }

  const clip = clips.find((c) => t >= c.start && t < c.end);
  const source = clip && mediaElements.get(clip.mediaId);
  if (!clip || !source) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    return;
  }

  const localTime = t - clip.start;
  if (source.tagName === 'VIDEO') {
    await seekVideo(source, localTime);
  }

  const progress = clip.end - clip.start > 0 ? localTime / (clip.end - clip.start) : 0;
  drawFrame(ctx, source, clip.effects, progress);

  for (const overlay of clip.textOverlays) {
    if (localTime >= overlay.start && localTime < overlay.end) drawTextOverlay(ctx, overlay);
  }
}

/**
 * @typedef {Object} ExportOptions
 * @property {number} [fps] - overrides project.fps
 * @property {string} [resolution] - overrides project.resolution, e.g. "1080x1920"
 */

/**
 * Renders the full timeline to an MP4 Blob via FFmpeg.wasm, reusing the
 * same Canvas drawing routines as the live preview (canvas-renderer.js) so
 * export and preview never diverge. FFmpeg is only loaded/used here, never
 * for preview.
 * @param {import('../../core/types.js').Project} project
 * @param {ExportOptions} [options]
 * @returns {Promise<Blob>}
 */
export async function exportProject(project, options = {}) {
  const clips = project.clips || [];
  if (clips.length === 0) {
    throw new ValidationError('Cannot export a project with no clips');
  }

  const fps = options.fps || project.fps;
  const resolution = options.resolution || project.resolution;
  const contentDuration = clips.reduce((max, c) => Math.max(max, c.end), 0);
  const totalDuration = contentDuration + (project.outro?.duration || 0);
  const totalFrames = Math.max(1, Math.round(totalDuration * fps));

  const ffmpeg = new FFmpeg();

  try {
    emitProgress(0, 'loading-media');
    const mediaElements = await preloadMedia(clips, project.outro);

    const canvas = document.createElement('canvas');
    const ctx = setupCanvas(canvas, resolution);

    emitProgress(0, 'loading-ffmpeg');
    await ffmpeg.load({ coreURL: CORE_JS_URL });

    emitProgress(0, 'rendering');
    for (let frame = 0; frame < totalFrames; frame++) {
      const t = frame / fps;
      // eslint-disable-next-line no-await-in-loop -- frames must be captured sequentially (shared canvas/video seek state)
      await renderExportFrame(ctx, t, clips, project.outro, mediaElements, contentDuration);
      // eslint-disable-next-line no-await-in-loop
      const blob = await canvasToBlob(canvas);
      // eslint-disable-next-line no-await-in-loop
      const data = new Uint8Array(await blob.arrayBuffer());
      // eslint-disable-next-line no-await-in-loop
      await ffmpeg.writeFile(frameFileName(frame), data);
      emitProgress(((frame + 1) / totalFrames) * RENDER_PROGRESS_SHARE, 'rendering');
    }

    emitProgress(RENDER_PROGRESS_SHARE, 'encoding');
    const outputName = 'output.mp4';
    await ffmpeg.exec([
      '-framerate', String(fps),
      '-i', 'frame%06d.png',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      outputName,
    ]);

    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer], { type: 'video/mp4' });

    emitProgress(1, 'done');
    eventBus.emit(EXPORT_COMPLETE, blob);
    return blob;
  } catch (error) {
    log.error('Export failed', error);
    eventBus.emit(EXPORT_FAILED, error.message);
    throw error;
  } finally {
    ffmpeg.terminate();
  }
}

/**
 * Subscribes to export progress updates.
 * @param {(progress: {ratio: number, stage: string}) => void} handler
 * @returns {() => void} unsubscribe function
 */
export function onProgress(handler) {
  progressHandlers.add(handler);
  return () => progressHandlers.delete(handler);
}
