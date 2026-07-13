import { createElement } from '../dom-utils.js';
import { createButton } from '../components/button.js';

const STAGE_LABELS = {
  'loading-media': 'Loading media',
  'loading-ffmpeg': 'Loading FFmpeg',
  rendering: 'Rendering frames',
  encoding: 'Encoding video',
  done: 'Done',
};

/**
 * Export overlay: progress bar, status text, and a download link once the
 * MP4 Blob is ready. Mounted once by EditorView and shown/hidden around an
 * ExportEngine.exportProject() call.
 */
export class ExportView {
  /** @param {HTMLElement} rootElement */
  constructor(rootElement) {
    this.rootElement = rootElement;
    this.render();
  }

  render() {
    const overlay = createElement('div', { className: 'export-overlay', attrs: { id: 'export-overlay', hidden: true } });
    const panel = createElement('div', { className: 'export-panel' });

    this.statusEl = createElement('div', { className: 'export-panel__status', text: 'Preparing export…' });

    const progressTrack = createElement('div', { className: 'export-panel__progress-track' });
    this.progressFillEl = createElement('div', { className: 'export-panel__progress-fill' });
    progressTrack.append(this.progressFillEl);

    this.downloadLink = /** @type {HTMLAnchorElement} */ (
      createElement('a', {
        className: 'btn btn--primary btn--block',
        text: 'Download MP4',
        attrs: { id: 'export-download-link', hidden: true },
      })
    );

    const closeBtn = createButton('Close', { size: 'sm', block: true, id: 'btn-export-close' });
    closeBtn.addEventListener('click', () => this.hide());

    panel.append(
      createElement('h3', { className: 'export-panel__title', text: 'Export MP4' }),
      this.statusEl,
      progressTrack,
      this.downloadLink,
      closeBtn
    );
    overlay.append(panel);

    this.overlayEl = overlay;
    this.rootElement.append(overlay);
  }

  show() {
    this.statusEl.textContent = 'Preparing export…';
    this.progressFillEl.style.width = '0%';
    this._revokeDownloadUrl();
    this.downloadLink.hidden = true;
    this.overlayEl.hidden = false;
  }

  hide() {
    this.overlayEl.hidden = true;
  }

  /**
   * @param {{ratio: number, stage: string}} progress
   */
  setProgress({ ratio, stage }) {
    const percent = Math.round(ratio * 100);
    this.progressFillEl.style.width = `${percent}%`;
    this.statusEl.textContent = `${STAGE_LABELS[stage] || stage}… ${percent}%`;
  }

  /**
   * @param {Blob} blob
   * @param {string} filename
   */
  setComplete(blob, filename) {
    this._revokeDownloadUrl();
    const url = URL.createObjectURL(blob);
    this.downloadLink.href = url;
    this.downloadLink.setAttribute('download', filename);
    this.downloadLink.hidden = false;
    this.statusEl.textContent = 'Export complete.';
    this.progressFillEl.style.width = '100%';
  }

  /** @param {string} message */
  setError(message) {
    this.statusEl.textContent = `Export failed: ${message}`;
  }

  _revokeDownloadUrl() {
    if (this.downloadLink.href) URL.revokeObjectURL(this.downloadLink.href);
  }
}
