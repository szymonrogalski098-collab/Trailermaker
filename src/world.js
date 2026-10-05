// World: pure data. Typed arrays for block id + state bitfield. No simulation, no rendering.
import { DX, DY, DZ } from './blocks.js';

export class World {
  constructor(sx = 32, sy = 32, sz = 32) {
    this.resize(sx, sy, sz);
    this.listeners = [];
  }

  resize(sx, sy, sz) {
    this.sx = sx; this.sy = sy; this.sz = sz;
    this.ids = new Uint16Array(sx * sy * sz);
    this.states = new Uint32Array(sx * sy * sz);
  }

  get size() { return this.ids.length; }
  index(x, y, z) { return (y * this.sz + z) * this.sx + x; }
  inBounds(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < this.sx && y < this.sy && z < this.sz; }
  coords(i) {
    const x = i % this.sx; const r = (i - x) / this.sx;
    const z = r % this.sz; const y = (r - z) / this.sz;
    return [x, y, z];
  }
  /** Neighbor index in direction d, or -1 when outside. */
  neighbor(i, d) {
    const [x, y, z] = this.coords(i);
    const nx = x + DX[d], ny = y + DY[d], nz = z + DZ[d];
    return this.inBounds(nx, ny, nz) ? this.index(nx, ny, nz) : -1;
  }

  idAt(i) { return i < 0 ? 0 : this.ids[i]; }
  stateAt(i) { return i < 0 ? 0 : this.states[i]; }
  getId(x, y, z) { return this.inBounds(x, y, z) ? this.ids[this.index(x, y, z)] : 0; }
  getState(x, y, z) { return this.inBounds(x, y, z) ? this.states[this.index(x, y, z)] : 0; }

  /** Raw write; returns true when something changed. Notifies listeners. */
  setRaw(i, id, state = 0) {
    if (this.ids[i] === id && this.states[i] === state) return false;
    this.ids[i] = id; this.states[i] = state;
    for (const fn of this.listeners) fn(i);
    return true;
  }
  onChange(fn) { this.listeners.push(fn); }

  clear() { this.ids.fill(0); this.states.fill(0); for (const fn of this.listeners) fn(-1); }

  clone() {
    const w = new World(this.sx, this.sy, this.sz);
    w.ids.set(this.ids); w.states.set(this.states);
    return w;
  }
}
