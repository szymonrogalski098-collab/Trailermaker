// RedstoneEngine: update queue + scheduled ticks + block events. No rendering code.
import { ID, BLOCKS, DIR, S, setField, defaultState, opposite } from './blocks.js';
import { BEHAVIORS } from './behaviors.js';
import { handlePistonEvent } from './piston.js';

export const PRIORITY = { EXTREMELY_HIGH: -3, VERY_HIGH: -2, HIGH: -1, NORMAL: 0 };
export const UPDATE_BUDGET = 100000;

class TickHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  peek() { return this.a[0]; }
  less(x, y) { return x.time - y.time || x.prio - y.prio || x.seq - y.seq; }
  push(t) {
    const a = this.a; a.push(t);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.less(a[i], a[p]) >= 0) break;
      [a[i], a[p]] = [a[p], a[i]]; i = p;
    }
  }
  pop() {
    const a = this.a; const top = a[0]; const last = a.pop();
    if (a.length) {
      a[0] = last; let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < a.length && this.less(a[l], a[m]) < 0) m = l;
        if (r < a.length && this.less(a[r], a[m]) < 0) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]]; i = m;
      }
    }
    return top;
  }
  clear() { this.a.length = 0; }
}

export class RedstoneEngine {
  constructor(world) {
    this.world = world;
    this.time = 0;
    this.queue = []; this.qHead = 0;
    this.ticks = new TickHeap();
    this.pending = new Map(); // pos -> array of due times
    this.seq = 0;
    this.events = [];
    this.toggles = new Map(); // pos -> torch toggle times
    this.updates = 0;
    this.overflow = false;
    this.maxUpdates = UPDATE_BUDGET;
  }

  // ---------- public API ----------
  /** Place a block (editor action). Returns the cell index or -1 if out of bounds. */
  place(x, y, z, id, state = defaultState(id)) {
    if (!this.world.inBounds(x, y, z)) return -1;
    const p = this.world.index(x, y, z);
    this.beginAction();
    this.detachPiston(p);
    this.replace(p, id, state, true);
    this.drain();
    return p;
  }
  remove(x, y, z) { return this.place(x, y, z, 0, 0); }

  /** Right-click style interaction; returns true when something reacted. */
  interact(x, y, z) {
    if (!this.world.inBounds(x, y, z)) return false;
    const p = this.world.index(x, y, z);
    const b = BEHAVIORS[this.world.ids[p]];
    if (!b || !b.interact) return false;
    this.beginAction();
    b.interact(this, p);
    this.drain();
    return true;
  }

  /** One game tick. */
  step() {
    this.time++;
    this.beginAction();
    this.drain();
    this.runScheduled();
    this.runEvents();
  }
  run(n) { for (let i = 0; i < n; i++) this.step(); }

  /** Re-evaluate every non-air block (after load / undo). */
  settle() {
    this.beginAction();
    for (let p = 0; p < this.world.size; p++) if (this.world.ids[p] !== 0) this.queue.push(p);
    this.drain();
  }

  resetRuntime() {
    this.time = 0; this.queue.length = 0; this.qHead = 0; this.ticks.clear(); this.pending.clear();
    this.events.length = 0; this.toggles.clear(); this.overflow = false;
  }

  // ---------- helpers used by behaviors ----------
  /** Write a block; fires observers and neighbor update rings on change. */
  replace(p, id, state, isPlace = false) {
    const w = this.world; const oldId = w.ids[p];
    if (!w.setRaw(p, id, state)) return false;
    if (oldId !== id) this.pending.delete(p);
    this.notifyChange(p, oldId !== id || isPlace);
    return true;
  }
  setState(p, state) { return this.replace(p, this.world.ids[p], state >>> 0); }
  setField(p, name, value) { return this.setState(p, setField(this.world.states[p], name, value)); }
  breakBlock(p) { this.replace(p, 0, 0); }

  schedule(p, delay, prio = PRIORITY.NORMAL) {
    const time = this.time + delay;
    this.ticks.push({ time, prio, seq: this.seq++, p, id: this.world.ids[p] });
    let list = this.pending.get(p);
    if (!list) this.pending.set(p, (list = []));
    list.push(time);
  }
  hasPending(p) { return (this.pending.get(p) || []).length > 0; }
  willTickThisTick(p) { return (this.pending.get(p) || []).includes(this.time); }
  postEvent(ev) {
    if (!this.events.some((e) => e.p === ev.p && e.type === ev.type)) this.events.push(ev);
  }

