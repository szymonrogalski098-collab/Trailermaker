// Tiny test harness + circuit-building helpers (no external framework).
import { World } from '../src/world.js';
import { RedstoneEngine } from '../src/engine.js';
import { ID, DIR, S, setField, defaultState, FACE } from '../src/blocks.js';

const tests = [];
export const test = (name, fn) => tests.push({ name, fn });
export function assertEq(actual, expected, msg = '') {
  if (actual !== expected) throw new Error(`${msg} expected ${expected}, got ${actual}`);
}
export function assert(cond, msg = 'assertion failed') { if (!cond) throw new Error(msg); }

export async function runAll() {
  let failed = 0;
  for (const t of tests) {
    try { t.fn(); console.log(`  ok   ${t.name}`); } catch (err) { failed++; console.log(`  FAIL ${t.name}\n       ${err.message}`); }
  }
  console.log(`\n${tests.length - failed}/${tests.length} passed`);
  process.exit(failed ? 1 : 0);
}

/** Stone floor at y=0; circuits live on y=1. */
export function makeSim(sx = 40, sy = 8, sz = 40) {
  const world = new World(sx, sy, sz);
  const e = new RedstoneEngine(world);
  for (let x = 0; x < sx; x++) for (let z = 0; z < sz; z++) world.setRaw(world.index(x, 0, z), ID.STONE, 0);
  const api = {
    world, e,
    put(x, y, z, name, opts = {}) {
      const id = ID[name.toUpperCase()];
      let st = defaultState(id);
      for (const [k, v] of Object.entries(opts)) st = setField(st, k, v);
      e.place(x, y, z, id, st);
    },
    id: (x, y, z) => world.getId(x, y, z),
    st: (x, y, z) => world.getState(x, y, z),
    power: (x, y, z) => S.power(world.getState(x, y, z)),
    on: (x, y, z) => S.powered(world.getState(x, y, z)),
    dustLine(x, y, z, dir, n) {
      const dx = dir === DIR.E ? 1 : dir === DIR.W ? -1 : 0; const dz = dir === DIR.S ? 1 : dir === DIR.N ? -1 : 0;
      for (let i = 0; i < n; i++) api.put(x + dx * i, y, z + dz * i, 'redstone_dust');
    },
    flip(x, y, z) { e.interact(x, y, z); },
  };
  return api;
}
export { ID, DIR, S, FACE };
