import { NotImplementedError } from '../../core/errors.js';

/**
 * @typedef {Object} ExportOptions
 * @property {'mp4'} [format]
 * @property {number} [fps]
 * @property {string} [resolution]
 */

/**
 * Renders the full timeline to an MP4 Blob via FFmpeg.wasm.
 * FFmpeg is only ever invoked during export, never for preview.
 * @param {import('../../core/types.js').Project} _project
 * @param {ExportOptions} [_options]
 * @returns {Promise<Blob>}
 */
export async function exportProject(_project, _options = {}) {
  throw new NotImplementedError('ExportEngine.exportProject is implemented in ETAP 4');
}

/**
 * Subscribes to export progress updates.
 * @param {(progress: {ratio: number, stage: string}) => void} _handler
 * @returns {() => void} unsubscribe function
 */
export function onProgress(_handler) {
  throw new NotImplementedError('ExportEngine.onProgress is implemented in ETAP 4');
}
