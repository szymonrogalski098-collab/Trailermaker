import { test, assertEq, assert, makeSim, ID, DIR, S, FACE } from './harness.js';

test('dust decays 15 -> 0 over 15 blocks', () => {
  const s = makeSim();
  s.put(0, 1, 5, 'redstone_block');
  s.dustLine(1, 1, 5, DIR.E, 18);
  for (let i = 1; i <= 16; i++) assertEq(s.power(i, 1, 5), 16 - i, `dust #${i}`);
  assertEq(s.power(17, 1, 5), 0); assertEq(s.power(18, 1, 5), 0);
  s.remove?.(0, 1, 5); s.e.remove(0, 1, 5);
  for (let i = 1; i <= 18; i++) assertEq(s.power(i, 1, 5), 0, `off #${i}`);
});

test('torch inverter (wall torch on lever-powered wool)', () => {
  const s = makeSim();
  s.put(5, 1, 5, 'wool_white');
  s.put(4, 1, 5, 'lever', { face: FACE.WALL, facing: DIR.W });
  s.put(6, 1, 5, 'redstone_torch', { face: FACE.WALL, facing: DIR.E, powered: 1 });
  assert(s.on(6, 1, 5), 'torch lit initially');
  s.flip(4, 1, 5);
  s.e.step(); assert(s.on(6, 1, 5), 'still lit after 1 tick');
  s.e.step(); assert(!s.on(6, 1, 5), 'off after 2 ticks (1 redstone tick)');
  s.flip(4, 1, 5); s.e.run(2);
  assert(s.on(6, 1, 5), 'on again');
});

test('floor torch powers block above strongly and adjacent dust', () => {
  const s = makeSim();
  s.put(5, 1, 5, 'redstone_torch');
  s.put(5, 2, 5, 'wool_red');
  s.put(6, 1, 5, 'stone');
  s.put(6, 2, 5, 'redstone_dust');
  assertEq(s.power(6, 2, 5), 15, 'dust beside strongly-powered block above torch');
  s.put(5, 1, 6, 'redstone_dust');
  assertEq(s.power(5, 1, 6), 15, 'dust beside torch');
});

test('repeater delays 1..4 redstone ticks', () => {
  for (let d = 0; d < 4; d++) {
    const s = makeSim();
    s.put(4, 1, 5, 'lever');
    s.put(5, 1, 5, 'repeater', { facing: DIR.E, delay: d });
    s.put(6, 1, 5, 'redstone_dust');
    s.flip(4, 1, 5);
    const ticks = (d + 1) * 2;
    s.e.run(ticks - 1); assert(!s.on(5, 1, 5), `delay ${d + 1}: off before ${ticks}`);
    s.e.step(); assert(s.on(5, 1, 5), `delay ${d + 1}: on at ${ticks}`);
    assertEq(s.power(6, 1, 5), 15, 'output 15');
  }
});

test('repeater outputs only forward', () => {
  const s = makeSim();
  s.put(4, 1, 5, 'redstone_block');
  s.put(5, 1, 5, 'repeater', { facing: DIR.E });
  s.put(5, 1, 4, 'redstone_dust'); s.put(5, 1, 6, 'redstone_dust'); s.put(6, 1, 5, 'redstone_dust');
  s.e.run(4);
  assertEq(s.power(6, 1, 5), 15); assertEq(s.power(5, 1, 4), 0); assertEq(s.power(5, 1, 6), 0);
});

test('repeater locking by side repeater', () => {
  const s = makeSim();
  s.put(4, 1, 5, 'lever');
  s.put(5, 1, 5, 'repeater', { facing: DIR.E });
  s.put(5, 1, 3, 'lever');
  s.put(5, 1, 4, 'repeater', { facing: DIR.S }); // points at the side of repeater A
  s.flip(5, 1, 3); s.e.run(2);
  assert(s.on(5, 1, 4), 'locker powered');
  assert(S.locked(s.st(5, 1, 5)), 'A locked');
  s.flip(4, 1, 5); s.e.run(6);
  assert(!s.on(5, 1, 5), 'locked repeater stays off');
  s.flip(5, 1, 3); s.e.run(2);
  assert(!S.locked(s.st(5, 1, 5)), 'unlocked');
  s.e.run(2); assert(s.on(5, 1, 5), 'catches up with input after unlock');
  // locked-on keeps state
  s.flip(5, 1, 3); s.e.run(2); assert(S.locked(s.st(5, 1, 5)));
  s.flip(4, 1, 5); s.e.run(6);
  assert(s.on(5, 1, 5), 'locked on stays on');
});

