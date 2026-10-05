// Editor actions on top of World + RedstoneEngine: place/remove/interact/rotate, history, clipboard.
import { BLOCKS, ID, S, DIR, FACE, HORIZ, setField, defaultState, opposite, cw, isSturdy } from './blocks.js';

const MAX_HISTORY = 200;

export class History {
  constructor(world) {
    this.world = world; this.undoStack = []; this.redoStack = []; this.current = null;
    world.onChange((i, oldId, oldState) => {
      if (i < 0 || !this.current || this.current.has(i)) return;
      this.current.set(i, [oldId, oldState]);
    });
  }
  begin() { this.current = new Map(); }
  commit() {
    const rec = this.current; this.current = null;
    if (!rec || !rec.size) return false;
    const cells = [];
    for (const [i, [oldId, oldState]] of rec) {
      const nid = this.world.ids[i]; const nst = this.world.states[i];
      if (nid !== oldId || nst !== oldState) cells.push([i, oldId, oldState, nid, nst]);
    }
    if (!cells.length) return false;
    this.undoStack.push(cells); if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift();
    this.redoStack.length = 0; return true;
  }
  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }
  undo() { return this.apply(this.undoStack, this.redoStack, 1, 2); }
  redo() { return this.apply(this.redoStack, this.undoStack, 3, 4); }
  apply(from, to, idCol, stCol) {
    const cells = from.pop(); if (!cells) return false;
    for (const c of cells) this.world.setRaw(c[0], c[idCol], c[stCol]);
    to.push(cells); return true;
  }
  clear() { this.undoStack.length = 0; this.redoStack.length = 0; this.current = null; }
}

/** Facing choices for a block: horizontal ones, or all six for sixway blocks. */
export function facingCycle(block) {
  return block.sixway ? [DIR.N, DIR.E, DIR.S, DIR.W, DIR.U, DIR.D] : HORIZ;
}
export function rotateFacing(block, facing) {
  const cycle = facingCycle(block); const i = cycle.indexOf(facing);
  return cycle[(i + 1) % cycle.length];
}

/** Build the state for a block placed with the requested facing. */
export function placementState(id, facing, face = FACE.FLOOR) {
  const b = BLOCKS[id]; let s = defaultState(id);
  if (b.rotatable || b.sixway) s = setField(s, 'facing', facing);
  if (b.attachable) {
    s = setField(s, 'face', face);
    if (face === FACE.WALL) s = setField(s, 'facing', facing);
  }
  return s;
}

export class Editor {
  constructor(engine) {
    this.engine = engine; this.world = engine.world; this.history = new History(this.world);
    this.clipboard = null;
  }
  setEngine(engine) { this.engine = engine; this.world = engine.world; this.history = new History(this.world); }

  withHistory(fn) { this.history.begin(); try { return fn(); } finally { this.history.commit(); } }

  place(x, y, z, id, facing, face = FACE.FLOOR) {
    return this.withHistory(() => this.engine.place(x, y, z, id, placementState(id, facing, face)));
  }
  remove(x, y, z) { return this.withHistory(() => this.engine.remove(x, y, z)); }
  interact(x, y, z) { return this.withHistory(() => this.engine.interact(x, y, z)); }

  /** Rotate the placed block (long-press in Place mode). */
  rotateAt(x, y, z) {
    const w = this.world; if (!w.inBounds(x, y, z)) return false;
    const p = w.index(x, y, z); const b = BLOCKS[w.ids[p]];
    if (!b.rotatable) return false;
    let st = w.states[p];
    const next = rotateFacing(b, S.facing(st));
    st = setField(st, 'facing', next);
    this.withHistory(() => { this.engine.beginAction(); this.engine.setState(p, st); this.engine.drain(); });
    return true;
  }

  undo() { const ok = this.history.undo(); if (ok) this.engine.settle(); return ok; }
  redo() { const ok = this.history.redo(); if (ok) this.engine.settle(); return ok; }

  clearLayer(y) {
    this.withHistory(() => {
      for (let z = 0; z < this.world.sz; z++) for (let x = 0; x < this.world.sx; x++) {
        if (this.world.getId(x, y, z)) this.engine.place(x, y, z, 0, 0);
      }
    });
  }
  clearAll() {
    this.withHistory(() => { this.world.ids.fill(0); this.world.states.fill(0); });
    this.engine.resetRuntime();
  }

  regionBounds(a, b) {
    return { x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), y0: Math.min(a[1], b[1]), y1: Math.max(a[1], b[1]),
      z0: Math.min(a[2], b[2]), z1: Math.max(a[2], b[2]) };
  }
  copy(a, b) {
    const r = this.regionBounds(a, b); const cells = [];
    for (let y = r.y0; y <= r.y1; y++) for (let z = r.z0; z <= r.z1; z++) for (let x = r.x0; x <= r.x1; x++) {
      cells.push([x - r.x0, y - r.y0, z - r.z0, this.world.getId(x, y, z), this.world.getState(x, y, z)]);
    }
    this.clipboard = { size: [r.x1 - r.x0 + 1, r.y1 - r.y0 + 1, r.z1 - r.z0 + 1], cells };
  }
  cut(a, b) {
    this.copy(a, b); const r = this.regionBounds(a, b);
    this.withHistory(() => {
      for (let y = r.y0; y <= r.y1; y++) for (let z = r.z0; z <= r.z1; z++) for (let x = r.x0; x <= r.x1; x++) {
        if (this.world.getId(x, y, z)) this.engine.place(x, y, z, 0, 0);
      }
    });
  }
  /** Paste with the clipboard's min corner at (ox,oy,oz). Support blocks go first (bottom-up). */
  paste(ox, oy, oz) {
    if (!this.clipboard) return false;
    this.withHistory(() => {
      for (const [dx, dy, dz, id, st] of this.clipboard.cells) {
        const x = ox + dx; const y = oy + dy; const z = oz + dz;
        if (this.world.inBounds(x, y, z)) this.engine.place(x, y, z, id, st);
      }
    });
    return true;
  }
}
