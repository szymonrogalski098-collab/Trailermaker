import { MEDIA_STORE, runTransaction } from './db.js';

/**
 * Persists (creates or overwrites) a media asset, including its Blob.
 * IndexedDB stores Blobs natively — no base64 encoding needed.
 * @param {import('../core/types.js').MediaAsset} asset
 * @returns {Promise<void>}
 */
export async function putMediaAsset(asset) {
  await runTransaction(MEDIA_STORE, 'readwrite', (store) => store.put(asset));
}

/**
 * @param {string} id
 * @returns {Promise<import('../core/types.js').MediaAsset|undefined>}
 */
export async function getMediaAsset(id) {
  return runTransaction(MEDIA_STORE, 'readonly', (store) => store.get(id));
}

/**
 * @returns {Promise<import('../core/types.js').MediaAsset[]>}
 */
export async function getAllMediaAssets() {
  return runTransaction(MEDIA_STORE, 'readonly', (store) => store.getAll());
}

/**
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteMediaAsset(id) {
  await runTransaction(MEDIA_STORE, 'readwrite', (store) => store.delete(id));
}
