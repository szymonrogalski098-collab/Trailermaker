// Voxel models: block state -> list of box parts. Pure data, no rendering library.
// Part: { k: 0 shaded | 1 emissive | 2 glass, p:[x,y,z] centre offset from cell centre, s:[w,h,d], c:'#rrggbb', dir?:[x,y,z] }
import { BLOCKS, ID, DIR, S, FACE, DX, DY, DZ, isFullCube, opposite, cw } from './blocks.js';
import { attachDir, dustShape, dustConnection } from './power.js';
import { powerColor } from './icons.js';

const rgbToHex = (rgb) => '#' + rgb.match(/\d+/g).map((n) => (+n).toString(16).padStart(2, '0')).join('');
const vec = (d) => [DX[d], DY[d], DZ[d]];
const abs3 = (v) => v.map(Math.abs);
const part = (k, p, s, c, dir) => ({ k, p, s, c, dir });

/** Box along axis of direction f between offsets a..b (from cell centre), cross-section w x w. */
function axisBox(f, a, b, w, k, c) {
  const v = vec(f); const av = abs3(v);
  const len = Math.abs(b - a); const mid = (a + b) / 2;
  return part(k, v.map((x) => x * mid), av.map((x) => (x ? len : w)), c);
}
/** Flat box lying against the attachment face `a` with given thickness and face size w. */
function faceBox(a, thick, w, k, c, along = 0, h = w) {
  const v = vec(a); const av = abs3(v);
  const size = av.map((x, i) => (x ? thick : (i === 1 ? h : w)));
  return part(k, v.map((x) => x * (0.5 - thick / 2)), size, c);
}
const floorPart = (h, w, k, c, x = 0, z = 0) => part(k, [x, -0.5 + h / 2, z], [w, h, w], c);

function torchParts(out, x, y, z, lit, height = 0.55) {
  out.push(part(0, [x, y + height / 2, z], [0.125, height, 0.125], '#6b4a2a'));
  out.push(part(lit ? 1 : 0, [x, y + height, z], [0.22, 0.22, 0.22], lit ? '#ff4a2a' : '#5a1a14'));
}

function dustParts(world, i, st, out) {
  const col = rgbToHex(powerColor(S.power(st)));
  const shape = dustShape(world, i);
  out.push(part(1, [0, -0.5 + 0.02, 0], [0.34, 0.03, 0.34], col));
  for (const d of [DIR.N, DIR.E, DIR.S, DIR.W]) {
    if (!shape[d]) continue;
    const v = vec(d); const av = abs3(v);
    out.push(part(1, [v[0] * 0.25, -0.5 + 0.02, v[2] * 0.25], [av[0] ? 0.5 : 0.28, 0.03, av[2] ? 0.5 : 0.28], col));
    if (world && dustConnection(world, i, d) === 2) {
      out.push(part(1, [v[0] * 0.49, 0, v[2] * 0.49], [av[0] ? 0.03 : 0.28, 1, av[2] ? 0.03 : 0.28], col));
    }
  }
}

function leverParts(out, st) {
  const a = attachDir(st); const on = S.powered(st); const f = S.facing(st); const face = S.face(st);
  out.push(faceBox(a, 0.12, 0.4, 0, '#7d7d7d'));
  const pivot = vec(a).map((x) => x * 0.44);
  let d;
  if (face === FACE.WALL) { const o = vec(f); d = [o[0] * 0.6, on ? 0.8 : -0.8, o[2] * 0.6]; }
  else { const o = vec(f === DIR.U || f === DIR.D ? DIR.N : f); const sgn = on ? 1 : -1; d = [o[0] * 0.64 * sgn, face === FACE.CEILING ? -0.77 : 0.77, o[2] * 0.64 * sgn]; }
  out.push(part(on ? 1 : 0, [pivot[0] + d[0] * 0.25, pivot[1] + d[1] * 0.25, pivot[2] + d[2] * 0.25], [0.09, 0.5, 0.09], on ? '#ffd24a' : '#8a6a3a', d));
}

function diodeParts(out, id, st) {
  const f = S.facing(st); const v = vec(f); const perp = vec(cw(f));
  out.push(part(0, [0, -0.5 + 0.0625, 0], [1, 0.125, 1], id === ID.REPEATER ? '#a9a9a9' : '#b8b8b8'));
  const y = -0.5 + 0.125; const lit = S.powered(st);
  if (id === ID.REPEATER) {
    torchParts(out, v[0] * 0.3, y, v[2] * 0.3, lit, 0.3);
    const back = -0.35 + 0.15 * S.delay(st);
    torchParts(out, v[0] * back, y, v[2] * back, lit, 0.3);
  } else {
    const front = S.mode(st) || S.power(st) > 0;
    for (const sgn of [-1, 1]) torchParts(out, v[0] * 0.3 + perp[0] * 0.25 * sgn, y, v[2] * 0.3 + perp[2] * 0.25 * sgn, front, 0.25);
    torchParts(out, v[0] * -0.3, y, v[2] * -0.3, S.power(st) > 0, 0.25);
  }
}

