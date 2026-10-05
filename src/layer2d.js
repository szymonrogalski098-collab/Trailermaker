// LayerView2D: renders one Y layer (plus dimmed ghost of the layer below) on a Canvas 2D.
import { BLOCKS, ID, S } from './blocks.js';
import { drawBlock } from './icons.js';
import { dustShape } from './power.js';

export class LayerView2D {
  constructor(canvas, world, handlers) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.world = world; this.h = handlers;
    this.y = 0; this.zoom = 1; this.panX = 0; this.panY = 0; this.dirty = true;
    this.preview = null; this.selection = null; this.pastePreview = null; this.debug = false; this.warn = false;
    this.dpr = 1;
  }
  setWorld(w) { this.world = w; this.fit(); }
  get base() { return Math.min(this.cssW / this.world.sx, this.cssH / this.world.sz); }
  get cell() { return this.base * this.zoom; }

  resize() {
    const r = this.canvas.getBoundingClientRect(); this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cssW = r.width; this.cssH = r.height;
    this.canvas.width = Math.max(1, Math.round(r.width * this.dpr)); this.canvas.height = Math.max(1, Math.round(r.height * this.dpr));
    this.dirty = true;
  }
  fit() {
    this.resize(); this.zoom = 1;
    this.panX = (this.cssW - this.world.sx * this.cell) / 2; this.panY = (this.cssH - this.world.sz * this.cell) / 2;
    this.dirty = true;
  }
  invalidate() { this.dirty = true; }

  cellAt(px, py) {
    const x = Math.floor((px - this.panX) / this.cell); const z = Math.floor((py - this.panY) / this.cell);
    return this.world.inBounds(x, this.y, z) ? { x, y: this.y, z } : null;
  }
  zoomAt(factor, cx, cy) {
    const nz = Math.min(8, Math.max(0.5, this.zoom * factor)); const k = nz / this.zoom;
    this.panX = cx - (cx - this.panX) * k; this.panY = cy - (cy - this.panY) * k; this.zoom = nz; this.dirty = true;
  }
  panBy(dx, dy) { this.panX += dx; this.panY += dy; this.dirty = true; }

  render(tick = 0) {
    if (!this.dirty) return; this.dirty = false;
    const { ctx, world } = this; const s = this.cell;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#0f1115'; ctx.fillRect(0, 0, this.cssW, this.cssH);
    ctx.fillStyle = '#171a20'; ctx.fillRect(this.panX, this.panY, world.sx * s, world.sz * s);
    const x0 = Math.max(0, Math.floor(-this.panX / s)); const x1 = Math.min(world.sx - 1, Math.floor((this.cssW - this.panX) / s));
    const z0 = Math.max(0, Math.floor(-this.panY / s)); const z1 = Math.min(world.sz - 1, Math.floor((this.cssH - this.panY) / s));
    if (this.y > 0) this.drawLayer(this.y - 1, x0, x1, z0, z1, s, 0.28);
    this.drawGrid(x0, x1, z0, z1, s);
    this.drawLayer(this.y, x0, x1, z0, z1, s, 1);
    this.drawOverlays(s);
  }

  drawLayer(y, x0, x1, z0, z1, s, alpha) {
    const { ctx, world } = this; ctx.globalAlpha = alpha;
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      const i = world.index(x, y, z); const id = world.ids[i]; if (!id) continue;
      const st = world.states[i]; const px = this.panX + x * s; const py = this.panY + z * s;
      drawBlock(ctx, id, st, px, py, s, id === ID.REDSTONE_DUST && alpha === 1 ? dustShape(world, i) : null);
      if (this.debug && alpha === 1 && id === ID.REDSTONE_DUST && s > 14) {
        ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(s * 0.38)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#000'; ctx.lineWidth = 3; const t = String(S.power(st)); ctx.strokeText(t, px + s / 2, py + s / 2); ctx.fillText(t, px + s / 2, py + s / 2);
      }
    }
    ctx.globalAlpha = 1;
  }
  drawGrid(x0, x1, z0, z1, s) {
    const { ctx } = this; ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = x0; x <= x1 + 1; x++) { const px = Math.round(this.panX + x * s) + 0.5; ctx.moveTo(px, this.panY + z0 * s); ctx.lineTo(px, this.panY + (z1 + 1) * s); }
    for (let z = z0; z <= z1 + 1; z++) { const py = Math.round(this.panY + z * s) + 0.5; ctx.moveTo(this.panX + x0 * s, py); ctx.lineTo(this.panX + (x1 + 1) * s, py); }
    ctx.stroke();
  }
  drawOverlays(s) {
    const { ctx } = this;
    if (this.selection) {
      const r = this.selection; if (this.y >= r.y0 && this.y <= r.y1 || r.pending) {
        ctx.fillStyle = 'rgba(80,160,255,.22)'; ctx.strokeStyle = '#58a6ff'; ctx.lineWidth = 2;
        const px = this.panX + r.x0 * s; const py = this.panY + r.z0 * s; const w = (r.x1 - r.x0 + 1) * s; const h = (r.z1 - r.z0 + 1) * s;
        ctx.fillRect(px, py, w, h); ctx.strokeRect(px, py, w, h);
      }
    }
    if (this.pastePreview) this.drawPaste(s);
    if (this.preview) this.drawPreview(s);
    if (this.warn) { ctx.fillStyle = 'rgba(255,60,40,.9)'; ctx.fillRect(0, 0, this.cssW, 24); ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(this.warn, this.cssW / 2, 12); }
  }
  drawPreview(s) {
    const { ctx } = this; const p = this.preview; const px = this.panX + p.x * s; const py = this.panY + p.z * s;
    if (p.id) { ctx.globalAlpha = 0.65; drawBlock(ctx, p.id, p.state, px, py, s); ctx.globalAlpha = 1; }
    ctx.strokeStyle = p.remove ? '#ff5a4a' : '#7ee787'; ctx.lineWidth = 2; ctx.strokeRect(px + 1, py + 1, s - 2, s - 2);
    if (p.remove) { ctx.fillStyle = 'rgba(255,90,74,.25)'; ctx.fillRect(px, py, s, s); }
  }
  drawPaste(s) {
    const { ctx } = this; const pp = this.pastePreview; ctx.globalAlpha = 0.5;
    for (const [dx, dy, dz, id, st] of pp.clip.cells) {
      if (pp.y + dy !== this.y || !id) continue;
      drawBlock(ctx, id, st, this.panX + (pp.x + dx) * s, this.panY + (pp.z + dz) * s, s);
    }
    ctx.globalAlpha = 1; ctx.strokeStyle = '#58a6ff'; ctx.setLineDash([6, 4]);
    ctx.strokeRect(this.panX + pp.x * s, this.panY + pp.z * s, pp.clip.size[0] * s, pp.clip.size[2] * s); ctx.setLineDash([]);
  }
}
