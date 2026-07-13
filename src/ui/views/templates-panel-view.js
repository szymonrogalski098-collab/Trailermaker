import { eventBus } from '../../core/event-bus.js';
import { PROJECT_CHANGED, PROJECT_LOADED } from '../../core/events.js';
import { createLogger } from '../../core/logger.js';
import { importScenarioJson } from '../../modules/json-parser/scenario-parser.js';
import { getActiveProject, setActiveProject } from '../../modules/project-manager/project-manager.js';
import { applyTemplate, listTemplates } from '../../modules/template-system/template-manager.js';
import { clearElement, createElement } from '../dom-utils.js';
import { createButton } from '../components/button.js';
import { createPanelHeader } from '../components/panel-header.js';

const log = createLogger('TemplatesPanelView');

/**
 * Templates panel (left sidebar tab), wired to TemplateSystem, plus an
 * entry point for importing an AI-generated JSON scenario.
 */
export class TemplatesPanelView {
  /** @param {HTMLElement} rootElement */
  constructor(rootElement) {
    this.rootElement = rootElement;
    /** @type {HTMLElement} */
    this.gridEl = null;

    this.render();
    this._refresh();

    eventBus.on(PROJECT_CHANGED, () => this._refresh());
    eventBus.on(PROJECT_LOADED, () => this._refresh());
  }

  render() {
    const panel = createElement('div', { className: 'templates-panel' });
    this.gridEl = createElement('div', { className: 'templates-panel__grid', attrs: { id: 'templates-grid' } });

    panel.append(createPanelHeader('Templates'), this.gridEl, this._jsonImportControls());
    this.rootElement.append(panel);
  }

  _refresh() {
    clearElement(this.gridEl);
    const activeTemplateId = getActiveProject()?.templateId;
    listTemplates().forEach((template) => {
      this.gridEl.append(this._templateCard(template, template.id === activeTemplateId));
    });
  }

  /**
   * @param {import('../../core/types.js').Template} template
   * @param {boolean} selected
   * @returns {HTMLElement}
   */
  _templateCard(template, selected) {
    const card = createElement('div', {
      className: `asset-card asset-card--template${selected ? ' is-selected' : ''}`,
      attrs: { 'data-template-id': template.id },
    });
    card.append(
      createElement('div', { className: 'asset-card__thumb' }),
      createElement('div', { className: 'asset-card__name', text: template.name })
    );
    card.addEventListener('click', () => this._applyTemplate(template.id));
    return card;
  }

  /** @param {string} templateId */
  _applyTemplate(templateId) {
    const project = getActiveProject();
    if (!project) return;
    try {
      setActiveProject(applyTemplate(templateId, project));
    } catch (error) {
      log.error('Failed to apply template', error);
      alert(error.message);
    }
  }

  /** @returns {HTMLElement} */
  _jsonImportControls() {
    const wrapper = createElement('div', { className: 'templates-panel__import' });

    const fileInput = /** @type {HTMLInputElement} */ (
      createElement('input', { attrs: { id: 'json-scenario-input', type: 'file', accept: '.json,application/json', hidden: true } })
    );
    fileInput.addEventListener('change', () => this._importScenarioFile(fileInput.files?.[0]));

    const importBtn = createButton('Import JSON scenario', { block: true, size: 'sm', id: 'btn-import-json' });
    importBtn.addEventListener('click', () => fileInput.click());

    wrapper.append(importBtn, fileInput);
    return wrapper;
  }

  /** @param {File|undefined} file */
  async _importScenarioFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      await importScenarioJson(text);
    } catch (error) {
      log.error('Failed to import scenario JSON', error);
      const details = error.details?.length ? `\n\n${error.details.join('\n')}` : '';
      alert(`${error.message}${details}`);
    }
  }
}
