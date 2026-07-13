import { eventBus } from '../../core/event-bus.js';
import { MEDIA_DELETED, MEDIA_IMPORTED, MEDIA_SELECTED } from '../../core/events.js';
import { createLogger } from '../../core/logger.js';
import { deleteMedia, getObjectURL, importMedia, listMedia } from '../../modules/media-manager/media-manager.js';
import { getActiveProject, setActiveProject } from '../../modules/project-manager/project-manager.js';
import { clearElement, createElement } from '../dom-utils.js';
import { createButton } from '../components/button.js';

const log = createLogger('MediaLibraryView');

/**
 * Media panel (left sidebar tab): import controls + media grid, wired to
 * MediaManager. Clicking a card selects it (emits MEDIA_SELECTED) so the
 * timeline's "+ Clip" action knows which asset to place.
 */
export class MediaLibraryView {
  /** @param {HTMLElement} rootElement */
  constructor(rootElement) {
    this.rootElement = rootElement;
    this.selectedMediaId = null;
    this.gridEl = null;

    this.render();
    this.refresh();

    eventBus.on(MEDIA_IMPORTED, () => this.refresh());
    eventBus.on(MEDIA_DELETED, () => this.refresh());
  }

  render() {
    const panel = createElement('div', { className: 'media-panel' });

    const fileInput = /** @type {HTMLInputElement} */ (
      createElement('input', {
        attrs: { id: 'media-file-input', type: 'file', accept: 'video/*,image/*', multiple: true, hidden: true },
      })
    );
    fileInput.addEventListener('change', () => this._importFiles(fileInput.files));

    const addBtn = createButton('+ Add media', { variant: 'primary', block: true, id: 'btn-add-media' });
    addBtn.addEventListener('click', () => fileInput.click());

    const toolbar = createElement('div', { className: 'media-panel__toolbar' });
    toolbar.append(addBtn, fileInput);

    const dropzone = createElement('div', {
      className: 'media-panel__dropzone',
      attrs: { id: 'media-dropzone' },
      text: 'Drag & drop video, image or logo files here',
    });
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('is-dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('is-dragover');
      this._importFiles(e.dataTransfer?.files);
    });

    this.gridEl = createElement('div', { className: 'media-panel__grid', attrs: { id: 'media-grid' } });

    panel.append(toolbar, dropzone, this.gridEl);
    this.rootElement.append(panel);
  }

  /**
   * @param {FileList|null|undefined} files
   */
  async _importFiles(files) {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      try {
        await importMedia(file, type);
      } catch (error) {
        log.error('Failed to import', file.name, error);
      }
    }
  }

  async refresh() {
    const assets = await listMedia();
    this._renderGrid(assets);
  }

  /** @param {import('../../core/types.js').MediaAsset[]} assets */
  _renderGrid(assets) {
    clearElement(this.gridEl);

    if (assets.length === 0) {
      this.gridEl.append(createElement('div', { className: 'asset-card asset-card--empty', text: 'No media imported yet' }));
      return;
    }

    assets.forEach((asset) => this.gridEl.append(this._assetCard(asset)));
  }

  /**
   * @param {import('../../core/types.js').MediaAsset} asset
   * @returns {HTMLElement}
   */
  _assetCard(asset) {
    const isSelected = asset.id === this.selectedMediaId;
    const card = createElement('div', {
      className: `asset-card${isSelected ? ' is-selected' : ''}`,
      attrs: { 'data-media-id': asset.id },
    });

    const thumb = createElement('div', { className: 'asset-card__thumb' });
    thumb.append(this._thumbMedia(asset));

    const deleteBtn = createElement('button', {
      className: 'asset-card__delete',
      text: '×',
      attrs: { type: 'button', title: 'Delete' },
    });
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteMedia(asset.id);
    });
    thumb.append(deleteBtn);

    const meta = createElement('div', { className: 'asset-card__meta', text: this._metaText(asset) });
    const name = createElement('div', { className: 'asset-card__name', text: asset.name, attrs: { title: asset.name } });

    card.append(thumb, name, meta);

    if (asset.type !== 'video') {
      card.append(this._logoTagRow(asset));
    }

    card.addEventListener('click', () => {
      this.selectedMediaId = asset.id;
      this.gridEl.querySelectorAll('.asset-card').forEach((el) => el.classList.remove('is-selected'));
      card.classList.add('is-selected');
      eventBus.emit(MEDIA_SELECTED, asset.id);
    });

    return card;
  }

  /**
   * @param {import('../../core/types.js').MediaAsset} asset
   * @returns {HTMLElement}
   */
  _thumbMedia(asset) {
    if (asset.type === 'video') {
      const video = /** @type {HTMLVideoElement} */ (
        createElement('video', { attrs: { muted: true, playsinline: true, preload: 'metadata' } })
      );
      video.src = getObjectURL(asset);
      video.addEventListener('loadedmetadata', () => {
        video.currentTime = Math.min(0.1, video.duration || 0);
      });
      return video;
    }

    const img = /** @type {HTMLImageElement} */ (createElement('img', { attrs: { alt: asset.name } }));
    img.src = getObjectURL(asset);
    return img;
  }

  /**
   * @param {import('../../core/types.js').MediaAsset} asset
   * @returns {string}
   */
  _metaText(asset) {
    if (asset.type === 'video' && asset.duration) return `${asset.duration.toFixed(1)}s`;
    if (asset.dimensions) return `${asset.dimensions.width}×${asset.dimensions.height}`;
    return asset.type;
  }

  /**
   * Buttons to tag an imported image as the game logo or studio logo used
   * in the outro (Outro.gameLogoMediaId / studioLogoMediaId).
   * @param {import('../../core/types.js').MediaAsset} asset
   * @returns {HTMLElement}
   */
  _logoTagRow(asset) {
    const row = createElement('div', { className: 'asset-card__logo-tags' });
    const gameBtn = createButton('Game logo', { size: 'sm', id: `btn-set-game-logo-${asset.id}` });
    const studioBtn = createButton('Studio logo', { size: 'sm', id: `btn-set-studio-logo-${asset.id}` });

    gameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._setOutroLogo('gameLogoMediaId', asset.id);
    });
    studioBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._setOutroLogo('studioLogoMediaId', asset.id);
    });

    row.append(gameBtn, studioBtn);
    return row;
  }

  /**
   * @param {'gameLogoMediaId'|'studioLogoMediaId'} field
   * @param {string} mediaId
   */
  _setOutroLogo(field, mediaId) {
    const project = getActiveProject();
    if (!project) return;
    project.outro[field] = mediaId;
    setActiveProject(project);
    log.info(`Set ${field}`, mediaId);
  }
}
