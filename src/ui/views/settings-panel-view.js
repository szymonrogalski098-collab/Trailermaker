import { ASPECT_RATIO, DEFAULT_FPS, DEFAULT_RESOLUTION, MAX_DURATION_SECONDS } from '../../config.js';
import { createElement } from '../dom-utils.js';
import { createPanelHeader } from '../components/panel-header.js';

/**
 * Project settings panel (right sidebar). Displays project constraints from
 * config.js. Static in ETAP 2 — binding to ProjectManager lands in ETAP 3.
 */
export class SettingsPanelView {
  /** @param {HTMLElement} rootElement */
  constructor(rootElement) {
    this.rootElement = rootElement;
    this.render();
  }

  render() {
    const panel = createElement('div', { className: 'settings-panel' });
    panel.append(
      createPanelHeader('Project settings'),
      this._titleField(),
      this._readonlyField('Duration', `0.0s / ${MAX_DURATION_SECONDS}s max`, 'setting-duration'),
      this._readonlyField('Resolution', DEFAULT_RESOLUTION, 'setting-resolution'),
      this._readonlyField('FPS', String(DEFAULT_FPS), 'setting-fps'),
      this._readonlyField('Aspect ratio', `${ASPECT_RATIO} (fixed)`, 'setting-aspect-ratio')
    );

    this.rootElement.append(panel);
  }

  /** @returns {HTMLElement} */
  _titleField() {
    const label = createElement('label', { className: 'field' });
    label.append(
      createElement('span', { className: 'field__label', text: 'Title' }),
      createElement('input', {
        className: 'field__input',
        attrs: { id: 'setting-title', type: 'text', value: 'Untitled trailer' },
      })
    );
    return label;
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
}