function comparatorRig(sideLen) {
  const s = makeSim();
  s.put(3, 1, 5, 'redstone_block'); s.put(4, 1, 5, 'redstone_dust'); // back = 15
  s.put(5, 1, 5, 'comparator', { facing: DIR.E });
  s.put(6, 1, 5, 'redstone_dust');
  if (sideLen) {
    s.put(5, 1, 1, 'redstone_block');
    for (let z = 2; z < 2 + sideLen; z++) s.put(5, 1, z, 'redstone_dust'); // side power at z=4 -> 15-(sideLen..)
  }
  return s;
}
test('comparator compare mode', () => {
  const s = comparatorRig(0); s.e.run(2);
  assertEq(s.power(5, 1, 5), 15); assertEq(s.power(6, 1, 5), 15);
  const t = comparatorRig(3); t.e.run(2); // side = 13 <= 15
  assertEq(t.power(5, 1, 5), 15, 'side<=back passes back');
  // side stronger than back -> 0
  const u = makeSim();
  u.put(0, 1, 5, 'redstone_block'); u.dustLine(1, 1, 5, DIR.E, 6); // back (6,1,5)? power at x=4 -> 12
  u.put(5, 1, 5, 'comparator', { facing: DIR.E });
  u.put(5, 1, 3, 'redstone_block'); u.put(5, 1, 4, 'redstone_dust'); // side 15
  u.e.run(4);
  assertEq(u.power(4, 1, 5), 12); assertEq(u.power(5, 1, 5), 0, 'side>back -> 0');
});
test('comparator subtract mode', () => {
  const s = comparatorRig(3); s.flip(5, 1, 5);
  assert(S.mode(s.st(5, 1, 5)), 'subtract set');
  s.e.run(2);
  assertEq(s.power(5, 1, 5), 2, '15 - 13');
  assertEq(s.power(6, 1, 5), 2, 'dust directly after comparator carries its output');
});
test('comparator delay is 1 redstone tick (2 game ticks)', () => {
  const s = makeSim();
  s.put(4, 1, 5, 'lever'); s.put(5, 1, 5, 'comparator', { facing: DIR.E });
  s.flip(4, 1, 5);
  s.e.step(); assertEq(s.power(5, 1, 5), 0); s.e.step(); assertEq(s.power(5, 1, 5), 15);
});

test('lamp: instant on, 4 game-tick off delay', () => {
  const s = makeSim();
  s.put(4, 1, 5, 'lever'); s.put(5, 1, 5, 'redstone_lamp');
  s.flip(4, 1, 5); assert(s.on(5, 1, 5), 'instantly on');
  s.flip(4, 1, 5);
  assert(s.on(5, 1, 5), 'still on');
  s.e.run(3); assert(s.on(5, 1, 5), 'on after 3');
  s.e.step(); assert(!s.on(5, 1, 5), 'off after 4');
});

function clockRig() {
  const s = makeSim();
  s.put(5, 1, 5, 'wool_white');
  s.put(6, 1, 5, 'redstone_torch', { face: FACE.WALL, facing: DIR.E, powered: 1 });
  s.put(6, 2, 5, 'wool_red');
  s.put(5, 2, 5, 'redstone_dust');
  return s;
}
test('torch clock is deterministic and burns out', () => {
  const run = () => { const s = clockRig(); const h = []; for (let i = 0; i < 80; i++) { s.e.step(); h.push(s.on(6, 1, 5) ? 1 : 0); } return h; };
  const a = run(); const b = run();
  assertEq(a.join(''), b.join(''), 'deterministic');
  assert(a.slice(0, 12).includes(0) && a.slice(0, 12).includes(1), 'toggles early');
  assert(a.slice(60).every((v) => v === 0), 'burned out and stays off');
});
test('burnt-out torch relights after 160 ticks', () => {
  const s = clockRig(); let relit = false; let burned = false;
  for (let i = 0; i < 400; i++) { s.e.step(); if (i > 60 && !s.on(6, 1, 5)) burned = true; if (burned && i > 150 && s.on(6, 1, 5)) relit = true; }
  assert(burned && relit, 'burnout then relight');
});

