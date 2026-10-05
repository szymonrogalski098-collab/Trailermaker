// UI helpers: DOM building for palette, sheets, toasts, selection bar.
import { BLOCKS, TABS, defaultState } from './blocks.js';
import { drawThumbnail } from './icons.js';
import { t, blockName } from './i18n.js';
import { placementState } from './editor.js';

export const $ = (id) => document.getElementById(id);
export function el(tag, props = {}, children = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c) n.append(c);
  return n;
}

let toastTimer = 0;
export function toast(msg, ms = 1800) {
  const n = $('toast'); n.textContent = msg; n.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { n.hidden = true; }, ms);
}
export function hint(msg) { const n = $('hint'); n.hidden = !msg; n.textContent = msg || ''; }

// ---- bottom sheet ----
export function openSheet(title, content) {
  $('sheet-title').textContent = title; const c = $('sheet-content'); c.replaceChildren(content); $('sheet').hidden = false;
}
export function closeSheet() { $('sheet').hidden = true; }
export function initSheet() {
  $('sheet-close').addEventListener('click', closeSheet);
  $('sheet').addEventListener('click', (e) => { if (e.target === $('sheet')) closeSheet(); });
}

// ---- palette ----
export function buildPalette(app) {
  const tabs = $('tabs'); tabs.replaceChildren();
  for (const tab of TABS) tabs.append(el('button', { class: 'btn' + (app.tab === tab ? ' active' : ''), text: t('tab_' + tab), onclick: () => { app.tab = tab; buildPalette(app); } }));
  const grid = $('blocks'); grid.replaceChildren();
  for (const b of BLOCKS.filter((x) => x.tab === app.tab)) {
    const cv = el('canvas', { width: 40, height: 40 }); drawThumbnail(cv, b.id, placementState(b.id, 4, 0));
    grid.append(el('button', { class: 'block' + (app.sel.id === b.id ? ' sel' : ''), onclick: () => { app.selectBlock(b.id); buildPalette(app); } }, [cv, el('span', { text: blockName(b) })]));
  }
}
export function togglePalette(app, force) {
  const d = $('drawer'); d.hidden = force === undefined ? !d.hidden : !force;
  if (!d.hidden) buildPalette(app);
}

export function updateSelectedChip(app) {
  const b = BLOCKS[app.sel.id]; const v = app.variant();
  drawThumbnail($('sel-thumb'), b.id, placementState(b.id, v.facing, v.face));
  $('sel-name').textContent = blockName(b);
}

// ---- selection action bar ----
export function showSelbar(buttons) {
  const bar = $('selbar'); bar.replaceChildren(...buttons.map(([label, fn]) => el('button', { class: 'btn', text: label, onclick: fn })));
  bar.hidden = !buttons.length;
}
