import { eventBus } from '../../core/event-bus.js';
import { MEDIA_DELETED, MEDIA_IMPORTED } from '../../core/events.js';
import { createLogger } from '../../core/logger.js';
import {
  deleteMediaAsset,
  getAllMediaAssets,
  getMediaAsset,
  putMediaAsset,
} from '../../storage/media-store.js';
import { extractImageDimensions, extractVideoMetadata } from './media-utils.js';

const log = createLogger('MediaManager');

/**
 * Tracks Object URLs created via getObjectURL so they can be revoked
 * together (avoids leaking Blob URLs for the lifetime of the tab).
 * @type {Map<string, string>}
 */
const objectUrlCache = new Map();

/**
 * Imports a File into the media library: stores its Blob in IndexedDB and
 * records metadata (duration for video, dimensions for video/image).
 * @param {File} file
 * @param {'video'|'image'|'logo'} type
 * @returns {Promise<import('../../core/types.js').MediaAsset>}
 */
export async function importMedia(file, type) {
  /** @type {import('../../core/types.js').MediaAsset} */
  const asset = {
    id: crypto.randomUUID(),
    type,
    name: file.name,
    mimeType: file.type,
    size: file.size,
    blob: file,
    createdAt: Date.now(),
  };

  if (type === 'video') {
    const { duration, dimensions } = await extractVideoMetadata(file);
    asset.duration = duration;
    asset.dimensions = dimensions;
  } else {
    asset.dimensions = await extractImageDimensions(file);
  }

  await putMediaAsset(asset);
  log.info('Imported media', asset.id, asset.name);
  eventBus.emit(MEDIA_IMPORTED, asset);
  return asset;
}

/**
 * @param {string} id
 * @returns {Promise<import('../../core/types.js').MediaAsset|undefined>}
 */
export async function getMedia(id) {
  return getMediaAsset(id);
}

/**
 * @returns {Promise<import('../../core/types.js').MediaAsset[]>}
 */
export async function listMedia() {
  return getAllMediaAssets();
}

/**
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteMedia(id) {
  const cachedUrl = objectUrlCache.get(id);
  if (cachedUrl) {
    URL.revokeObjectURL(cachedUrl);
    objectUrlCache.delete(id);
  }
  await deleteMediaAsset(id);
  eventBus.emit(MEDIA_DELETED, id);
}

/**
 * Returns a (cached) Object URL for a media asset's blob, for use as a
 * <video>/<img> src in the Preview Engine. The URL is reused across calls
 * for the same asset id and revoked on deleteMedia.
 * @param {import('../../core/types.js').MediaAsset} asset
 * @returns {string}
 */
export function getObjectURL(asset) {
  let url = objectUrlCache.get(asset.id);
  if (!url) {
    url = URL.createObjectURL(asset.blob);
    objectUrlCache.set(asset.id, url);
  }
  return url;
}
