import { test, assertEq, assert, makeSim, ID, DIR, S } from './harness.js';
import { serializeWorld, deserializeWorld, rleEncode, rleDecode } from '../src/storage.js';
import { Editor } from '../src/editor.js';

test('RLE round-trips', () => {
  const a = Uint32Array.from([1, 1, 1, 0, 0, 7, 7, 7, 7, 2]);
  assertEq(Array.from(rleDecode(rleEncode(a), a.length, 'x')).join(), Array.from(a).join());
});
test('world export/import round-trip keeps ids and states', () => {
  const s = makeSim(); s.put(3, 1, 3, 'lever'); s.flip(3, 1, 3); s.put(4, 1, 3, 'repeater', { facing: DIR.E, delay: 2 });
  const json = JSON.parse(JSON.stringify(serializeWorld(s.world)));
  const { world } = deserializeWorld(json);
  assertEq(world.getId(3, 1, 3), ID.LEVER); assert(S.powered(world.getState(3, 1, 3)));
  assertEq(S.delay(world.getState(4, 1, 3)), 2); assertEq(world.sx, 40);
  assertEq(Array.from(world.ids).join(','), Array.from(s.world.ids).join(','));
});
test('import validation reports clear errors', () => {
  const s = makeSim(); const good = serializeWorld(s.world);
  const bad = (mut, re) => { const d = JSON.parse(JSON.stringify(good)); mut(d); try { deserializeWorld(d); } catch (e) { assert(re.test(e.message), e.message); return; } throw new Error('no error'); };
  bad((d) => { d.version = 9; }, /version/i);
  bad((d) => { d.size = [100, 1, 1]; }, /size/i);
  bad((d) => { d.palette = ['nope']; }, /Unknown block/);
  bad((d) => { d.blocks = [0, 5]; }, /shorter/);
  bad((d) => { d.states.push(1); }, /RLE/);
});
test('undo/redo restores cascaded redstone changes (100+ steps)', () => {
  const s = makeSim(); const ed = new Editor(s.e);
  ed.place(1, 1, 1, ID.REDSTONE_BLOCK, 0); ed.place(2, 1, 1, ID.REDSTONE_DUST, 0);
  assertEq(s.power(2, 1, 1), 15);
  ed.undo(); assertEq(s.id(2, 1, 1), 0); ed.undo(); assertEq(s.id(1, 1, 1), 0);
  ed.redo(); ed.redo(); assertEq(s.power(2, 1, 1), 15);
  for (let i = 0; i < 120; i++) ed.place(10 + (i % 20), 1, 10 + Math.floor(i / 20), ID.STONE, 0);
  let n = 0; while (ed.history.canUndo) { ed.undo(); n++; }
  assert(n >= 100, 'at least 100 undo steps, got ' + n);
});
test('copy / paste a region', () => {
  const s = makeSim(); const ed = new Editor(s.e);
  ed.place(1, 1, 1, ID.WOOL_RED, 0); ed.place(2, 1, 1, ID.STONE, 0); ed.place(1, 1, 2, ID.REPEATER, DIR.E);
  ed.copy([1, 1, 1], [2, 1, 2]); ed.paste(10, 1, 10);
  assertEq(s.id(10, 1, 10), ID.WOOL_RED); assertEq(s.id(11, 1, 10), ID.STONE); assertEq(s.id(10, 1, 11), ID.REPEATER); assertEq(S.facing(s.st(10, 1, 11)), DIR.E);
});
test('clear layer', () => {
  const s = makeSim(); const ed = new Editor(s.e);
  ed.place(1, 1, 1, ID.STONE, 0); ed.place(2, 1, 1, ID.STONE, 0); ed.clearLayer(1);
  assertEq(s.id(1, 1, 1), 0); assertEq(s.id(2, 1, 1), 0); assertEq(s.id(1, 0, 1), ID.STONE);
});
