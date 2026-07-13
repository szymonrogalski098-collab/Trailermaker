import { getEffectRenderer } from '../timeline-engine/effects/effect-registry.js';

/**
 * Low-level Canvas 2D draw primitives shared by preview playback and (via
 * frame-stepping) MP4 export, so rendering logic is written once.
 */

/**
 * Sizes a canvas to the project's resolution.
 * @param {HTMLCanvasElement} canvas
 * @param {string} resolution - e.g. "1080x1920"
 * @returns {CanvasRenderingContext2D}
 */
export function setupCanvas(canvas, resolution) {
  const [width, height] = resolution.split('x').map(Number);
  canvas.width = width;
  canvas.height = height;
  return canvas.getContext('2d');
}

/**
 * Computes the draw rect for a "cover" fit of a source into the canvas
 * (fills the frame, cropping overflow, preserving source aspect ratio) —
 * canvas has no built-in object-fit equivalent.
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLVideoElement|HTMLImageElement} source
 * @returns {{x: number, y: number, width: number, height: number}}
 */
export function computeCoverRect(canvas, source) {
  const canvasW = canvas.width;
  const canvasH = canvas.height;
  const srcW = source.videoWidth || source.naturalWidth || 0;
  const srcH = source.videoHeight || source.naturalHeight || 0;

  if (!srcW || !srcH) {
    return { x: 0, y: 0, width: canvasW, height: canvasH };
  }

  const canvasRatio = canvasW / canvasH;
  const srcRatio = srcW / srcH;
  let width, height;

  if (srcRatio > canvasRatio) {
    height = canvasH;
    width = canvasH * srcRatio;
  } else {
    width = canvasW;
    height = canvasW / srcRatio;
  }

  return { x: (canvasW - width) / 2, y: (canvasH - height) / 2, width, height };
}

/**
 * Draws a video/image frame source into the canvas, respecting
 * aspect-ratio cropping, delegating to the active effect's renderer (if
 * any) for the actual transform/composite.
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLVideoElement|HTMLImageElement} frameSource
 * @param {import('../../core/types.js').EffectInstance[]} effects
 * @param {number} progress - 0..1 through the clip's active window
 */
export function drawFrame(ctx, frameSource, effects, progress) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const activeEffect = effects[0];
  const renderer = activeEffect && getEffectRenderer(activeEffect.type);

  if (renderer) {
    renderer(ctx, frameSource, progress, activeEffect.params || {});
    return;
  }

  const rect = computeCoverRect(ctx.canvas, frameSource);
  ctx.drawImage(frameSource, rect.x, rect.y, rect.width, rect.height);
}

/**
 * Draws a text overlay onto the canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../../core/types.js').TextOverlay} overlay
 */
export function drawTextOverlay(ctx, overlay) {
  const { width, height } = ctx.canvas;
  ctx.save();
  ctx.font = `600 ${Math.round(width * 0.06)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  const y = height * 0.85;
  const metrics = ctx.measureText(overlay.text);
  ctx.fillRect(width / 2 - metrics.width / 2 - 16, y - width * 0.06 - 8, metrics.width + 32, width * 0.06 + 24);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(overlay.text, width / 2, y);
  ctx.restore();
}

/**
 * Composites the outro frame: game logo and/or studio logo, centered,
 * falling back to placeholder labels when no logo media is set yet.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../../core/types.js').Outro} outro
 * @param {{gameLogo?: HTMLImageElement, studioLogo?: HTMLImageElement}} logoSources
 */
export function drawOutro(ctx, outro, logoSources = {}) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  const slots = [];
  if (outro.gameLogo) slots.push(logoSources.gameLogo || null);
  if (outro.studioLogo) slots.push(logoSources.studioLogo || null);
  if (slots.length === 0) return;

  const slotHeight = height / slots.length;
  slots.forEach((logo, index) => {
    const centerY = slotHeight * index + slotHeight / 2;
    if (logo) {
      const maxSize = Math.min(width, slotHeight) * 0.6;
      const scale = Math.min(maxSize / logo.naturalWidth, maxSize / logo.naturalHeight);
      const drawW = logo.naturalWidth * scale;
      const drawH = logo.naturalHeight * scale;
      ctx.drawImage(logo, width / 2 - drawW / 2, centerY - drawH / 2, drawW, drawH);
    } else {
      ctx.save();
      ctx.font = `600 ${Math.round(width * 0.05)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#5f5f6e';
      ctx.fillText(index === 0 ? 'Game logo' : 'Studio logo', width / 2, centerY);
      ctx.restore();
    }
  });
}
