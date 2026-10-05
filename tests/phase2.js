import { test, assertEq, assert, makeSim, ID, DIR, S, FACE } from './harness.js';

const pistonRig = (name = 'piston') => {
  const s = makeSim();
  s.put(5, 1, 5, name, { facing: DIR.E });
  return s;
};

test('piston pushes a block and shows a head; retracts', () => {
  const s = pistonRig();
  s.put(6, 1, 5, 'wool_red'); s.put(5, 1, 4, 'lever');
  s.flip(5, 1, 4); s.e.step();
  assertEq(s.id(6, 1, 5), ID.PISTON_HEAD); assertEq(s.id(7, 1, 5), ID.WOOL_RED, 'pushed');
  assert(S.extended(s.st(5, 1, 5)));
  s.flip(5, 1, 4); s.e.step();
  assertEq(s.id(6, 1, 5), 0, 'head gone'); assertEq(s.id(7, 1, 5), ID.WOOL_RED, 'normal piston leaves block');
});
test('sticky piston pulls the block back', () => {
  const s = pistonRig('sticky_piston');
  s.put(6, 1, 5, 'wool_red'); s.put(5, 1, 4, 'lever');
  s.flip(5, 1, 4); s.e.step(); assertEq(s.id(7, 1, 5), ID.WOOL_RED);
  s.flip(5, 1, 4); s.e.step();
  assertEq(s.id(6, 1, 5), ID.WOOL_RED, 'pulled back'); assertEq(s.id(7, 1, 5), 0);
});
test('piston push limit is 12', () => {
  for (const [n, ok] of [[12, true], [13, false]]) {
    const s = pistonRig(); s.put(5, 1, 4, 'lever');
    for (let i = 0; i < n; i++) s.put(6 + i, 1, 5, 'wool_blue');
    s.flip(5, 1, 4); s.e.step();
    assertEq(S.extended(s.st(5, 1, 5)), ok, `${n} blocks`);
    if (ok) assertEq(s.id(18, 1, 5), ID.WOOL_BLUE, 'last block moved');
  }
});
test('obsidian is immovable; piston destroys dust in its path', () => {
  const s = pistonRig(); s.put(5, 1, 4, 'lever');
  s.put(6, 1, 5, 'obsidian'); s.flip(5, 1, 4); s.e.step();
  assert(!S.extended(s.st(5, 1, 5)), 'blocked by obsidian');
  const t = pistonRig(); t.put(5, 1, 4, 'lever');
  t.put(6, 1, 5, 'wool_red'); t.put(7, 1, 5, 'redstone_dust');
  t.flip(5, 1, 4); t.e.step();
  assertEq(t.id(7, 1, 5), ID.WOOL_RED); assertEq(t.id(6, 1, 5), ID.PISTON_HEAD);
});
test('piston is not powered from its front', () => {
  const s = pistonRig(); s.put(6, 1, 5, 'redstone_block'); s.e.step();
  assert(!S.extended(s.st(5, 1, 5)));
});
test('quasi-connectivity: piston powered via block above it', () => {
  const s = pistonRig();
  s.put(5, 3, 5, 'redstone_block'); // powers (5,2,5), which is "above" the piston
  s.e.step();
  assert(S.extended(s.st(5, 1, 5)), 'quasi powered by source above-above');
  const t = pistonRig();
  t.put(5, 2, 5, 'redstone_block'); // directly above -> normal power
  t.e.step(); assert(S.extended(t.st(5, 1, 5)));
  const u = pistonRig(); // control: source diagonal, not adjacent to (5,2,5) or piston
  u.put(7, 3, 5, 'redstone_block'); u.e.step(); assert(!S.extended(u.st(5, 1, 5)));
});
test('quasi-connectivity: BUD - update of the above cell extends without direct power', () => {
  const s = pistonRig();
  s.put(4, 2, 5, 'redstone_block'); // west of the cell above the piston
  s.e.step(); assert(S.extended(s.st(5, 1, 5)), 'powered through (5,2,5)\'s west neighbor');
});
test('observer emits a 2-tick pulse when the watched block changes', () => {
  const s = makeSim();
  s.put(5, 1, 5, 'observer', { facing: DIR.E });
  s.put(4, 1, 5, 'redstone_lamp');
  s.e.run(4); assert(!s.on(5, 1, 5), 'idle');
  s.put(6, 1, 5, 'wool_white');
  assert(!s.on(5, 1, 5), 'not instant'); s.e.run(2); assert(s.on(5, 1, 5), 'on after 2 ticks'); assert(s.on(4, 1, 5), 'lamp behind');
  s.e.run(2); assert(!s.on(5, 1, 5), 'off after another 2');
});
test('observer detects dust power change', () => {
  const s = makeSim();
  s.put(6, 1, 5, 'redstone_dust'); s.put(5, 1, 5, 'observer', { facing: DIR.E });
  s.put(7, 1, 5, 'lever'); s.e.run(2);
  s.flip(7, 1, 5); s.e.run(2); assert(s.on(5, 1, 5), 'saw dust power on');
});
test('observer clock (two observers facing each other) keeps pulsing', () => {
  const s = makeSim();
  s.put(5, 1, 5, 'observer', { facing: DIR.E }); s.put(6, 1, 5, 'observer', { facing: DIR.W });
  s.e.run(40);
  let toggles = 0; let last = s.on(5, 1, 5);
  for (let i = 0; i < 40; i++) { s.e.step(); const v = s.on(5, 1, 5); if (v !== last) toggles++; last = v; }
  assert(toggles >= 6, 'clock keeps running: ' + toggles);
});
test('consumers: iron door opens, dropper quasi-powered, note block powered', () => {
  const s = makeSim();
  s.put(5, 1, 5, 'iron_door'); s.put(5, 1, 4, 'lever');
  s.flip(5, 1, 4); assert(S.extended(s.st(5, 1, 5)), 'door open');
  s.flip(5, 1, 4); assert(!S.extended(s.st(5, 1, 5)), 'door closed');
  const t = makeSim();
  t.put(5, 1, 5, 'dropper'); t.put(5, 3, 5, 'redstone_block');
  assert(t.on(5, 1, 5), 'dropper quasi powered');
  const u = makeSim(); u.put(5, 1, 5, 'note_block'); u.put(5, 1, 4, 'redstone_block'); assert(u.on(5, 1, 5));
});
test('removing a piston base removes its head', () => {
  const s = pistonRig(); s.put(5, 1, 4, 'lever'); s.flip(5, 1, 4); s.e.step();
  s.e.remove(5, 1, 5); assertEq(s.id(6, 1, 5), 0);
});
