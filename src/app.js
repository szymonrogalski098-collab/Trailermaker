// App controller: wires World/Engine/Editor/Views/UI together. Keeps no game rules itself.
import { BLOCKS, ID, DIR, FACE } from './blocks.js';
import { World } from './world.js';
import { RedstoneEngine } from './engine.js';
import { Editor, placementState, facingCycle } from './editor.js';
import { LayerView2D } from './layer2d.js';
import { View3D, has3D } from './view3d.js';
import { Gestures } from './gestures.js';
import { Storage, exportToFile, importFromFile } from './storage.js';
import { t, setLang, blockName, getLang } from './i18n.js';
import { $, el, toast, hint, openSheet, closeSheet, initSheet, togglePalette, buildPalette, updateSelectedChip, showSelbar } from './ui.js';

const DEFAULTS = { size: 32, speed: 1, view: '2d', layer: 0, lang: 'pl', debug: false, slice: false, block: ID.REDSTONE_DUST };
const SPEEDS = [0.25, 1, 2, 4]; const TPS = 20; const MAX_TICKS_PER_FRAME = 40;
const dirFromNormal = (nx, ny, nz) => (nx < 0 ? DIR.W : nx > 0 ? DIR.E : ny < 0 ? DIR.D : ny > 0 ? DIR.U : nz < 0 ? DIR.N : DIR.S);

class App {
  constructor() {
    this.settings = { ...DEFAULTS, ...Storage.loadSettings() };
    setLang(this.settings.lang);
    this.mode = 'place'; this.tab = 'redstone'; this.sel = { id: this.settings.block, variant: 0 };
    this.running = false; this.acc = 0; this.lastT = 0; this.fps = 0; this.frames = 0; this.fpsT = 0;
    this.view = this.settings.view; this.layer = this.settings.layer; this.pending = null; this.selA = null; this.region = null;
    this.saveTimer = 0; this.v3 = null;
    const saved = Storage.loadAutosave();
    this.attachWorld(saved ? saved.world : new World(this.settings.size, this.settings.size, this.settings.size));
    this.v2 = new LayerView2D($('c2d'), this.world, {});
    this.gestures2d = new Gestures($('c2d'), this.handlers2D());
    this.bindUI(); this.applyI18n(); this.syncView(); this.fitViews(); requestAnimationFrame((n) => this.frame(n));
  }

