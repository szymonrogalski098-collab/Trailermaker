import { createElement, clearElement } from '../dom-utils.js';
import { createButton } from '../components/button.js';
import { MediaLibraryView } from './media-library-view.js';
import { TemplatesPanelView } from './templates-panel-view.js';
import { SettingsPanelView } from './settings-panel-view.js';
import { TimelineView } from './timeline-view.js';

/**
 * Root editor view controller. Builds the app shell (header, left sidebar
 * with Media/Templates tabs, preview stage, right settings sidebar,
 * timeline section) and composes the other view controllers into it.
 * Static/visual only in ETAP 2 — data binding lands in ETAP 3.
 */
export class EditorView {
  /** @param {HTMLElement} rootElement */
  constructor(rootElement) {
    this.rootElement = rootElement;
    this.render();
  }

  render() {
    clearElement(this.rootElement);

    const shell = createElement('div', { className: 'editor-shell' });
    const sidebarLeft = this._sidebarLeft();

    shell.append(this._header(), sidebarLeft.element, this._preview(), this._sidebarRight(), this._timelineSection());

    this.rootElement.append(shell);

    new MediaLibraryView(sidebarLeft.mediaPanel);
    new TemplatesPanelView(sidebarLeft.templatesPanel);
    new SettingsPanelView(shell.querySelector('.editor-sidebar-right'));
    new TimelineView(shell.querySelector('.editor-timeline-section'));
  }

  /** @returns {HTMLElement} */
  _header() {
    const header = createElement('div', { className: 'editor-header' });
    const brand = createElement('span', { text: 'Trailer Studio' });
    const titleInput = createElement('input', {
      className: 'field__input',
      attrs: { id: 'editor-header-project-title', type: 'text', value: 'Untitled trailer' },
    });
    const actions = createElement('div', { className: 'editor-header__actions' });
    const undoBtn = createButton('Undo', { size: 'sm', disabled: true, id: 'btn-undo' });
    const redoBtn = createButton('Redo', { size: 'sm', disabled: true, id: 'btn-redo' });
    const exportBtn = createButton('Export MP4', { variant: 'primary', size: 'sm', id: 'btn-export' });
    exportBtn.addEventListener('click', () => console.log('Export MP4 — implemented in ETAP 4'));

    actions.append(undoBtn, redoBtn, exportBtn);
    header.append(brand, titleInput, actions);
    return header;
  }

  /**
   * @returns {{element: HTMLElement, mediaPanel: HTMLElement, templatesPanel: HTMLElement}}
   */
  _sidebarLeft() {
    const element = createElement('div', { className: 'editor-sidebar-left' });
    const tabBar = createElement('div', { className: 'tab-bar' });
    const mediaTab = createElement('button', {
      className: 'tab-bar__tab is-active',
      text: 'Media',
      attrs: { type: 'button', id: 'tab-media' },
    });
    const templatesTab = createElement('button', {
      className: 'tab-bar__tab',
      text: 'Templates',
      attrs: { type: 'button', id: 'tab-templates' },
    });

    const mediaPanel = createElement('div', { className: 'tab-panel', attrs: { id: 'tab-panel-media' } });
    const templatesPanel = createElement('div', {
      className: 'tab-panel',
      attrs: { id: 'tab-panel-templates', hidden: true },
    });

    const activate = (tab) => {
      const isMedia = tab === 'media';
      mediaTab.classList.toggle('is-active', isMedia);
      templatesTab.classList.toggle('is-active', !isMedia);
      mediaPanel.hidden = !isMedia;
      templatesPanel.hidden = isMedia;
    };
    mediaTab.addEventListener('click', () => activate('media'));
    templatesTab.addEventListener('click', () => activate('templates'));

    tabBar.append(mediaTab, templatesTab);
    element.append(tabBar, mediaPanel, templatesPanel);

    return { element, mediaPanel, templatesPanel };
  }

  /** @returns {HTMLElement} */
  _preview() {
    const preview = createElement('div', { className: 'editor-preview' });

    const stage = createElement('div', { className: 'preview-stage' });
    const canvas = createElement('canvas', {
      attrs: { id: 'preview-canvas', width: '1080', height: '1920' },
    });
    const placeholder = createElement('div', {
      className: 'preview-stage__placeholder',
      text: 'Preview appears here once media and clips are added',
    });
    stage.append(canvas, placeholder);

    const controls = createElement('div', { className: 'preview-controls' });
    const playBtn = createButton('▶', { variant: 'icon', size: 'sm', id: 'btn-play-pause' });
    const time = createElement('span', { className: 'preview-controls__time', text: '00:00 / 00:00', attrs: { id: 'preview-time' } });
    const scrub = createElement('input', {
      className: 'preview-controls__scrub',
      attrs: { id: 'preview-scrub', type: 'range', min: '0', max: '20', step: '0.1', value: '0' },
    });
    controls.append(playBtn, time, scrub);

    preview.append(stage, controls);
    return preview;
  }

  /** @returns {HTMLElement} */
  _sidebarRight() {
    return createElement('div', { className: 'editor-sidebar-right' });
  }

  /** @returns {HTMLElement} */
  _timelineSection() {
    return createElement('div', { className: 'editor-timeline-section' });
  }
}
