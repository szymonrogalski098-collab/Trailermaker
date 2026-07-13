import { eventBus } from '../../core/event-bus.js';
import { PROJECT_CHANGED, PROJECT_DELETED, PROJECT_LOADED, PROJECT_SAVED } from '../../core/events.js';
import { ValidationError } from '../../core/errors.js';
import { createLogger } from '../../core/logger.js';
import {
  deleteProject as deleteProjectRecord,
  getAllProjects,
  getProject,
  putProject,
} from '../../storage/projects-store.js';
import { createDefaultProject, validateProjectShape } from './project-defaults.js';

const log = createLogger('ProjectManager');

/** @type {import('../../core/types.js').Project|null} */
let activeProject = null;

/**
 * Creates a new Project. Does not persist or activate it.
 * @param {Partial<import('../../core/types.js').Project>} [overrides]
 * @returns {import('../../core/types.js').Project}
 */
export function createProject(overrides = {}) {
  return createDefaultProject(overrides);
}

/**
 * Validates a Project against MVP constraints.
 * @param {import('../../core/types.js').Project} project
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateProject(project) {
  return validateProjectShape(project);
}

/**
 * Persists a project to IndexedDB.
 * @param {import('../../core/types.js').Project} project
 * @returns {Promise<import('../../core/types.js').Project>}
 */
export async function saveProject(project) {
  const { valid, errors } = validateProjectShape(project);
  if (!valid) throw new ValidationError('Cannot save invalid project', errors);

  const toSave = { ...project, updatedAt: Date.now() };
  await putProject(toSave);
  log.info('Saved project', toSave.id);
  eventBus.emit(PROJECT_SAVED, toSave);
  return toSave;
}

/**
 * Loads a project by id from IndexedDB and makes it the active project.
 * @param {string} id
 * @returns {Promise<import('../../core/types.js').Project>}
 */
export async function loadProject(id) {
  const project = await getProject(id);
  if (!project) throw new ValidationError(`No project found with id ${id}`);
  setActiveProject(project);
  eventBus.emit(PROJECT_LOADED, project);
  return project;
}

/**
 * Lists all stored projects.
 * @returns {Promise<import('../../core/types.js').Project[]>}
 */
export async function listProjects() {
  return getAllProjects();
}

/**
 * Deletes a project from IndexedDB.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteProject(id) {
  await deleteProjectRecord(id);
  if (activeProject?.id === id) activeProject = null;
  eventBus.emit(PROJECT_DELETED, id);
}

/**
 * @returns {import('../../core/types.js').Project|null} the current in-memory active project
 */
export function getActiveProject() {
  return activeProject;
}

/**
 * Sets the active project and notifies subscribers. This is the single
 * source of truth other modules (Timeline Engine, Template System) read
 * project state from.
 * @param {import('../../core/types.js').Project} project
 */
export function setActiveProject(project) {
  activeProject = project;
  eventBus.emit(PROJECT_CHANGED, project);
}
