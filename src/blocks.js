// Block registry, direction helpers and state bitfield layout.

export const DIR = { W: 0, E: 1, D: 2, U: 3, N: 4, S: 5 };
// Java neighbor update order: west, east, down, up, north, south
export const DX = [-1, 1, 0, 0, 0, 0];
export const DY = [0, 0, -1, 1, 0, 0];
export const DZ = [0, 0, 0, 0, -1, 1];
export const HORIZ = [DIR.N, DIR.E, DIR.S, DIR.W];

export const opposite = (d) => d ^ 1;
export const cw = (d) => ({ [DIR.N]: DIR.E, [DIR.E]: DIR.S, [DIR.S]: DIR.W, [DIR.W]: DIR.N })[d];
export const ccw = (d) => ({ [DIR.N]: DIR.W, [DIR.W]: DIR.S, [DIR.S]: DIR.E, [DIR.E]: DIR.N })[d];
export const isHoriz = (d) => d === 0 || d === 1 || d === 4 || d === 5;

export const FACE = { FLOOR: 0, WALL: 1, CEILING: 2 };

// state layout
const F = {
  facing: [0, 3], face: [3, 2], power: [5, 4], powered: [9, 1], delay: [10, 2],
  locked: [12, 1], extended: [13, 1], mode: [14, 1], daylight: [15, 2],
};
export function getField(state, name) {
  const [shift, bits] = F[name];
  return (state >>> shift) & ((1 << bits) - 1);
}
export function setField(state, name, value) {
  const [shift, bits] = F[name];
  const mask = ((1 << bits) - 1) << shift;
  return ((state & ~mask) | ((value << shift) & mask)) >>> 0;
}
export const S = {
  facing: (s) => getField(s, 'facing'), face: (s) => getField(s, 'face'),
  power: (s) => getField(s, 'power'), powered: (s) => getField(s, 'powered') === 1,
  delay: (s) => getField(s, 'delay'), locked: (s) => getField(s, 'locked') === 1,
  extended: (s) => getField(s, 'extended') === 1, mode: (s) => getField(s, 'mode') === 1,
  daylight: (s) => getField(s, 'daylight'),
};

export const WOOL_COLORS = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray',
  'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];
export const WOOL_HEX = ['#e9ecec', '#f07613', '#bd44b3', '#3aafd9', '#f8c527', '#70b919', '#ed8dac', '#3e4447',
  '#8e8e86', '#158991', '#792aac', '#35399d', '#724728', '#546d1b', '#a12722', '#141519'];

// ---- registry ----
export const BLOCKS = [];
export const ID = {};
const byName = new Map();

function def(name, props) {
  const id = BLOCKS.length;
  const b = { id, name, tab: 'other', color: '#888', solid: false, conductor: false, rotatable: false,
    source: false, ...props };
  BLOCKS.push(b); ID[name.toUpperCase()] = id; byName.set(name, b);
  return b;
}
const solid = (name, color, tab = 'solid', extra = {}) =>
  def(name, { tab, color, solid: true, conductor: true, ...extra });

def('air', { tab: null, color: '#000' });
solid('stone', '#7d7d7d');
def('glass', { tab: 'solid', color: '#a8d8e8', solid: true, conductor: false, translucent: true });
solid('obsidian', '#150f24', 'solid', { immovable: true });
WOOL_COLORS.forEach((c, i) => solid('wool_' + c, WOOL_HEX[i], 'wool', { wool: true }));
solid('redstone_block', '#b01a0a', 'power', { source: true, conductor: false });
def('redstone_torch', { tab: 'power', color: '#e63b1f', source: true, attachable: true, rotatable: true, destroy: true });
def('lever', { tab: 'power', color: '#9a7b4f', source: true, attachable: true, rotatable: true, destroy: true });
def('stone_button', { tab: 'power', color: '#8a8a8a', source: true, attachable: true, rotatable: true, destroy: true, pressTicks: 20 });
def('wooden_button', { tab: 'power', color: '#a8814a', source: true, attachable: true, rotatable: true, destroy: true, pressTicks: 30 });
def('stone_plate', { tab: 'power', color: '#9a9a9a', source: true, needsFloor: true, destroy: true });
def('wooden_plate', { tab: 'power', color: '#b08850', source: true, needsFloor: true, destroy: true });
solid('daylight_sensor', '#c9b27a', 'power', { source: true, conductor: false });
solid('target', '#e8c8b0', 'power', { source: true, conductor: false });
def('redstone_dust', { tab: 'redstone', color: '#a00', needsFloor: true, destroy: true });
def('repeater', { tab: 'redstone', color: '#8a8a8a', source: true, needsFloor: true, rotatable: true, diode: true });
def('comparator', { tab: 'redstone', color: '#a5a5a5', source: true, needsFloor: true, rotatable: true, diode: true });
solid('redstone_lamp', '#6a4a2a', 'redstone');
solid('observer', '#6b6b6b', 'redstone', { source: true, rotatable: true, sixway: true, observer: true });
solid('piston', '#9c7d4e', 'redstone', { rotatable: true, sixway: true, piston: true });
solid('sticky_piston', '#7da04e', 'redstone', { rotatable: true, sixway: true, piston: true, sticky: true });
def('piston_head', { tab: null, color: '#b89a60', solid: true, conductor: false, immovable: true, head: true, sixway: true });
for (const n of ['dropper', 'dispenser', 'hopper', 'note_block', 'tnt', 'iron_door', 'iron_trapdoor', 'fence_gate']) {
  const colors = { dropper: '#666', dispenser: '#6e6e6e', hopper: '#444', note_block: '#7a5230', tnt: '#c33',
    iron_door: '#d0d0d0', iron_trapdoor: '#b8b8b8', fence_gate: '#8a6a3a' };
  const isSolid = ['dropper', 'dispenser', 'note_block', 'tnt'].includes(n);
  def(n, { tab: 'other', color: colors[n], solid: isSolid, conductor: isSolid, consumer: true,
    rotatable: ['dropper', 'dispenser', 'hopper', 'iron_door', 'iron_trapdoor', 'fence_gate'].includes(n),
    sixway: n === 'dropper' || n === 'dispenser', quasi: n === 'dropper' || n === 'dispenser', needsFloor: false });
}

export const getBlock = (id) => BLOCKS[id] || BLOCKS[0];
export const blockByName = (name) => byName.get(name);
export const isConductor = (id) => BLOCKS[id].conductor;
export const isSturdy = (id) => BLOCKS[id].solid && !BLOCKS[id].translucent && !BLOCKS[id].head;
export const TABS = ['redstone', 'power', 'wool', 'solid', 'other'];

export function defaultState(id) {
  const b = BLOCKS[id];
  let s = 0;
  if (b.name === 'redstone_torch') s = setField(s, 'powered', 1);
  if (b.attachable) s = setField(s, 'face', FACE.FLOOR);
  if (b.name === 'repeater' || b.name === 'comparator') s = setField(s, 'facing', DIR.N);
  if (b.sixway || b.rotatable) s = setField(s, 'facing', DIR.N);
  return s;
}

/** Full opaque cube (used for 3D face culling). */
export function isFullCube(id, state = 0) {
  const b = BLOCKS[id];
  if (!b.solid || b.translucent || b.head) return false;
  if (b.name === 'daylight_sensor') return false;
  if (b.piston && S.extended(state)) return false;
  return true;
}
