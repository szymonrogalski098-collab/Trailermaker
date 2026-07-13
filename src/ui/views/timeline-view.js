import { MAX_DURATION_SECONDS } from '../../config.js';
import { createElement } from '../dom-utils.js';
import { createButton } from '../components/button.js';

/**
 * Example static clip blocks shown before real timeline data exists.
 * Widths are illustrative only. ETAP 3 replaces this with clips rendered
 * from TimelineEngine.getClips().
 */
const EXAMPLE_CLIPS = [
  { label: 'Clip 1', width: 160, badge: '✦ zoom' },
  { label: 'Clip 2', width: 220, badge: '✦ glitch' },
  { label: 'Clip 3', width: 140, badge: '✦ pan' },
];

/**
 * Timeline panel (bottom section): toolbar, time ruler, single track with
 * clip blocks, playhead. Static markup in ETAP 2 — binding to
 * TimelineEngine (add/reorder/trim, drag interactions) lands in ETAP 3.
 */
export class TimelineView {
  /** @param {HTMLElement} rootElement */
  constructor(rootElement) {
    this.rootElement = rootElement;
    this.render();
  }

  render() {
    const timeline = createElement('div', { className: 'timeline' });

    timeline.append(this._toolbar(), this._ruler(), this._trackArea());
    this.rootElement.append(timeline);
  }

  /** @returns {HTMLElement} */
  _toolbar() {
    const toolbar = createElement('div', { className: 'timeline__toolbar' });
    const zoomGroup = createElement('div', { className: 'timeline__zoom' });
    zoomGroup.append(
      createButton('−', { variant: 'secondary', size: 'sm', id: 'btn-zoom-out' }),
      createButton('+', { variant: 'secondary', size: 'sm', id: 'btn-zoom-in' })
    );

    toolbar.append(
      createButton('+ Clip', { size: 'sm', id: 'btn-add-clip' }),
      createButton('+ Text', { size: 'sm', id: 'btn-add-text' }),
      createButton('+ Effect', { size: 'sm', id: 'btn-add-effect' }),
      createElement('div', { className: 'timeline__duration', text: `00:00 / 00:${MAX_DURATION_SECONDS}` }),
      zoomGroup
    );
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
    const playhead = createElement('div', { className: 'timeline__playhead', attrs: { id: 'timeline-playhead' } });
    const track = createElement('div', { className: 'timeline__track', attrs: { id: 'timeline-track' } });

    EXAMPLE_CLIPS.forEach((clip) => track.append(this._clipBlock(clip)));

    trackArea.append(playhead, track);
    return trackArea;
  }

  /**
   * @param {{label: string, width: number, badge: string}} clip
   * @returns {HTMLElement}
   */
  _clipBlock(clip) {
    const block = createElement('div', {
      className: 'clip-block',
      attrs: { style: `width:${clip.width}px` },
    });
    block.append(
      createElement('span', { className: 'clip-block__handle clip-block__handle--start' }),
      createElement('span', { className: 'clip-block__label', text: clip.label }),
      createElement('span', { className: 'clip-block__badge', text: clip.badge, attrs: { title: clip.badge } }),
      createElement('span', { className: 'clip-block__handle clip-block__handle--end' })
    );
    return block;
  }
}