function pistonParts(out, id, st) {
  const f = S.facing(st); const ex = S.extended(st); const sticky = BLOCKS[id].sticky;
  out.push(axisBox(f, -0.5, 0.25, 1, 0, '#7a7a7a'));
  if (!ex) out.push(axisBox(f, 0.25, 0.5, 1, 0, sticky ? '#8fb05a' : '#a68a5a'));
}
function headParts(out, st) {
  const f = S.facing(st); const sticky = S.mode(st);
  out.push(axisBox(f, 0.25, 0.5, 1, 0, sticky ? '#9bbf5a' : '#c8aa6e'));
  out.push(axisBox(f, -0.5, 0.25, 0.25, 0, '#7a5a30'));
}

function panelParts(out, id, st) {
  const open = S.extended(st); const f = S.facing(st); const v = vec(f); const av = abs3(v);
  if (id === ID.IRON_TRAPDOOR) {
    out.push(open ? part(0, [0, 0, -0.4], [1, 1, 0.19], '#b8b8b8') : part(0, [0, -0.4, 0], [1, 0.19, 1], '#b8b8b8')); return;
  }
  const col = id === ID.FENCE_GATE ? '#8a6a3a' : '#d0d0d0'; const h = id === ID.FENCE_GATE ? 0.8 : 1;
  const alongX = av[0] === 1; const wide = alongX === open; // panel spans the X axis?
  out.push(part(0, [0, -0.5 + h / 2, 0], wide ? [1, h, 0.2] : [0.2, h, 1], col));
}

/** Append the parts of the block at world index i. */
export function blockParts(world, i, out) {
  const id = world.ids[i]; const st = world.states[i]; const b = BLOCKS[id];
  if (id === 0) return;
  if (b.wool || id === ID.STONE || id === ID.OBSIDIAN) return void out.push(part(0, [0, 0, 0], [1, 1, 1], b.color));
  switch (id) {
    case ID.GLASS: out.push(part(2, [0, 0, 0], [1, 1, 1], b.color)); break;
    case ID.REDSTONE_BLOCK: out.push(part(1, [0, 0, 0], [1, 1, 1], '#c2200e')); break;
    case ID.REDSTONE_LAMP: out.push(part(S.powered(st) ? 1 : 0, [0, 0, 0], [1, 1, 1], S.powered(st) ? '#ffe08a' : '#5a4630')); break;
    case ID.REDSTONE_DUST: dustParts(world, i, st, out); break;
    case ID.REDSTONE_TORCH: {
      const wall = S.face(st) === FACE.WALL; const o = wall ? vec(S.facing(st)) : [0, 0, 0];
      torchParts(out, o[0] * 0.28, -0.5 + (wall ? 0.15 : 0), o[2] * 0.28, S.powered(st), 0.6); break;
    }
    case ID.LEVER: leverParts(out, st); break;
    case ID.STONE_BUTTON: case ID.WOODEN_BUTTON:
      out.push(faceBox(attachDir(st), S.powered(st) ? 0.06 : 0.125, 0.3, S.powered(st) ? 1 : 0, id === ID.STONE_BUTTON ? '#8a8a8a' : '#a8814a')); break;
    case ID.STONE_PLATE: case ID.WOODEN_PLATE:
      out.push(floorPart(S.powered(st) ? 0.03 : 0.0625, 0.875, 0, id === ID.STONE_PLATE ? '#9a9a9a' : '#b08850')); break;
    case ID.REPEATER: case ID.COMPARATOR: diodeParts(out, id, st); break;
    case ID.OBSERVER: {
      out.push(part(0, [0, 0, 0], [1, 1, 1], '#707070'));
      const f = S.facing(st); const v = vec(f); const av = abs3(v);
      out.push(part(0, v.map((x) => x * 0.5), av.map((x) => (x ? 0.06 : 0.3)), '#1d1d1d'));
      out.push(part(S.powered(st) ? 1 : 0, v.map((x) => -x * 0.5), av.map((x) => (x ? 0.06 : 0.22)), S.powered(st) ? '#ff3a1a' : '#4a2a2a'));
      break;
    }
    case ID.PISTON: case ID.STICKY_PISTON: pistonParts(out, id, st); break;
    case ID.PISTON_HEAD: headParts(out, st); break;
    case ID.DAYLIGHT_SENSOR: out.push(part(S.powered(st) ? 1 : 0, [0, -0.5 + 0.1875, 0], [1, 0.375, 1], S.powered(st) ? '#e8d08a' : '#9a8c64')); break;
    case ID.TARGET: out.push(part(S.powered(st) ? 1 : 0, [0, 0, 0], [1, 1, 1], S.powered(st) ? '#ff8a6a' : '#e6d3c3')); break;
    case ID.TNT: out.push(part(S.powered(st) ? 1 : 0, [0, 0, 0], [1, 1, 1], S.powered(st) ? '#ffffff' : '#c33')); break;
    case ID.HOPPER:
      out.push(part(0, [0, 0.25, 0], [1, 0.25, 1], '#4a4a4a')); out.push(part(0, [0, -0.1, 0], [0.5, 0.5, 0.5], '#3a3a3a')); break;
    case ID.IRON_DOOR: case ID.IRON_TRAPDOOR: case ID.FENCE_GATE: panelParts(out, id, st); break;
    default: out.push(part(0, [0, 0, 0], [1, 1, 1], b.color)); // dropper, dispenser, note block
  }
}