  // ---------- world lifecycle ----------
  attachWorld(world) {
    this.world = world; this.engine = new RedstoneEngine(world);
    this.engine.settle();
    if (this.editor) this.editor.setEngine(this.engine); else this.editor = new Editor(this.engine);
    world.onChange(() => { this.scheduleSave(); if (this.v2) this.v2.invalidate(); });
    this.layer = Math.min(this.layer, world.sy - 1);
    this.region = null; this.selA = null;
  }
  replaceWorld(world) {
    this.running = false; this.acc = 0; this.attachWorld(world);
    this.v2.setWorld(world); this.v2.selection = null; this.v3?.setWorld(world);
    this.syncView(); this.syncLayer(); this.updateAll(); this.scheduleSave();
  }
  scheduleSave() {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => Storage.saveAutosave(this.world), 1200);
  }
  saveSettings() {
    Object.assign(this.settings, { speed: this.speed ?? this.settings.speed, view: this.view, layer: this.layer, block: this.sel.id, size: this.world.sx });
    Storage.saveSettings(this.settings);
  }

  // ---------- selected block / variants ----------
  variants() {
    const b = BLOCKS[this.sel.id];
    if (b.attachable) return [{ face: FACE.FLOOR, facing: DIR.N }, ...[DIR.N, DIR.E, DIR.S, DIR.W].map((f) => ({ face: FACE.WALL, facing: f }))];
    if (b.rotatable || b.sixway) return facingCycle(b).map((f) => ({ face: FACE.FLOOR, facing: f }));
    return [{ face: FACE.FLOOR, facing: DIR.N }];
  }
  variant() { const l = this.variants(); return l[this.sel.variant % l.length]; }
  selectBlock(id) { this.sel = { id, variant: 0 }; updateSelectedChip(this); this.saveSettings(); }
  rotate() { this.sel.variant++; updateSelectedChip(this); }

  // ---------- modes ----------
  setMode(mode) {
    this.mode = mode; this.pending = null; this.v2.preview = null; this.v2.pastePreview = null; this.v3?.setCursor(null);
    if (mode !== 'select' && mode !== 'paste') { this.region = null; this.selA = null; this.v2.selection = null; this.v3?.setSelection(null); showSelbar([]); hint(''); }
    else if (mode === 'select') { hint(t('select_hint_a')); this.refreshSelbar(); }
    document.querySelectorAll('.mode').forEach((b) => b.classList.toggle('active', b.dataset.mode === (mode === 'paste' ? 'select' : mode)));
    this.v2.invalidate();
  }

  // ---------- actions ----------
  commit(target) {
    const { cell, hit } = target; if (!cell) return;
    switch (this.mode) {
      case 'place': this.placeAt(cell, hit); break;
      case 'remove': this.editor.remove(cell.x, cell.y, cell.z); break;
      case 'interact': this.editor.interact(cell.x, cell.y, cell.z); break;
      case 'select': this.selectTap(cell); break;
      case 'paste': this.editor.paste(cell.x, cell.y, cell.z); break;
      default: break;
    }
    this.updateAll();
  }
  placeSpec(hit) {
    const b = BLOCKS[this.sel.id]; let v = this.variant();
    if (hit && !hit.plane && b.attachable) {
      const n = dirFromNormal(hit.nx, hit.ny, hit.nz);
      if (n === DIR.U) v = { face: FACE.FLOOR, facing: DIR.N };
      else if (n === DIR.D) v = { face: FACE.CEILING, facing: DIR.N };
      else v = { face: FACE.WALL, facing: n };
    }
    return v;
  }
  placeAt(cell, hit) {
    const v = this.placeSpec(hit);
    this.editor.place(cell.x, cell.y, cell.z, this.sel.id, v.facing, v.face);
    if (this.world.getId(cell.x, cell.y, cell.z) !== this.sel.id) toast(t('no_support'));
  }
  longPress(target) {
    if (this.mode !== 'place' || !target.cell) return;
    const c = target.hitCell || target.cell;
    if (this.editor.rotateAt(c.x, c.y, c.z)) { navigator.vibrate?.(15); this.updateAll(); }
  }
  selectTap(cell) {
    if (!this.selA || this.region) { this.selA = cell; this.region = null; this.setRegion({ x0: cell.x, x1: cell.x, y0: cell.y, y1: cell.y, z0: cell.z, z1: cell.z, pending: true }); hint(t('select_hint_b')); showSelbar([]); return; }
    const r = this.editor.regionBounds([this.selA.x, this.selA.y, this.selA.z], [cell.x, cell.y, cell.z]);
    this.region = r; this.setRegion(r); this.selA = null; hint(t('select_ready')); this.refreshSelbar();
  }
  setRegion(r) { this.v2.selection = r; this.v3?.setSelection(r); this.v2.invalidate(); }
  refreshSelbar() {
    if (this.mode === 'paste') return showSelbar([[t('done'), () => this.setMode('select')]]);
    const btns = [];
    if (this.region && !this.region.pending) {
      const r = this.region; const a = [r.x0, r.y0, r.z0]; const b = [r.x1, r.y1, r.z1];
      btns.push([t('copy'), () => { this.editor.copy(a, b); toast(t('copied')); this.refreshSelbar(); }]);
      btns.push([t('cut'), () => { this.editor.cut(a, b); toast(t('copied')); this.refreshSelbar(); this.updateAll(); }]);
    }
    if (this.editor.clipboard) btns.push([t('paste'), () => { this.mode = 'paste'; hint(t('paste_hint')); this.refreshSelbar(); }]);
    if (btns.length) btns.push([t('cancel'), () => this.setMode('select')]);
    showSelbar(btns);
  }

  // ---------- 2D input ----------
  handlers2D() {
    const target = (pt) => { const c = this.v2.cellAt(pt.x, pt.y); return c ? { cell: c } : null; };
    return {
      onPress: (pt) => this.preview2D(target(pt)),
      onCommit: (pt) => { const tg = target(pt); this.v2.preview = null; this.v2.pastePreview = null; this.v2.invalidate(); if (tg) this.commit(tg); },
      onCancel: () => { this.v2.preview = null; this.v2.pastePreview = null; this.v2.invalidate(); },
      onLongPress: (pt) => { const tg = target(pt); if (tg) { this.v2.preview = null; this.longPress(tg); } },
      onDrag: (dx, dy) => this.v2.panBy(dx, dy),
      onPinch: (f, cx, cy) => this.v2.zoomAt(f, cx, cy),
      onPan: (dx, dy) => this.v2.panBy(dx, dy),
      oneFingerDrag: () => this.mode === 'interact',
    };
  }
  preview2D(tg) {
    this.v2.preview = null; this.v2.pastePreview = null;
    if (tg) {
      const { cell } = tg;
      if (this.mode === 'paste' && this.editor.clipboard) this.v2.pastePreview = { clip: this.editor.clipboard, x: cell.x, y: cell.y, z: cell.z };
      else if (this.mode === 'place') { const v = this.variant(); this.v2.preview = { x: cell.x, z: cell.z, id: this.sel.id, state: placementState(this.sel.id, v.facing, v.face) }; }
      else this.v2.preview = { x: cell.x, z: cell.z, remove: this.mode === 'remove' };
    }
    this.v2.invalidate();
  }

  // ---------- 3D input ----------
  target3D(pt) {
    const hit = this.v3.pick(pt.x, pt.y, this.layer); if (!hit) return null;
    const inb = (x, y, z) => this.world.inBounds(x, y, z);
    if (this.mode === 'place' || this.mode === 'paste') {
      const c = hit.plane ? { x: hit.x, y: hit.y, z: hit.z } : { x: hit.x + hit.nx, y: hit.y + hit.ny, z: hit.z + hit.nz };
      return inb(c.x, c.y, c.z) ? { cell: c, hit, hitCell: hit.plane ? null : { x: hit.x, y: hit.y, z: hit.z } } : null;
    }
    return hit.plane ? null : { cell: { x: hit.x, y: hit.y, z: hit.z }, hit };
  }
  handlers3D() {
    return {
      onPress: (pt) => { this.pending = this.target3D(pt); this.v3.setCursor(this.pending?.cell, this.mode === 'remove'); },
      onCommit: () => { const tg = this.pending; this.pending = null; this.v3.setCursor(null); if (tg) this.commit(tg); },
      onCancel: () => { this.pending = null; this.v3.setCursor(null); },
      onLongPress: () => { const tg = this.pending; this.pending = null; this.v3.setCursor(null); if (tg) this.longPress(tg); },
      onDrag: (dx, dy) => this.v3.orbit(dx, dy),
      onPinch: (f) => this.v3.zoom(f),
      onPan: (dx, dy) => this.v3.pan(dx, dy),
      oneFingerDrag: () => true,
    };
  }
  ensure3D() {
    if (this.v3) return true;
    if (!has3D()) { toast(t('no3d'), 3000); return false; }
    try { this.v3 = new View3D($('c3d'), this.world); } catch (err) { console.error(err); toast(t('no3d'), 3000); return false; }
    this.gestures3d = new Gestures($('c3d'), this.handlers3D());
    return true;
  }

  // ---------- views ----------
  syncView() {
    if (this.view === '3d' && !this.ensure3D()) this.view = '2d';
    $('c2d').hidden = this.view !== '2d'; $('c3d').hidden = this.view !== '3d';
    $('btn-view').textContent = this.view === '2d' ? t('view3d') : t('view2d');
    if (this.view === '3d') { this.v3.resize(); this.v3.setSlice(this.settings.slice ? this.layer : -1); this.v3.setLayerGrid(this.layer); this.v3.setSelection(this.region); }
    else { this.v2.resize(); this.v2.invalidate(); }
    this.pending = null; this.v2.preview = null;
  }
  fitViews() { this.v2.fit(); if (this.v3) this.v3.resize(); }
  syncLayer() {
    this.v2.y = this.layer; this.v2.invalidate(); $('layer-label').textContent = `Y ${this.layer}`;
    if (this.v3) { this.v3.setLayerGrid(this.layer); if (this.settings.slice) this.v3.setSlice(this.layer); }
    this.saveSettings();
  }
  setLayer(y) { this.layer = Math.max(0, Math.min(this.world.sy - 1, y)); this.syncLayer(); }

  // ---------- simulation ----------
  setRunning(on) { this.running = on; this.acc = 0; this.updateSimUI(); }
  stepOnce() { this.engine.step(); this.updateAll(); }
  frame(now) {
    const dt = Math.min(100, now - (this.lastT || now)); this.lastT = now;
    if (this.running) this.advance(dt);
    if (this.view === '2d') this.v2.render(); else if (this.v3) { this.v3.flush(); this.v3.render(); }
    this.countFps(now);
    requestAnimationFrame((n) => this.frame(n));
  }
  advance(dt) {
    this.acc += (dt / 1000) * TPS * (this.settings.speed || 1);
    let n = Math.min(MAX_TICKS_PER_FRAME, Math.floor(this.acc)); this.acc -= Math.floor(this.acc);
    while (n-- > 0) { this.engine.step(); if (this.engine.overflow) { this.setRunning(false); toast(t('overflow'), 4000); break; } }
    this.updateTickLabel();
  }
  countFps(now) {
    this.frames++;
    if (now - this.fpsT >= 500) { this.fps = Math.round((this.frames * 1000) / (now - this.fpsT)); this.frames = 0; this.fpsT = now; this.updateDebug(); }
  }

  // ---------- UI sync ----------
  updateTickLabel() { $('tick-label').textContent = `${t('ticks')} ${this.engine.time}`; }
  updateDebug() {
    $('debug').hidden = !this.settings.debug; if (!this.settings.debug) return;
    $('debug').textContent = `FPS ${this.fps}\n${t('ticks')} ${this.engine.time}\nupd ${this.engine.updates}${this.engine.overflow ? ' OVERFLOW' : ''}`;
  }
  updateSimUI() { $('btn-play').textContent = this.running ? t('pause') : t('play'); $('btn-play').classList.toggle('primary', !this.running); }
  updateAll() {
    this.updateTickLabel();
    $('btn-undo').disabled = !this.editor.history.canUndo; $('btn-redo').disabled = !this.editor.history.canRedo;
    this.v2.warn = this.engine.overflow ? t('overflow') : false; this.v2.invalidate();
  }
  applyI18n() {
    document.documentElement.lang = getLang(); document.title = t('app');
    document.querySelectorAll('.mode').forEach((b) => { b.textContent = t('mode_' + b.dataset.mode); });
    $('btn-rotate').textContent = t('rotate'); $('btn-step').textContent = t('step'); $('btn-slice').textContent = t('slice');
    $('btn-debug').textContent = t('debug'); $('btn-speed').textContent = `${this.settings.speed}x`;
    $('btn-view').textContent = this.view === '2d' ? t('view3d') : t('view2d');
    this.updateSimUI(); updateSelectedChip(this); this.updateAll(); this.syncLayer();
    $('btn-slice').setAttribute('aria-pressed', String(!!this.settings.slice)); $('btn-debug').setAttribute('aria-pressed', String(!!this.settings.debug));
    this.v2.debug = !!this.settings.debug; this.updateDebug();
  }

  // ---------- buttons ----------
  bindUI() {
    initSheet();
    document.querySelectorAll('.mode').forEach((b) => b.addEventListener('click', () => this.setMode(b.dataset.mode)));
    $('btn-play').addEventListener('click', () => this.setRunning(!this.running));
    $('btn-step').addEventListener('click', () => { this.setRunning(false); this.stepOnce(); });
    $('btn-speed').addEventListener('click', () => {
      const i = SPEEDS.indexOf(this.settings.speed); this.settings.speed = SPEEDS[(i + 1) % SPEEDS.length]; $('btn-speed').textContent = `${this.settings.speed}x`; this.saveSettings();
    });
    $('btn-view').addEventListener('click', () => { this.view = this.view === '2d' ? '3d' : '2d'; this.syncView(); this.saveSettings(); });
    $('btn-yup').addEventListener('click', () => this.setLayer(this.layer + 1));
    $('btn-ydown').addEventListener('click', () => this.setLayer(this.layer - 1));
    $('btn-slice').addEventListener('click', () => {
      this.settings.slice = !this.settings.slice; $('btn-slice').setAttribute('aria-pressed', String(this.settings.slice));
      this.v3?.setSlice(this.settings.slice ? this.layer : -1); this.saveSettings();
    });
    $('btn-debug').addEventListener('click', () => {
      this.settings.debug = !this.settings.debug; this.v2.debug = this.settings.debug; this.v2.invalidate();
      $('btn-debug').setAttribute('aria-pressed', String(this.settings.debug)); this.updateDebug(); this.saveSettings();
    });
    $('btn-fit').addEventListener('click', () => { if (this.view === '2d') this.v2.fit(); else this.v3?.resetCamera(); });
    $('btn-palette').addEventListener('click', () => togglePalette(this));
    $('btn-rotate').addEventListener('click', () => this.rotate());
    $('btn-undo').addEventListener('click', () => { this.editor.undo(); this.updateAll(); });
    $('btn-redo').addEventListener('click', () => { this.editor.redo(); this.updateAll(); });
    $('btn-menu').addEventListener('click', () => this.openMenu());
    $('file-input').addEventListener('change', (e) => this.onImport(e));
    new ResizeObserver(() => { this.v2.resize(); this.v3?.resize(); }).observe($('stage'));
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); this.installEvt = e; });
    window.addEventListener('pagehide', () => Storage.saveAutosave(this.world));
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }

  // ---------- menu & sheets ----------
  menuButton(label, fn) { return el('button', { class: 'btn', text: label, onclick: fn }); }
  openMenu() {
    const items = [
      this.menuButton(t('clear_layer'), () => { this.editor.clearLayer(this.layer); closeSheet(); this.updateAll(); }),
      this.menuButton(t('clear_all'), () => { this.editor.clearAll(); closeSheet(); this.updateAll(); }),
      this.menuButton(t('slots'), () => this.openSlots()),
      this.menuButton(t('export'), () => { exportToFile(this.world); closeSheet(); }),
      this.menuButton(t('import'), () => { closeSheet(); $('file-input').click(); }),
      this.menuButton(t('settings'), () => this.openSettings()),
    ];
    if (this.installEvt) items.push(this.menuButton(t('install'), () => { this.installEvt.prompt(); closeSheet(); }));
    openSheet(t('more'), el('div', { class: 'menu-list' }, items));
  }
  openSlots() {
    const wrap = el('div'); const name = el('input', { type: 'text', placeholder: t('slot_name'), maxlength: 40, value: '' });
    const list = el('div');
    const refresh = () => {
      list.replaceChildren(); const slots = Storage.listSlots();
      if (!slots.length) list.append(el('div', { class: 'err', text: t('empty') }));
      for (const s of slots) list.append(el('div', { class: 'slot' }, [
        el('span', { class: 'name', text: s.name }),
        el('button', { class: 'btn', text: t('load'), onclick: () => { try { this.replaceWorld(Storage.loadSlot(s.name).world); closeSheet(); toast(t('loaded')); } catch (err) { toast(err.message); } } }),
        el('button', { class: 'btn', text: t('delete'), onclick: () => { Storage.deleteSlot(s.name); refresh(); } }),
      ]));
    };
    wrap.append(el('div', { class: 'field' }, [name, el('button', { class: 'btn primary', text: t('save'), onclick: () => {
      const n = name.value.trim(); if (!n) return; Storage.saveSlot(n, this.world); toast(t('saved')); refresh();
    } })]), list);
    refresh(); openSheet(t('slots'), wrap);
  }
  openSettings() {
    const size = el('select', {}, [16, 24, 32, 48, 64].map((n) => el('option', { value: n, text: `${n} x ${n} x ${n}`, ...(n === this.world.sx ? { selected: '' } : {}) })));
    const lang = el('select', {}, [['pl', 'Polski'], ['en', 'English']].map(([v, l]) => el('option', { value: v, text: l, ...(v === getLang() ? { selected: '' } : {}) })));
    const body = el('div', {}, [
      el('div', { class: 'field' }, [el('label', { text: t('grid_size') }), size]),
      el('div', { class: 'field' }, [el('label', { text: t('language') }), lang]),
      this.menuButton(t('apply'), () => {
        const n = +size.value;
        if (n !== this.world.sx && !confirm(t('size_warn'))) return;
        this.settings.lang = lang.value; setLang(lang.value); this.applyI18n(); closeSheet();
        if (n !== this.world.sx) this.replaceWorld(new World(n, n, n));
        this.saveSettings();
      }),
    ]);
    openSheet(t('settings'), body);
  }
  async onImport(e) {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return;
    try { const { world } = await importFromFile(file); this.replaceWorld(world); toast(t('imported')); } catch (err) {
      openSheet(t('err_import'), el('div', { class: 'err', text: err.message }));
    }
  }
}

window.app = new App();
