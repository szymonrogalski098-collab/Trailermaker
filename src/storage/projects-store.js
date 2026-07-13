import { PROJECTS_STORE, runTransaction } from './db.js';

/**
 * Persists (creates or overwrites) a project.
 * @param {import('../core/types.js').Project} project
 * @returns {Promise<void>}
 */
export async function putProject(project) {
  await runTransaction(PROJECTS_STORE, 'readwrite', (store) => store.put(project));
}

/**
 * @param {string} id
 * @returns {Promise<import('../core/types.js').Project|undefined>}
 */
export async function getProject(id) {
  return runTransaction(PROJECTS_STORE, 'readonly', (store) => store.get(id));
}

/**
 * Lightweight listing of all stored projects (full objects — callers that
 * only need id/title/updatedAt can pick those fields themselves).
 * @returns {Promise<import('../core/types.js').Project[]>}
 */
export async function getAllProjects() {
  return runTransaction(PROJECTS_STORE, 'readonly', (store) => store.getAll());
}

/**
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteProject(id) {
  await runTransaction(PROJECTS_STORE, 'readwrite', (store) => store.delete(id));
}