test('strong power: lever on wool powers adjacent dust', () => {
  const s = makeSim();
  s.put(5, 1, 5, 'wool_blue'); s.put(4, 1, 5, 'lever', { face: FACE.WALL, facing: DIR.W });
  s.put(6, 1, 5, 'redstone_dust'); s.put(5, 1, 6, 'redstone_dust');
  assertEq(s.power(6, 1, 5), 0);
  s.flip(4, 1, 5);
  assertEq(s.power(6, 1, 5), 15, 'dust east of strongly powered wool'); assertEq(s.power(5, 1, 6), 15);
});
test('weak power: dust-powered wool powers lamp but not other dust', () => {
  const s = makeSim();
  s.put(0, 1, 5, 'redstone_block'); s.dustLine(1, 1, 5, DIR.E, 3);
  s.put(4, 1, 5, 'wool_gray');
  s.put(5, 1, 5, 'redstone_lamp'); s.put(4, 1, 7, 'redstone_dust'); s.put(4, 1, 6, 'redstone_dust');
  assert(s.on(5, 1, 5), 'lamp beside weakly powered wool lights');
  assertEq(s.power(4, 1, 6), 0, 'dust beside weakly powered wool stays off');
});
test('glass does not conduct', () => {
  const s = makeSim();
  s.put(4, 1, 5, 'lever', { face: FACE.WALL, facing: DIR.W }); s.put(5, 1, 5, 'glass'); s.put(6, 1, 5, 'redstone_lamp');
  s.flip(4, 1, 5); assert(!s.on(6, 1, 5));
});

test('dust climbs a block and descends', () => {
  const s = makeSim();
  s.put(0, 1, 5, 'redstone_block'); s.put(1, 1, 5, 'redstone_dust');
  s.put(2, 1, 5, 'wool_green'); s.put(2, 2, 5, 'redstone_dust');
  s.put(3, 1, 5, 'wool_green'); s.put(3, 2, 5, 'redstone_dust');
  assertEq(s.power(2, 2, 5), 14, 'climbed'); assertEq(s.power(3, 2, 5), 13);
});
test('opaque block above lower dust blocks climbing', () => {
  const s = makeSim();
  s.put(0, 1, 5, 'redstone_block'); s.put(1, 1, 5, 'redstone_dust');
  s.put(2, 1, 5, 'wool_green'); s.put(2, 2, 5, 'redstone_dust');
  s.put(1, 2, 5, 'wool_green'); // blocks
  assertEq(s.power(2, 2, 5), 0, 'blocked by block above lower dust');
});
test('glass above lower dust does not block climbing', () => {
  const s = makeSim();
  s.put(0, 1, 5, 'redstone_block'); s.put(1, 1, 5, 'redstone_dust');
  s.put(2, 1, 5, 'wool_green'); s.put(2, 2, 5, 'redstone_dust');
  s.put(1, 2, 5, 'glass');
  assertEq(s.power(2, 2, 5), 14);
});
test('dust descends a step, also past glass', () => {
  const s = makeSim();
  s.put(1, 1, 5, 'wool_white'); s.put(0, 2, 5, 'redstone_block'); s.put(1, 2, 5, 'redstone_dust');
  s.put(2, 1, 5, 'redstone_dust');
  assertEq(s.power(2, 1, 5), 14, 'descended');
  s.put(2, 2, 5, 'glass');
  assertEq(s.power(2, 1, 5), 14, 'descends past glass (non-conductor)');
  s.put(2, 2, 5, 'wool_white');
  assertEq(s.power(2, 1, 5), 0, 'opaque block at the step blocks descent');
});
test('dust line powers blocks at its ends only; dot powers all four sides', () => {
  const s = makeSim();
  s.put(0, 1, 5, 'redstone_block'); s.put(1, 1, 5, 'redstone_dust');
  s.put(2, 1, 5, 'redstone_lamp'); s.put(1, 1, 4, 'redstone_lamp');
  assert(s.on(2, 1, 5), 'lamp at line end lit');
  assert(!s.on(1, 1, 4), 'lamp beside the line stays off');
  s.put(11, 1, 5, 'wool_white'); s.put(12, 1, 5, 'lever', { face: FACE.WALL, facing: DIR.E });
  s.put(10, 1, 5, 'redstone_dust');
  s.put(10, 1, 4, 'redstone_lamp'); s.put(10, 1, 6, 'redstone_lamp'); s.put(9, 1, 5, 'redstone_lamp');
  s.flip(12, 1, 5);
  assert(s.on(10, 1, 4) && s.on(10, 1, 6) && s.on(9, 1, 5), 'dot powers all sides');
});
test('update budget guard sets overflow instead of freezing', () => {
  const s = makeSim(); s.e.maxUpdates = 50;
  s.put(0, 1, 5, 'redstone_block'); s.dustLine(1, 1, 5, DIR.E, 16);
  assert(s.e.overflow, 'overflow flagged');
});
