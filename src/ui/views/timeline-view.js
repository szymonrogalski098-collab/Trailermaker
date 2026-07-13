import { EFFECT_TYPES, MAX_DURATION_SECONDS } from '../../config.js';
import { eventBus } from '../../core/event-bus.js';
import { MEDIA_SELECTED, PREVIEW_TICK, PROJECT_CHANGED, PROJECT_LOADED, TIMELINE_UPDATED } from '../../core/events.js';
import { getMedia } from '../../modules/media-manager/media-manager.js';
import { getActiveProject } from '../../modules/project-manager/project-manager.js';
import { addClip, addEffect, addTextOverlay, getClips, getTotalDuration, removeClip } from '../../modules/timeline-engine/timeline-engine.js';
import { clearElement, createElement } from '../dom-utils.js';
import { createButton } from '../components/button.js';

const DEFAULT_CLIP_SECONDS = 3;
const MIN_PX_PER_SECOND = 15;
const MAX_PX_PER_SECOND = 120;

/**
 * @param {number} seconds
 * @returns {string}
 */
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Timeline panel (bottom section): toolbar, time ruler, single track with
 * clip blocks, playhead — wired to TimelineEngine.
 */
export class TimelineView {
  /** @param {HTMLElement} rootElement */
  constructor(rootElement) {
    this.rootElement = rootElement;
    this.selectedMediaId = null;
    this.pxPerSecond = 40;

    /** @type {HTMLElement} */
    this.trackEl = null;
    /** @type {HTMLElement} */
    this.playheadEl = null;
    /** @type {HTMLElement} */
    this.durationEl = null;

    this.render();
    this.refresh();

    eventBus.on(MEDIA_SELECTED, (id) => {
      this.selectedMediaId = id;
    });
    eventBus.on(TIMELINE_UPDATED, () => this.refresh());
    eventBus.on(PROJECT_CHANGED, () => this.refresh());
    eventBus.on(PROJECT_LOADED, () => this.refresh());
    eventBus.on(PREVIEW_TICK, (t) => this._updatePlayhead(t));
  }

  render() {
    const timeline = createElement('div', { className: 'timeline' });
    timeline.append(this._toolbar(), this._ruler(), this._trackArea());
    this.rootElement.append(timeline);
  }

  refresh() {
    let clips = [];
    try {
      clips = getClips();
    } catch {
      clips = [];
    }
    this._renderTrack(clips);
    this._updateDuration(clips);
  }

  /** @returns {HTMLElement} */
  _toolbar() {
    const toolbar = createElement('div', { className: 'timeline__toolbar' });

    const addClipBtn = createButton('+ Clip', { size: 'sm', id: 'btn-add-clip' });
    addClipBtn.addEventListener('click', () => this._addClip());

    const addTextBtn = createButton('+ Text', { size: 'sm', id: 'btn-add-text' });
    addTextBtn.addEventListener('click', () => this._addText());

    const addEffectBtn = createButton('+ Effect', { size: 'sm', id: 'btn-add-effect' });
    addEffectBtn.addEventListener('click', () => this._addEffect());

    this.durationEl = createElement('div', { className: 'timeline__duration', text: `00:00 / 00:${MAX_DURATION_SECONDS}` });

    const zoomOutBtn = createButton('−', { size: 'sm', id: 'btn-zoom-out' });
    zoomOutBtn.addEventListener('click', () => this._zoom(-10));
    const zoomInBtn = createButton('+', { size: 'sm', id: 'btn-zoom-in' });
    zoomInBtn.addEventListener('click', () => this._zoom(10));
    const zoomGroup = createElement('div', { className: 'timeline__zoom' });
    zoomGroup.append(zoomOutBtn, zoomInBtn);

    toolbar.append(addClipBtn, addTextBtn, addEffectBtn, this.durationEl, zoomGroup);
    return toolbar;
  }

  /** @returns {HTMLElement} */
  _ruler() {
    const ruler = createElement('div', { className: 'timeline__ruler', attrs: { id: 'timeline-ruler' } });
    for (let second = 0; second < MAX_DURATION_SECONDS; second++) {
      ruler.append(createElement('span', { className: 'timeline__ruler-tick', text: `${second}s` }));
    }
    return ruler;
  }

