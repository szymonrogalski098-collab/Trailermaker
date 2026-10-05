// View3D: Three.js renderer. Chunked InstancedMesh pool (fixed capacity => no GPU buffer churn / leaks).
import { isFullCube } from './blocks.js';
import { blockParts } from './models.js';

const CHUNK = 8;
const CAP = [1536, 768, 512]; // instances per chunk for shaded / emissive / glass
const REBUILDS_PER_FRAME = 6;

export const has3D = () => typeof window !== 'undefined' && !!window.THREE;

export class View3D {
  constructor(canvas, world) {
    const T = window.THREE; this.T = T; this.canvas = canvas; this.world = world;
    this.renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x0f1115);
    this.scene = new T.Scene();
    this.camera = new T.PerspectiveCamera(50, 1, 0.1, 400);
    this.scene.add(new T.AmbientLight(0xffffff, 0.62));
    const sun = new T.DirectionalLight(0xffffff, 0.75); sun.position.set(0.6, 1, 0.4); this.scene.add(sun);
    this.geo = new T.BoxGeometry(1, 1, 1);
    this.mats = [
      new T.MeshLambertMaterial({ color: 0xffffff }),
      new T.MeshBasicMaterial({ color: 0xffffff }),
      new T.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false }),
    ];
    this.colors = new Map(); this.tmpM = new T.Matrix4(); this.tmpQ = new T.Quaternion(); this.tmpV = new T.Vector3();
    this.tmpS = new T.Vector3(); this.up = new T.Vector3(0, 1, 0); this.tmpD = new T.Vector3();
    this.chunks = new Map(); this.dirty = new Set(); this.slice = -1; this.needsRender = true; this.overCap = false;
    this.group = new T.Group(); this.scene.add(this.group);
    this.makeOverlay();
    this.target = new T.Vector3(); this.theta = Math.PI * 0.25; this.phi = 1.0; this.dist = 40;
    this.setWorld(world);
  }

  setWorld(world) {
    this.world = world;
    if (!this.pool) this.pool = [];
    for (const ch of this.chunks.values()) {
      this.group.remove(ch.group);
      for (const m of ch.meshes) if (m) m.count = 0;
      this.pool.push(ch); // meshes are reused, never re-allocated
    }
    this.chunks.clear(); this.dirty.clear();
    this.ncx = Math.ceil(world.sx / CHUNK); this.ncy = Math.ceil(world.sy / CHUNK); this.ncz = Math.ceil(world.sz / CHUNK);
    for (let i = 0; i < this.ncx * this.ncy * this.ncz; i++) this.dirty.add(i);
    world.onChange((i) => { if (this.world === world) this.markCell(i); });
    this.resetCamera(); this.needsRender = true;
  }
  resetCamera() {
    const w = this.world; this.target.set(w.sx / 2, Math.min(w.sy, 8) / 2, w.sz / 2);
    this.dist = Math.max(w.sx, w.sz) * 0.95; this.theta = Math.PI * 0.25; this.phi = 1.0; this.updateCamera();
  }

  makeOverlay() {
    const T = this.T;
    this.cursor = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(1.02, 1.02, 1.02)), new T.LineBasicMaterial({ color: 0x7ee787 }));
    this.cursorFill = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshBasicMaterial({ color: 0x7ee787, transparent: true, opacity: 0.3, depthWrite: false }));
    this.cursor.visible = this.cursorFill.visible = false; this.scene.add(this.cursor, this.cursorFill);
    this.selBox = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(1, 1, 1)), new T.LineBasicMaterial({ color: 0x58a6ff }));
    this.selBox.visible = false; this.scene.add(this.selBox);
    const grid = new T.GridHelper(64, 64, 0x2a3040, 0x1c202a); grid.position.y = 0.001; this.grid = grid; this.scene.add(grid);
  }

  // ---- sizing / camera ----
  resize() {
    const r = this.canvas.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr); this.renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false);
    this.camera.aspect = Math.max(1, r.width) / Math.max(1, r.height); this.camera.updateProjectionMatrix(); this.needsRender = true;
  }
  updateCamera() {
    const { theta, phi, dist, target } = this;
    this.camera.position.set(target.x + dist * Math.sin(phi) * Math.cos(theta), target.y + dist * Math.cos(phi), target.z + dist * Math.sin(phi) * Math.sin(theta));
    this.camera.lookAt(target); this.camera.updateMatrixWorld(); this.needsRender = true;
  }
  orbit(dx, dy) { this.theta -= dx * 0.008; this.phi = Math.min(1.55, Math.max(0.12, this.phi - dy * 0.008)); this.updateCamera(); }
  zoom(f) { this.dist = Math.min(200, Math.max(3, this.dist / f)); this.updateCamera(); }
  pan(dx, dy) {
    const k = this.dist * 0.0016; const m = this.camera.matrixWorld.elements;
    this.target.x += (-m[0] * dx + m[4] * dy) * k; this.target.y += (-m[1] * dx + m[5] * dy) * k; this.target.z += (-m[2] * dx + m[6] * dy) * k;
    this.updateCamera();
  }

  // ---- chunks ----
  chunkIndex(cx, cy, cz) { return cx + this.ncx * (cz + this.ncz * cy); }
  markCell(i) {
    if (i < 0) { for (let c = 0; c < this.ncx * this.ncy * this.ncz; c++) this.dirty.add(c); return; }
    const [x, y, z] = this.world.coords(i);
    const cx0 = Math.max(0, Math.floor((x - 1) / CHUNK)); const cx1 = Math.min(this.ncx - 1, Math.floor((x + 1) / CHUNK));
    const cy0 = Math.max(0, Math.floor((y - 1) / CHUNK)); const cy1 = Math.min(this.ncy - 1, Math.floor((y + 1) / CHUNK));
    const cz0 = Math.max(0, Math.floor((z - 1) / CHUNK)); const cz1 = Math.min(this.ncz - 1, Math.floor((z + 1) / CHUNK));
    for (let a = cx0; a <= cx1; a++) for (let b = cy0; b <= cy1; b++) for (let c = cz0; c <= cz1; c++) this.dirty.add(this.chunkIndex(a, b, c));
    this.needsRender = true;
  }
  setSlice(layer) { // layer < 0 disables slicing
    const old = this.slice; this.slice = layer;
    const lo = Math.min(old < 0 ? layer : old, layer < 0 ? old : layer); const hi = Math.max(old, layer);
    for (let cy = 0; cy < this.ncy; cy++) {
      const y0 = cy * CHUNK; const y1 = y0 + CHUNK;
      if (lo < 0 || (y1 >= lo && y0 <= hi + 1)) for (let cz = 0; cz < this.ncz; cz++) for (let cx = 0; cx < this.ncx; cx++) this.dirty.add(this.chunkIndex(cx, cy, cz));
    }
    this.applyVisibility(); this.needsRender = true;
  }
  applyVisibility() {
    for (const [key, ch] of this.chunks) ch.group.visible = this.slice < 0 || ch.y0 <= this.slice;
  }

  getChunk(key) {
    let ch = this.chunks.get(key);
    if (ch) return ch;
    const T = this.T;
    const cx = key % this.ncx; const r = (key - cx) / this.ncx; const cz = r % this.ncz; const cy = (r - cz) / this.ncz;
    ch = this.pool.pop() || { group: new T.Group(), meshes: [null, null, null] };
    ch.x0 = cx * CHUNK; ch.y0 = cy * CHUNK; ch.z0 = cz * CHUNK; ch.group.visible = this.slice < 0 || ch.y0 <= this.slice;
    this.group.add(ch.group); this.chunks.set(key, ch); return ch;
  }
  meshFor(ch, kind) {
    let m = ch.meshes[kind];
    if (!m) {
      const T = this.T; m = new T.InstancedMesh(this.geo, this.mats[kind], CAP[kind]);
      m.setColorAt(0, new T.Color(1, 1, 1)); m.frustumCulled = false; m.count = 0; ch.group.add(m); ch.meshes[kind] = m;
    }
    return m;
  }
  color(hex) { let c = this.colors.get(hex); if (!c) { c = new this.T.Color(hex); this.colors.set(hex, c); } return c; }

  /** Is the cell hidden by the slice? */
  hidden(y) { return this.slice >= 0 && y > this.slice; }
  opaque(x, y, z) {
    const w = this.world;
    if (!w.inBounds(x, y, z)) return false;
    if (this.hidden(y)) return false;
    const i = w.index(x, y, z); return isFullCube(w.ids[i], w.states[i]);
  }

  rebuildChunk(key) {
    const ch = this.getChunk(key); const w = this.world; const counts = [0, 0, 0]; const parts = [];
    const x1 = Math.min(w.sx, ch.x0 + CHUNK); const y1 = Math.min(w.sy, ch.y0 + CHUNK); const z1 = Math.min(w.sz, ch.z0 + CHUNK);
    for (let y = ch.y0; y < y1; y++) {
      if (this.hidden(y)) break;
      for (let z = ch.z0; z < z1; z++) for (let x = ch.x0; x < x1; x++) {
        const i = w.index(x, y, z); if (!w.ids[i]) continue;
        if (isFullCube(w.ids[i], w.states[i]) && this.opaque(x - 1, y, z) && this.opaque(x + 1, y, z) && this.opaque(x, y - 1, z)
          && this.opaque(x, y + 1, z) && this.opaque(x, y, z - 1) && this.opaque(x, y, z + 1)) continue;
        parts.length = 0; blockParts(w, i, parts);
        for (const p of parts) {
          if (counts[p.k] >= CAP[p.k]) { this.overCap = true; continue; }
          this.writeInstance(this.meshFor(ch, p.k), counts[p.k]++, x + 0.5, y + 0.5, z + 0.5, p);
        }
      }
    }
    for (let k = 0; k < 3; k++) {
      const m = ch.meshes[k]; if (!m) continue;
      m.count = counts[k]; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }
  writeInstance(mesh, n, cx, cy, cz, p) {
    this.tmpV.set(cx + p.p[0], cy + p.p[1], cz + p.p[2]); this.tmpS.set(p.s[0], p.s[1], p.s[2]);
    if (p.dir) this.tmpQ.setFromUnitVectors(this.up, this.tmpD.set(p.dir[0], p.dir[1], p.dir[2]).normalize()); else this.tmpQ.identity();
    this.tmpM.compose(this.tmpV, this.tmpQ, this.tmpS); mesh.setMatrixAt(n, this.tmpM); mesh.setColorAt(n, this.color(p.c));
  }

  /** Rebuild a few dirty chunks per frame; returns true if the scene changed. */
  flush(budget = REBUILDS_PER_FRAME) {
    if (!this.dirty.size) return false;
    let n = 0;
    for (const key of this.dirty) { this.dirty.delete(key); this.rebuildChunk(key); if (++n >= budget) break; }
    this.needsRender = true; return true;
  }

  // ---- overlays ----
  setCursor(cell, remove = false) {
    const on = !!cell; this.cursor.visible = this.cursorFill.visible = on;
    if (on) {
      this.cursor.position.set(cell.x + 0.5, cell.y + 0.5, cell.z + 0.5); this.cursorFill.position.copy(this.cursor.position);
      const c = remove ? 0xff5a4a : 0x7ee787; this.cursor.material.color.setHex(c); this.cursorFill.material.color.setHex(c);
    }
    this.needsRender = true;
  }
  setSelection(r) {
    this.selBox.visible = !!r;
    if (r) { this.selBox.scale.set(r.x1 - r.x0 + 1, r.y1 - r.y0 + 1, r.z1 - r.z0 + 1); this.selBox.position.set((r.x0 + r.x1 + 1) / 2, (r.y0 + r.y1 + 1) / 2, (r.z0 + r.z1 + 1) / 2); }
    this.needsRender = true;
  }
  setLayerGrid(y) { this.grid.position.set(this.world.sx / 2, y, this.world.sz / 2); this.grid.scale.set(this.world.sx / 64, 1, this.world.sz / 64); this.needsRender = true; }

  // ---- picking: voxel DDA ----
  pick(px, py, layer) {
    const T = this.T; const w = this.world;
    const ndc = new T.Vector3((px / this.canvas.clientWidth) * 2 - 1, -(py / this.canvas.clientHeight) * 2 + 1, 0.5).unproject(this.camera);
    const o = this.camera.position.clone(); const d = ndc.sub(o).normalize();
    const lim = [w.sx, w.sy, w.sz]; const oa = [o.x, o.y, o.z]; const da = [d.x, d.y, d.z];
    let t0 = 0; let t1 = 1e9; let enterAxis = -1;
    for (let a = 0; a < 3; a++) {
      if (Math.abs(da[a]) < 1e-9) { if (oa[a] < 0 || oa[a] > lim[a]) return null; continue; }
      let ta = (0 - oa[a]) / da[a]; let tb = (lim[a] - oa[a]) / da[a]; if (ta > tb) [ta, tb] = [tb, ta];
      if (ta > t0) { t0 = ta; enterAxis = a; } if (tb < t1) t1 = tb;
    }
    if (t0 > t1) return this.planeHit(o, d, layer);
    const p = [oa[0] + da[0] * (t0 + 1e-6), oa[1] + da[1] * (t0 + 1e-6), oa[2] + da[2] * (t0 + 1e-6)];
    const cell = p.map((v, a) => Math.min(lim[a] - 1, Math.max(0, Math.floor(v))));
    const step = da.map((v) => (v > 0 ? 1 : -1));
    const tMax = da.map((v, a) => (Math.abs(v) < 1e-9 ? 1e9 : ((v > 0 ? cell[a] + 1 : cell[a]) - oa[a]) / v));
    const tDelta = da.map((v) => (Math.abs(v) < 1e-9 ? 1e9 : Math.abs(1 / v)));
    const normal = [0, 0, 0]; if (enterAxis >= 0) normal[enterAxis] = -step[enterAxis];
    for (let n = 0; n < 400; n++) {
      if (!(cell[1] > (this.slice >= 0 ? this.slice : 1e9)) && w.ids[w.index(cell[0], cell[1], cell[2])]) {
        return { x: cell[0], y: cell[1], z: cell[2], nx: normal[0], ny: normal[1], nz: normal[2] };
      }
      let a = 0; if (tMax[1] < tMax[a]) a = 1; if (tMax[2] < tMax[a]) a = 2;
      if (tMax[a] > t1) break;
      cell[a] += step[a]; tMax[a] += tDelta[a]; normal[0] = normal[1] = normal[2] = 0; normal[a] = -step[a];
      if (cell[a] < 0 || cell[a] >= lim[a]) break;
    }
    return this.planeHit(o, d, layer);
  }
  /** Fallback when no block is hit: the empty cell on the current layer plane (placing only). */
  planeHit(o, d, layer) {
    if (Math.abs(d.y) < 1e-9) return null; const t = (layer - o.y) / d.y; if (t < 0) return null;
    const x = Math.floor(o.x + d.x * t); const z = Math.floor(o.z + d.z * t);
    if (!this.world.inBounds(x, layer, z)) return null;
    return { x, y: layer, z, nx: 0, ny: 0, nz: 0, plane: true };
  }

  render() {
    if (!this.needsRender) return; this.needsRender = false; this.renderer.render(this.scene, this.camera);
  }
}
