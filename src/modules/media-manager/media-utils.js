import { NotImplementedError } from '../../core/errors.js';

/**
 * Reads video duration and pixel dimensions by loading the blob into a
 * throwaway <video> element and waiting for metadata.
 * @param {Blob} blob
 * @returns {Promise<{duration: number, dimensions: {width: number, height: number}}>}
 */
export function extractVideoMetadata(blob) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(blob);
    video.preload = 'metadata';
    video.src = url;

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        duration: video.duration,
        dimensions: { width: video.videoWidth, height: video.videoHeight },
      });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to read video metadata'));
    };
  });
}

/**
 * Reads pixel dimensions of an image blob.
 * @param {Blob} blob
 * @returns {Promise<{width: number, height: number}>}
 */
export function extractImageDimensions(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to read image dimensions'));
    };
    img.src = url;
  });
}

/**
 * Generates a small preview thumbnail for a media asset (for the media
 * library UI). Requires Canvas plumbing built in ETAP 3.
 * @param {import('../../core/types.js').MediaAsset} _asset
 * @returns {Promise<Blob>}
 */
export async function generateThumbnail(_asset) {
  throw new NotImplementedError('generateThumbnail is implemented in ETAP 3');
}
