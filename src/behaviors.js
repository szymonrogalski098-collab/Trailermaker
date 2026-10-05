// Per-block behaviors: neighbor(e,p), tick(e,p), interact(e,p). `e` is the RedstoneEngine.
import { ID, BLOCKS, DIR, S, setField, opposite, isSturdy } from './blocks.js';
import {
  attachDir, inputFrom, diodeInput, hasNeighborSignal, dustExternalPower, dustNeighborPower, sideInput, strongInto,
} from './power.js';
import { isConductor } from './blocks.js';

const P = { EXTREMELY_HIGH: -3, VERY_HIGH: -2, HIGH: -1, NORMAL: 0 };
export const BEHAVIORS = {};
const reg = (id, b) => { BEHAVIORS[id] = b; };

// ---------- support / survival ----------
/** Sturdy support at neighbor n; the void below layer 0 counts as a bedrock floor. */
function sturdyAt(w, p, dir) {
  const n = w.neighbor(p, dir);
  return n < 0 ? dir === DIR.D : isSturdy(w.ids[n]);
}
function supported(e, p) {
  const w = e.world; const b = BLOCKS[w.ids[p]];
  if (b.needsFloor) return sturdyAt(w, p, DIR.D);
  if (b.attachable) return sturdyAt(w, p, attachDir(w.states[p]));
  return true;
}
/** Wraps a neighbor handler with the survival check. */
const survives = (fn) => (e, p) => { if (!supported(e, p)) e.breakBlock(p); else fn(e, p); };

// ---------- dust ----------
reg(ID.REDSTONE_DUST, {
  neighbor: survives((e, p) => {
    const w = e.world; const st = w.states[p];
    const target = Math.min(15, Math.max(dustExternalPower(w, p), dustNeighborPower(w, p)));
    if (target !== S.power(st)) e.setState(p, setField(st, 'power', target));
  }),
});

// ---------- diodes ----------
const frontIsMisaligned = (e, p) => {
  const w = e.world; const st = w.states[p]; const f = S.facing(st);
  const front = w.neighbor(p, f);
  const id = w.idAt(front);
  return (id === ID.REPEATER || id === ID.COMPARATOR) && S.facing(w.states[front]) !== f;
};
function diodePriority(e, p, poweredNow) {
  if (frontIsMisaligned(e, p)) return P.EXTREMELY_HIGH;
  return poweredNow ? P.VERY_HIGH : P.HIGH;
}

function repeaterLock(e, p) {
  const st = e.world.states[p];
  const locked = sideInput(e.world, p, S.facing(st), true) > 0 ? 1 : 0;
  if (locked !== (S.locked(st) ? 1 : 0)) e.setState(p, setField(st, 'locked', locked));
}
reg(ID.REPEATER, {
  neighbor: survives((e, p) => {
    repeaterLock(e, p);
    const st = e.world.states[p];
    if (S.locked(st)) return;
    const want = diodeInput(e.world, p, opposite(S.facing(st))) > 0;
    if (S.powered(st) !== want && !e.willTickThisTick(p)) e.schedule(p, (S.delay(st) + 1) * 2, diodePriority(e, p, S.powered(st)));
  }),
  tick(e, p) {
    const st = e.world.states[p];
    if (S.locked(st)) return;
    const want = diodeInput(e.world, p, opposite(S.facing(st))) > 0;
    if (S.powered(st) && !want) e.setState(p, setField(st, 'powered', 0));
    else if (!S.powered(st)) {
      e.setState(p, setField(st, 'powered', 1));
      if (!want) e.schedule(p, (S.delay(st) + 1) * 2, P.VERY_HIGH);
    }
  },
  interact(e, p) {
    const st = e.world.states[p];
    e.setState(p, setField(st, 'delay', (S.delay(st) + 1) & 3));
  },
});

function comparatorOutput(e, p) {
  const st = e.world.states[p]; const f = S.facing(st);
  const input = diodeInput(e.world, p, opposite(f));
  if (input === 0) return 0;
  const side = sideInput(e.world, p, f, false);
  if (side > input) return 0;
  return S.mode(st) ? input - side : input;
}
function comparatorRefresh(e, p) {
  const st = e.world.states[p]; const out = comparatorOutput(e, p);
  if (out !== S.power(st) || S.powered(st) !== out > 0) {
    e.setState(p, setField(setField(st, 'power', out), 'powered', out > 0 ? 1 : 0));
  }
}
reg(ID.COMPARATOR, {
  neighbor: survives((e, p) => {
    const st = e.world.states[p]; const out = comparatorOutput(e, p);
    if ((out !== S.power(st) || S.powered(st) !== out > 0) && !e.willTickThisTick(p)) {
      e.schedule(p, 2, diodePriority(e, p, S.powered(st)));
    }
  }),
  tick: comparatorRefresh,
  interact(e, p) {
    const st = e.world.states[p];
    e.setState(p, setField(st, 'mode', S.mode(st) ? 0 : 1));
    comparatorRefresh(e, p);
  },
});

// ---------- torch ----------
const torchInput = (e, p) => inputFrom(e.world, p, attachDir(e.world.states[p])) > 0;
reg(ID.REDSTONE_TORCH, {
  neighbor: survives((e, p) => {
    const lit = S.powered(e.world.states[p]);
    if (lit === torchInput(e, p) && !e.willTickThisTick(p)) e.schedule(p, 2);
  }),
  tick(e, p) {
    const st = e.world.states[p]; const input = torchInput(e, p);
    if (S.powered(st)) {
      if (!input) return;
      e.setState(p, setField(st, 'powered', 0));
      if (e.toggledTooOften(p, true)) e.schedule(p, 160);
    } else if (!input && !e.toggledTooOften(p, false)) {
      e.setState(p, setField(st, 'powered', 1));
    }
  },
});