  /** Torch burnout bookkeeping (Java: >=8 toggles within 60 ticks). */
  toggledTooOften(p, add) {
    let list = this.toggles.get(p);
    if (!list) this.toggles.set(p, (list = []));
    while (list.length && this.time - list[0] > 60) list.shift();
    if (add) list.push(this.time);
    return list.length >= 8;
  }

  /** Editor overwrote part of a piston: keep base and head consistent. */
  detachPiston(p) {
    const w = this.world; const id = w.ids[p]; const st = w.states[p]; const f = S.facing(st);
    if (BLOCKS[id].piston && S.extended(st)) {
      const head = w.neighbor(p, f);
      if (w.idAt(head) === ID.PISTON_HEAD) this.replace(head, 0, 0);
    } else if (id === ID.PISTON_HEAD) {
      const base = w.neighbor(p, opposite(f));
      if (BLOCKS[w.idAt(base)].piston) this.setState(base, setField(w.states[base], 'extended', 0));
    }
  }

  // ---------- internals ----------
  beginAction() { this.updates = 0; }

  notifyChange(p, idChanged) {
    this.notifyObservers(p);
    if (idChanged) this.queue.push(p);
    this.enqueueRing(p);
    if (idChanged) this.refreshNearbyDust(p);
  }

  /** Java updateNeighborsAt for p and its 6 neighbors (deduplicated, W,E,D,U,N,S order). */
  enqueueRing(p) {
    const w = this.world; const seen = new Set();
    const centers = [p];
    for (let d = 0; d < 6; d++) { const n = w.neighbor(p, d); if (n >= 0) centers.push(n); }
    for (const c of centers) {
      for (let d = 0; d < 6; d++) {
        const n = w.neighbor(c, d);
        if (n >= 0 && !seen.has(n)) { seen.add(n); this.queue.push(n); }
      }
    }
  }

  /** Placing/removing blocks changes dust shapes: nudge neighbors of nearby dust. */
  refreshNearbyDust(p) {
    const w = this.world;
    for (let d = 0; d < 6; d++) {
      const n = w.neighbor(p, d);
      if (n < 0) continue;
      for (const c of [n, w.neighbor(n, DIR.U), w.neighbor(n, DIR.D)]) {
        if (c >= 0 && w.ids[c] === ID.REDSTONE_DUST) for (let e = 0; e < 6; e++) {
          const m = w.neighbor(c, e); if (m >= 0) this.queue.push(m);
        }
      }
    }
  }

  notifyObservers(p) {
    const w = this.world;
    for (let d = 0; d < 6; d++) {
      const n = w.neighbor(p, d);
      if (n < 0 || w.ids[n] !== ID.OBSERVER) continue;
      const st = w.states[n];
      if (S.facing(st) === (d ^ 1) && !S.powered(st) && !this.hasPending(n)) this.schedule(n, 2);
    }
  }

  drain() {
    const w = this.world;
    while (this.qHead < this.queue.length) {
      if (++this.updates > this.maxUpdates) { this.overflow = true; this.queue.length = 0; break; }
      const p = this.queue[this.qHead++];
      const b = BEHAVIORS[w.ids[p]];
      if (b && b.neighbor) b.neighbor(this, p);
      if (this.qHead > 65536) { this.queue = this.queue.slice(this.qHead); this.qHead = 0; }
    }
    this.queue.length = 0; this.qHead = 0;
  }

  runScheduled() {
    const w = this.world;
    while (this.ticks.size && this.ticks.peek().time <= this.time) {
      const t = this.ticks.pop();
      const list = this.pending.get(t.p);
      if (list) { const i = list.indexOf(t.time); if (i >= 0) list.splice(i, 1); if (!list.length) this.pending.delete(t.p); }
      if (w.ids[t.p] !== t.id) continue;
      const b = BEHAVIORS[t.id];
      if (b && b.tick) b.tick(this, t.p);
      this.drain();
    }
  }

  runEvents() {
    while (this.events.length) {
      const ev = this.events.shift();
      handlePistonEvent(this, ev);
      this.drain();
    }
  }
}
