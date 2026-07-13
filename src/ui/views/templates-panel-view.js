import { createElement } from '../dom-utils.js';
import { createPanelHeader } from '../components/panel-header.js';

/**
 * Placeholder template list. ETAP 2 is UI-only, so this is a hardcoded
 * stand-in — ETAP 3 replaces it with TemplateSystem.listTemplates().
 * @type {{id: string, name: string}[]}
 */
const PLACEHOLDER_TEMPLATES = [{ id: 'crazygames_default', name: 'CrazyGames Default' }];

/**
 * Templates panel (left sidebar tab). Static card grid in ETAP 2.
 */
export class TemplatesPanelView {
  /** @param {HTMLElement} rootElement */
  constructor(rootElement) {
    this.rootElement = rootElement;
    this.render();
  }

  render() {
    const panel = createElement('div', { className: 'templates-panel' });
    const grid = createElement('div', { className: 'templates-panel__grid', attrs: { id: 'templates-grid' } });

    PLACEHOLDER_TEMPLATES.forEach((template, index) => {
      grid.append(this._templateCard(template, index === 0));
    });

    panel.append(createPanelHeader('Templates'), grid);
    this.rootElement.append(panel);
  }

  /**
   * @param {{id: string, name: string}} template
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
    return card;
  }
}
