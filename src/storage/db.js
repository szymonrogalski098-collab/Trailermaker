import { StorageError } from '../core/errors.js';

const DB_NAME = 'trailer-studio-db';
const DB_VERSION = 1;

export const PROJECTS_STORE = 'projects';
export const MEDIA_STORE = 'mediaAssets';

/** @type {Promise<IDBDatabase>|null} */
let dbPromise = null;

/**
 * Creates the object stores/indexes on first install or version bump.
 * @param {IDBDatabase} db
 */
function upgrade(db) {
  if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
    const projects = db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
    projects.createIndex('updatedAt', 'updatedAt');
    projects.createIndex('title', 'title');
  }

  if (!db.objectStoreNames.contains(MEDIA_STORE)) {
    const mediaAssets = db.createObjectStore(MEDIA_STORE, { keyPath: 'id' });
    mediaAssets.createIndex('type', 'type');
    mediaAssets.createIndex('createdAt', 'createdAt');
  }
}

/**
 * Opens (or creates/upgrades) the IndexedDB database. Memoized so every
 * caller shares the same connection.
 * @returns {Promise<IDBDatabase>}
 */
export function openDatabase() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => upgrade(request.result);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(new StorageError('Failed to open IndexedDB', request.error));
    };
  });

  return dbPromise;
}

/**
 * Runs a single-store transaction and wraps it in a Promise.
 * @param {string} storeName
 * @param {IDBTransactionMode} mode
 * @param {(store: IDBObjectStore) => IDBRequest} operation
 * @returns {Promise<any>}
 */
export async function runTransaction(storeName, mode, operation) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = operation(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new StorageError(`Transaction failed on ${storeName}`, request.error));
  });
}
