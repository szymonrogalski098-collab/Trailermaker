// Redstone signal queries (pure functions over World). No mutation, no scheduling.
import { ID, DIR, BLOCKS, HORIZ, S, opposite, cw, ccw, isConductor, isSturdy, FACE } from './blocks.js';

/** Direction (from the block) pointing at the block it is attached to. */
export function attachDir(state) {
  const face = S.face(state);
  if (face === FACE.FLOOR) return DIR.D;
  if (face === FACE.CEILING) return DIR.U;
  return opposite(S.facing(state));
}

/** 0 none, 1 side, 2 up the neighbor block, 3 down below the neighbor. */
export function dustConnection(world, p, d) {
  const n = world.neighbor(p, d);
  if (n < 0) return 0;
  const above = world.neighbor(p, DIR.U);
  const aboveBlocks = above >= 0 && isConductor(world.ids[above]);
  if (!aboveBlocks && isSturdy(world.ids[n])) {
    const nu = world.neighbor(n, DIR.U);
    if (nu >= 0 && world.ids[nu] === ID.REDSTONE_DUST) return 2;
  }
  if (connectsToSide(world.ids[n], world.states[n], d)) return 1;
  if (!isConductor(world.ids[n])) {
    const nd = world.neighbor(n, DIR.D);
    if (nd >= 0 && world.ids[nd] === ID.REDSTONE_DUST) return 3;
  }
  return 0;
}

function connectsToSide(id, state, d) {
  if (id === ID.REDSTONE_DUST) return true;
  if (id === ID.REPEATER) { const f = S.facing(state); return f === d || f === opposite(d); }
  if (id === ID.OBSERVER) return S.facing(state) === d;
  return !!BLOCKS[id].source;
}

/** Java blockstate sides: actual connections plus the implied opposite end of a single-axis line. */
export function dustShape(world, p) {
  const c = {};
  for (const d of HORIZ) c[d] = dustConnection(world, p, d) !== 0;
  if (!HORIZ.some((d) => c[d])) return c; // dot
  const noNS = !c[DIR.N] && !c[DIR.S]; const noEW = !c[DIR.E] && !c[DIR.W];
  const out = { ...c };
  if (noNS) { out[DIR.E] = true; out[DIR.W] = true; }
  if (noEW) { out[DIR.N] = true; out[DIR.S] = true; }
  return out;
}

function dustEmits(world, src, dir) {
  const power = S.power(world.states[src]);
  if (power === 0) return 0;
  if (dir === DIR.D) return power;
  if (dir === DIR.U) return 0;
  const shape = dustShape(world, src);
  if (!HORIZ.some((d) => shape[d])) return power;
  return shape[dir] && !shape[cw(dir)] && !shape[ccw(dir)] ? power : 0;
}

/**
 * Signal emitted by block `src` toward the neighbor in direction `dir` (src -> receiver).
 * direct=true: only "direct" signal that can power a conductor block.
 */
export function emitted(world, src, dir, direct, ignoreDust = false) {
  const id = world.ids[src];
  if (id === 0) return 0;
  const st = world.states[src];
  switch (id) {
    case ID.REDSTONE_BLOCK: return direct ? 0 : 15;
    case ID.REDSTONE_TORCH:
      if (!S.powered(st)) return 0;
      return direct ? (dir === DIR.U ? 15 : 0) : (dir === attachDir(st) ? 0 : 15);
    case ID.LEVER: case ID.STONE_BUTTON: case ID.WOODEN_BUTTON:
      if (!S.powered(st)) return 0;
      return direct ? (dir === attachDir(st) ? 15 : 0) : 15;
    case ID.STONE_PLATE: case ID.WOODEN_PLATE:
      if (!S.powered(st)) return 0;
      return direct ? (dir === DIR.D ? 15 : 0) : 15;
    case ID.DAYLIGHT_SENSOR: case ID.TARGET:
      return S.powered(st) && !direct ? 15 : 0;
    case ID.REPEATER: return S.powered(st) && dir === S.facing(st) ? 15 : 0;
    case ID.COMPARATOR: return dir === S.facing(st) ? S.power(st) : 0;
    case ID.OBSERVER: return S.powered(st) && dir === opposite(S.facing(st)) ? 15 : 0;
    case ID.REDSTONE_DUST: return ignoreDust ? 0 : dustEmits(world, src, dir);
    default: return 0;
  }
}

/** Max direct signal powering conductor block n. */
export function strongInto(world, n, ignoreDust = false) {
  let best = 0;
  for (let d = 0; d < 6; d++) {
    const m = world.neighbor(n, d);
    if (m < 0) continue;
    const v = emitted(world, m, opposite(d), true, ignoreDust);
    if (v > best) best = v;
    if (best === 15) break;
  }
  return best;
}

/** Signal that receiver r sees from direction dir (Java Level.getSignal). */
export function inputFrom(world, r, dir, ignoreDust = false) {
  const n = world.neighbor(r, dir);
  if (n < 0) return 0;
  const own = emitted(world, n, opposite(dir), false, ignoreDust);
  if (!isConductor(world.ids[n]) || own >= 15) return own;
  return Math.max(own, strongInto(world, n, ignoreDust));
}

/** Input of a repeater/comparator: dust is read at its raw power. */
export function diodeInput(world, p, dir) {
  const n = world.neighbor(p, dir);
  if (n < 0) return 0;
  const base = inputFrom(world, p, dir);
  if (base >= 15) return base;
  return world.ids[n] === ID.REDSTONE_DUST ? Math.max(base, S.power(world.states[n])) : base;
}

export function hasNeighborSignal(world, p) {
  for (let d = 0; d < 6; d++) if (inputFrom(world, p, d) > 0) return true;
  return false;
}

/** Strongest signal reaching dust at p from non-dust sources. */
export function dustExternalPower(world, p) {
  let best = 0;
  for (let d = 0; d < 6; d++) best = Math.max(best, inputFrom(world, p, d, true));
  return best;
}

/** Highest (neighbor dust power - 1) among dust that feeds dust at p (Java calculateTargetStrength). */
export function dustNeighborPower(world, p) {
  const above = world.neighbor(p, DIR.U);
  const aboveBlocks = above >= 0 && isConductor(world.ids[above]);
  let best = 0;
  const take = (t) => {
    if (t >= 0 && world.ids[t] === ID.REDSTONE_DUST) best = Math.max(best, S.power(world.states[t]) - 1);
  };
  for (const d of HORIZ) {
    const n = world.neighbor(p, d);
    if (n < 0) continue;
    take(n);
    if (isConductor(world.ids[n])) { if (!aboveBlocks) take(world.neighbor(n, DIR.U)); }
    else take(world.neighbor(n, DIR.D));
  }
  return best;
}

/** Side input of a diode; repeaters accept diodes only, comparators also dust/redstone block. */
export function sideInput(world, p, facing, diodesOnly) {
  let best = 0;
  for (const side of [cw(facing), ccw(facing)]) {
    const n = world.neighbor(p, side);
    if (n < 0) continue;
    const id = world.ids[n];
    if (id === ID.REPEATER || id === ID.COMPARATOR) best = Math.max(best, emitted(world, n, opposite(side), true));
    else if (!diodesOnly) {
      if (id === ID.REDSTONE_BLOCK) best = 15;
      else if (id === ID.REDSTONE_DUST) best = Math.max(best, S.power(world.states[n]));
    }
  }
  return best;
}