// ---------- lamp ----------
reg(ID.REDSTONE_LAMP, {
  neighbor(e, p) {
    const st = e.world.states[p]; const sig = hasNeighborSignal(e.world, p);
    if (S.powered(st) && !sig) e.schedule(p, 4);
    else if (!S.powered(st) && sig) e.setState(p, setField(st, 'powered', 1));
  },
  tick(e, p) {
    const st = e.world.states[p];
    if (S.powered(st) && !hasNeighborSignal(e.world, p)) e.setState(p, setField(st, 'powered', 0));
  },
});

// ---------- observer ----------
reg(ID.OBSERVER, {
  tick(e, p) {
    const st = e.world.states[p];
    if (S.powered(st)) e.setState(p, setField(st, 'powered', 0));
    else { e.setState(p, setField(st, 'powered', 1)); e.schedule(p, 2); }
  },
});

// ---------- manual power sources ----------
const toggle = (e, p) => e.setState(p, setField(e.world.states[p], 'powered', S.powered(e.world.states[p]) ? 0 : 1));
const supportOnly = { neighbor: survives(() => {}) };
reg(ID.LEVER, { ...supportOnly, interact: toggle });
reg(ID.STONE_PLATE, { ...supportOnly, interact: toggle });
reg(ID.WOODEN_PLATE, { ...supportOnly, interact: toggle });
reg(ID.TARGET, { interact: toggle });
function buttonBehavior(id) {
  reg(id, {
    ...supportOnly,
    interact(e, p) {
      const st = e.world.states[p];
      if (S.powered(st)) return;
      e.setState(p, setField(st, 'powered', 1));
      e.schedule(p, BLOCKS[id].pressTicks);
    },
    tick(e, p) { const st = e.world.states[p]; if (S.powered(st)) e.setState(p, setField(st, 'powered', 0)); },
  });
}
buttonBehavior(ID.STONE_BUTTON); buttonBehavior(ID.WOODEN_BUTTON);

// daylight: 0 day, 1 night, 2 inverted day, 3 inverted night -> powered for 0 and 3
reg(ID.DAYLIGHT_SENSOR, {
  interact(e, p) {
    const mode = (S.daylight(e.world.states[p]) + 1) & 3;
    let st = setField(e.world.states[p], 'daylight', mode);
    st = setField(st, 'powered', mode === 0 || mode === 3 ? 1 : 0);
    e.setState(p, st);
  },
});

// ---------- consumers (signal only) ----------
const OPENABLE = new Set([ID.IRON_DOOR, ID.IRON_TRAPDOOR, ID.FENCE_GATE]);
function consumerBehavior(id) {
  const quasi = BLOCKS[id].quasi;
  reg(id, {
    neighbor(e, p) {
      const w = e.world; let sig = hasNeighborSignal(w, p);
      if (!sig && quasi) sig = quasiSignal(w, p);
      let st = setField(w.states[p], 'powered', sig ? 1 : 0);
      if (OPENABLE.has(id)) st = setField(st, 'extended', sig ? 1 : 0);
      e.setState(p, st);
    },
  });
}
for (const b of BLOCKS) if (b.consumer) consumerBehavior(b.id);

export function quasiSignal(w, p) {
  const above = w.neighbor(p, DIR.U);
  if (above < 0) return false;
  for (let d = 0; d < 6; d++) if (d !== DIR.D && inputFrom(w, above, d) > 0) return true;
  return false;
}

// ---------- pistons ----------
export function pistonShouldExtend(w, p) {
  const st = w.states[p]; const f = S.facing(st);
  for (let d = 0; d < 6; d++) if (d !== f && inputFrom(w, p, d) > 0) return true;
  if (isConductor(w.ids[p]) && !S.extended(st) && strongInto(w, p) > 0) return true;
  return quasiSignal(w, p);
}
function pistonBehavior(id) {
  reg(id, {
    neighbor(e, p) {
      const w = e.world; const ext = S.extended(w.states[p]);
      const should = pistonShouldExtend(w, p);
      if (should && !ext) e.postEvent({ p, type: 0 });
      else if (!should && ext) e.postEvent({ p, type: 1 });
    },
  });
}
pistonBehavior(ID.PISTON); pistonBehavior(ID.STICKY_PISTON);

// ---------- restore pending ticks after load/undo ----------
const restorers = {
  [ID.STONE_BUTTON]: (e, p) => { if (S.powered(e.world.states[p]) && !e.hasPending(p)) e.schedule(p, BLOCKS[ID.STONE_BUTTON].pressTicks); },
  [ID.WOODEN_BUTTON]: (e, p) => { if (S.powered(e.world.states[p]) && !e.hasPending(p)) e.schedule(p, BLOCKS[ID.WOODEN_BUTTON].pressTicks); },
  [ID.OBSERVER]: (e, p) => { if (S.powered(e.world.states[p]) && !e.hasPending(p)) e.schedule(p, 2); },
  [ID.REDSTONE_LAMP]: (e, p) => { if (S.powered(e.world.states[p]) && !e.hasPending(p)) e.schedule(p, 1); },
};
export function restoreTicks(e, p) { const r = restorers[e.world.ids[p]]; if (r) r(e, p); }
