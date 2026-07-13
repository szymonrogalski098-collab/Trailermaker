import { eventBus } from '../../core/event-bus.js';
import { HISTORY_CHANGED, PROJECT_CHANGED, PROJECT_LOADED, TIMELINE_UPDATED } from '../../core/events.js';
import { getActiveProject, setActiveProject } from '../project-manager/project-manager.js';

/**
 * Undo/redo history for the active project. Listens to the same
 * PROJECT_CHANGED/TIMELINE_UPDATED events every view already reacts to, so
 * undoing/redoing is just swapping the active project — no other module
 * (TimelineEngine, TemplateSystem, JsonParser, ...) needs its own
 * undo-aware logic.
 */

const MAX_HISTORY_ENTRIES = 50;

/** @type {import('../../core/types.js').Project[]} */
let undoStack = [];
/** @type {import('../../core/types.js').Project[]} */
let redoStack = [];
/** @type {import('../../core/types.js').Project|null} */
let lastSnapshot = null;
/** True while undo()/redo() is itself applying a project, so that change doesn't get captured as new history. */
let suppressCapture = false;

/**
 * @param {import('../../core/types.js').Project} project
 * @returns {import('../../core/types.js').Project} a deep copy, since Project is plain JSON-serializable data
 */
function cloneProject(project) {
  return JSON.parse(JSON.stringify(project));
}

function notify() {
  eventBus.emit(HISTORY_CHANGED, { canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 });
}

function captureChange() {
  if (suppressCapture) return;
  const current = getActiveProject();
  if (!current) return;

  if (lastSnapshot) {
    undoStack.push(lastSnapshot);
    if (undoStack.length > MAX_HISTORY_ENTRIES) undoStack.shift();
    redoStack = [];
  }
  lastSnapshot = cloneProject(current);
  notify();
}

/** Called when a different project becomes active (e.g. loaded from storage) — its own history starts fresh. */
function resetHistory() {
  undoStack = [];
  redoStack = [];
  const current = getActiveProject();
  lastSnapshot = current ? cloneProject(current) : null;
  notify();
}

eventBus.on(TIMELINE_UPDATED, captureChange);
eventBus.on(PROJECT_CHANGED, captureChange);
eventBus.on(PROJECT_LOADED, resetHistory);

/** @returns {boolean} */
export function canUndo() {
  return undoStack.length > 0;
}

/** @returns {boolean} */
export function canRedo() {
  return redoStack.length > 0;
}

/** Restores the previous project state, if any. */
export function undo() {
  if (undoStack.length === 0 || !lastSnapshot) return;
  const previous = undoStack.pop();
  redoStack.push(lastSnapshot);
  lastSnapshot = previous;

  suppressCapture = true;
  setActiveProject(cloneProject(previous));
  suppressCapture = false;
  notify();
}

/** Re-applies the next project state, if any. */
export function redo() {
  if (redoStack.length === 0 || !lastSnapshot) return;
  const next = redoStack.pop();
  undoStack.push(lastSnapshot);
  lastSnapshot = next;

  suppressCapture = true;
  setActiveProject(cloneProject(next));
  suppressCapture = false;
  notify();
}
