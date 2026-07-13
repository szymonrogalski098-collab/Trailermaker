import { ASPECT_RATIO, DEFAULT_FPS, DEFAULT_RESOLUTION, MAX_DURATION_SECONDS } from '../../config.js';
import { eventBus } from '../../core/event-bus.js';
import { PROJECT_CHANGED, PROJECT_LOADED, PROJECT_SAVED, TIMELINE_UPDATED } from '../../core/events.js';
import {
  createProject,
  getActiveProject,
  listProjects,
  loadProject,
  saveProject,
  setActiveProject,
} from '../../modules/project-manager/project-manager.js';
import { getClips, getTotalDuration } from '../../modules/timeline-engine/timeline-engine.js';
import { clearElement, createElement } from '../dom-utils.js';
import { createButton } from '../components/button.js';
import { createPanelHeader } from '../components/panel-header.js';

/**
 * Project settings panel (right sidebar): title, live duration, and
 * save/load/new project controls, wired to ProjectManager.
 */
export class SettingsPanelView {
  /** @param {HTMLElement} rootElement */
  constructor(rootElement) {
    this.rootElement = rootElement;
    /** @type {HTMLInputElement} */
    this.titleInput = null;
    /** @type {HTMLElement} */
    this.durationEl = null;
    /** @type {HTMLSelectElement} */
    this.projectSelect = null;

    this.render();
    this._refreshDuration();
    this._syncTitle();
    this._refreshProjectList();

    eventBus.on(TIMELINE_UPDATED, () => this._refreshDuration());
    eventBus.on(PROJECT_CHANGED, () => {
      this._refreshDuration();
      this._syncTitle();
    });
    eventBus.on(PROJECT_LOADED, () => {
      this._refreshDuration();
      this._syncTitle();
    });
    eventBus.on(PROJECT_SAVED, () => this._refreshProjectList());
  }

  render() {
    const panel = createElement('div', { className: 'settings-panel' });
    panel.append(
      createPanelHeader('Project settings'),
      this._titleField(),
      this._durationField(),
      this._readonlyField('Resolution', DEFAULT_RESOLUTION, 'setting-resolution'),
      this._readonlyField('FPS', String(DEFAULT_FPS), 'setting-fps'),
      this._readonlyField('Aspect ratio', `${ASPECT_RATIO} (fixed)`, 'setting-aspect-ratio'),
      this._projectActions()
    );

    this.rootElement.append(panel);
  }

  /** @returns {HTMLElement} */
  _titleField() {
    const label = createElement('label', { className: 'field' });
    this.titleInput = /** @type {HTMLInputElement} */ (
      createElement('input', {
        className: 'field__input',
        attrs: { id: 'setting-title', type: 'text', value: 'Untitled trailer' },
      })
    );
    this.titleInput.addEventListener('change', () => this._updateTitle(this.titleInput.value));

    label.append(createElement('span', { className: 'field__label', text: 'Title' }), this.titleInput);
    return label;
  }

  /** @returns {HTMLElement} */
  _durationField() {
    const field = createElement('div', { className: 'field' });
    this.durationEl = createElement('div', { className: 'field__readonly', attrs: { id: 'setting-duration' } });
    field.append(createElement('span', { className: 'field__label', text: 'Duration' }), this.durationEl);
    return field;
  }

  /**
   * @param {string} labelText
   * @param {string} value
   * @param {string} id
   * @returns {HTMLElement}
   */
  _readonlyField(labelText, value, id) {
    const field = createElement('div', { className: 'field' });
    field.append(
      createElement('span', { className: 'field__label', text: labelText }),
      createElement('div', { className: 'field__readonly', text: value, attrs: { id } })
    );
    return field;
  }

  /** @returns {HTMLElement} */
  _projectActions() {
    const field = createElement('div', { className: 'field' });
    field.append(createElement('span', { className: 'field__label', text: 'Projects' }));

    this.projectSelect = /** @type {HTMLSelectElement} */ (
      createElement('select', { className: 'field__input', attrs: { id: 'setting-project-list' } })
    );
    this.projectSelect.addEventListener('change', () => {
      if (this.projectSelect.value) loadProject(this.projectSelect.value);
    });
    field.append(this.projectSelect);

    const actions = createElement('div', { className: 'settings-panel__actions' });
    const saveBtn = createButton('Save project', { variant: 'primary', size: 'sm', id: 'btn-save-project' });
    saveBtn.addEventListener('click', () => this._handleSave());
    const newBtn = createButton('New project', { size: 'sm', id: 'btn-new-project' });
    newBtn.addEventListener('click', () => setActiveProject(createProject()));
    actions.append(saveBtn, newBtn);
    field.append(actions);

    return field;
  }

  _refreshDuration() {
    const project = getActiveProject();
    const cap = project?.duration ?? MAX_DURATION_SECONDS;
    let occupied = 0;
    try {
      occupied = getClips().length ? getTotalDuration() : 0;
    } catch {
      occupied = 0;
    }
    this.durationEl.textContent = `${occupied.toFixed(1)}s / ${cap}s max`;
  }

  _syncTitle() {
    const project = getActiveProject();
    if (project && this.titleInput) this.titleInput.value = project.title;
  }

  /** @param {string} value */
  _updateTitle(value) {
    const project = getActiveProject();
    if (!project) return;
    project.title = value;
    setActiveProject(project);
  }

  async _refreshProjectList() {
    const projects = await listProjects();
    clearElement(this.projectSelect);
    this.projectSelect.append(createElement('option', { text: '— Load project —', attrs: { value: '' } }));
    projects
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .forEach((project) => {
        this.projectSelect.append(createElement('option', { text: project.title, attrs: { value: project.id } }));
      });
  }

  async _handleSave() {
    const project = getActiveProject();
    if (!project) return;
    await saveProject(project);
    await this._refreshProjectList();
  }
}
