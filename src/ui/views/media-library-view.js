import { createElement } from '../dom-utils.js';
import { createButton } from '../components/button.js';

/**
 * Media panel (left sidebar tab): import controls + media grid.
 * Static markup in ETAP 2 — wiring to MediaManager (import, drag & drop,
 * rendering real asset cards) lands in ETAP 3.
 */
export class MediaLibraryView {
  /** @param {HTMLElement} rootElement */
  constructor(rootElement) {
    this.rootElement = rootElement;
    this.render();
  }

  render() {
    const panel = createElement('div', { className: 'media-panel' });

    const toolbar = createElement('div', { className: 'media-panel__toolbar' });
    toolbar.append(
      createButton('+ Add media', { variant: 'primary', block: true, id: 'btn-add-media' }),
      createElement('input', {
        attrs: { id: 'media-file-input', type: 'file', accept: 'video/*,image/*', multiple: true, hidden: true },
      })
    );

    const dropzone = createElement('div', {
      className: 'media-panel__dropzone',
      attrs: { id: 'media-dropzone' },
      text: 'Drag & drop video, image or logo files here',
    });

    const grid = createElement('div', { className: 'media-panel__grid', attrs: { id: 'media-grid' } });
    grid.append(createElement('div', { className: 'asset-card asset-card--empty', text: 'No media imported yet' }));

    panel.append(toolbar, dropzone, grid);
    this.rootElement.append(panel);
  }
}