  /** @returns {HTMLElement} */
  _trackArea() {
    const trackArea = createElement('div', { className: 'timeline__track-area' });
    this.playheadEl = createElement('div', { className: 'timeline__playhead', attrs: { id: 'timeline-playhead' } });
    this.trackEl = createElement('div', { className: 'timeline__track', attrs: { id: 'timeline-track' } });
    trackArea.append(this.playheadEl, this.trackEl);
    return trackArea;
  }

  /** @param {import('../../core/types.js').Clip[]} clips */
  _renderTrack(clips) {
    clearElement(this.trackEl);

    if (clips.length === 0) {
      this.trackEl.append(
        createElement('div', {
          className: 'timeline__empty',
          text: 'No clips yet — select media on the left, then click + Clip',
        })
      );
      return;
    }

    clips.forEach((clip) => this.trackEl.append(this._clipBlock(clip)));
  }

  /**
   * @param {import('../../core/types.js').Clip} clip
   * @returns {HTMLElement}
   */
  _clipBlock(clip) {
    const width = Math.max(40, (clip.end - clip.start) * this.pxPerSecond);
    const block = createElement('div', {
      className: 'clip-block',
      attrs: { style: `width:${width}px`, 'data-clip-id': clip.id },
    });

    const label = createElement('span', { className: 'clip-block__label', text: `${(clip.end - clip.start).toFixed(1)}s` });
    getMedia(clip.mediaId).then((asset) => {
      if (asset) label.textContent = asset.name;
    });

    block.append(createElement('span', { className: 'clip-block__handle clip-block__handle--start' }), label);

    if (clip.effects[0]) {
      block.append(createElement('span', { className: 'clip-block__badge', text: `✦ ${clip.effects[0].type}` }));
    }

    const deleteBtn = createElement('button', {
      className: 'clip-block__delete',
      text: '×',
      attrs: { type: 'button', title: 'Remove clip' },
    });
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeClip(clip.id);
    });
    block.append(deleteBtn, createElement('span', { className: 'clip-block__handle clip-block__handle--end' }));

    return block;
  }

  /** @param {import('../../core/types.js').Clip[]} clips */
  _updateDuration(clips) {
    const project = getActiveProject();
    const cap = project?.duration ?? MAX_DURATION_SECONDS;
    const occupied = clips.length ? getTotalDuration() : 0;
    this.durationEl.textContent = `${formatTime(occupied)} / ${formatTime(cap)}`;
  }

  /** @param {number} t */
  _updatePlayhead(t) {
    if (this.playheadEl) this.playheadEl.style.left = `${t * this.pxPerSecond}px`;
  }

  /** @param {number} delta */
  _zoom(delta) {
    this.pxPerSecond = Math.min(MAX_PX_PER_SECOND, Math.max(MIN_PX_PER_SECOND, this.pxPerSecond + delta));
    this.refresh();
  }

  _addClip() {
    if (!this.selectedMediaId) {
      alert('Select a media asset first (Media panel on the left).');
      return;
    }
    const project = getActiveProject();
    const cap = project?.duration ?? MAX_DURATION_SECONDS;
    let clips = [];
    try {
      clips = getClips();
    } catch {
      clips = [];
    }
    const start = clips.length ? getTotalDuration() : 0;
    if (start >= cap) {
      alert(`Timeline is full (${cap}s max).`);
      return;
    }
    addClip(this.selectedMediaId, start, Math.min(start + DEFAULT_CLIP_SECONDS, cap));
  }

  _addText() {
    let clips = [];
    try {
      clips = getClips();
    } catch {
      clips = [];
    }
    if (clips.length === 0) {
      alert('Add a clip first.');
      return;
    }
    const text = prompt('Overlay text:');
    if (!text) return;
    const lastClip = clips[clips.length - 1];
    addTextOverlay(lastClip.id, {
      id: crypto.randomUUID(),
      text,
      start: 0,
      end: lastClip.end - lastClip.start,
    });
  }

  _addEffect() {
    let clips = [];
    try {
      clips = getClips();
    } catch {
      clips = [];
    }
    if (clips.length === 0) {
      alert('Add a clip first.');
      return;
    }
    const type = prompt(`Effect type (${EFFECT_TYPES.join(', ')}):`);
    if (!type) return;
    if (!EFFECT_TYPES.includes(type)) {
      alert(`Unknown effect type. Choose one of: ${EFFECT_TYPES.join(', ')}`);
      return;
    }
    const lastClip = clips[clips.length - 1];
    addEffect(lastClip.id, { type, params: {} });
  }
}
