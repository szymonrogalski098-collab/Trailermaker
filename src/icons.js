// Top-down 2D icons drawn on a Canvas 2D context. Used by the layer view and palette thumbnails.
import { BLOCKS, ID, DIR, S, FACE, opposite, cw } from './blocks.js';
import { attachDir, dustShape } from './power.js';

const VEC = { [DIR.N]: [0, -1], [DIR.S]: [0, 1], [DIR.W]: [-1, 0], [DIR.E]: [1, 0] };

export function powerColor(p) {
  const t = p / 15;
  const r = Math.round(70 + 185 * t); const g = Math.round(10 + 40 * t); const b = Math.round(10 + 30 * t);
  return `rgb(${r},${g},${b})`;
}

function arrow(ctx, cx, cy, s, dir, color) {
  const v = VEC[dir]; if (!v) return;
  const [dx, dy] = v; const px = -dy; const py = dx;
  ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(cx + dx * s * 0.28, cy + dy * s * 0.28);
  ctx.lineTo(cx - dx * s * 0.18 + px * s * 0.18, cy - dy * s * 0.18 + py * s * 0.18);
  ctx.lineTo(cx - dx * s * 0.18 - px * s * 0.18, cy - dy * s * 0.18 - py * s * 0.18);
  ctx.closePath(); ctx.fill();
}
function circle(ctx, x, y, r, fill, stroke) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(1, r * 0.25); ctx.stroke(); }
}
function box(ctx, x, y, w, h, fill, stroke) {
  ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
}
function verticalMark(ctx, cx, cy, s, up, color) {
  circle(ctx, cx, cy, s * 0.22, null, color);
  if (up) circle(ctx, cx, cy, s * 0.06, color); else {
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, s * 0.05); ctx.beginPath();
    ctx.moveTo(cx - s * 0.12, cy - s * 0.12); ctx.lineTo(cx + s * 0.12, cy + s * 0.12);
    ctx.moveTo(cx + s * 0.12, cy - s * 0.12); ctx.lineTo(cx - s * 0.12, cy + s * 0.12); ctx.stroke();
  }
}
function facingMark(ctx, cx, cy, s, f, color) {
  if (f === DIR.U || f === DIR.D) verticalMark(ctx, cx, cy, s, f === DIR.U, color); else arrow(ctx, cx, cy, s, f, color);
}
function letter(ctx, cx, cy, s, text, color = '#fff') {
  ctx.fillStyle = color; ctx.font = `bold ${Math.round(s * 0.34)}px system-ui,sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, cx, cy);
}

function drawDust(ctx, x, y, s, power, shape) {
  const cx = x + s / 2; const cy = y + s / 2; const col = powerColor(power);
  ctx.strokeStyle = col; ctx.lineWidth = s * 0.2; ctx.lineCap = 'butt';
  const dirs = shape ? Object.keys(shape).filter((d) => shape[d]).map(Number) : [DIR.N, DIR.E, DIR.S, DIR.W];
  for (const d of dirs) {
    const [dx, dy] = VEC[d]; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + dx * s * 0.5, cy + dy * s * 0.5); ctx.stroke();
  }
  circle(ctx, cx, cy, s * 0.17, col);
  if (power > 0) circle(ctx, cx, cy, s * 0.07, '#ffb0a0');
}

function drawTorch(ctx, cx, cy, s, lit) {
  circle(ctx, cx, cy, s * 0.2, lit ? '#ff4a2a' : '#4d1a14', '#2a1a10');
  if (lit) circle(ctx, cx, cy, s * 0.08, '#ffd2a0');
}

function drawRepeater(ctx, x, y, s, st) {
  const f = S.facing(st); const cx = x + s / 2; const cy = y + s / 2;
  box(ctx, x + s * 0.06, y + s * 0.06, s * 0.88, s * 0.88, S.locked(st) ? '#6a6a6a' : '#a9a9a9', '#555');
  const [dx, dy] = VEC[f]; const lit = S.powered(st);
  const px = -dy; const py = dx;
  drawTorch(ctx, cx + dx * s * 0.3, cy + dy * s * 0.3, s * 0.75, lit);
  const back = (S.delay(st) - 1.5) * s * 0.13; // delay slider position
  drawTorch(ctx, cx - dx * (s * 0.12 - back), cy - dy * (s * 0.12 - back), s * 0.75, lit);
  if (S.locked(st)) { ctx.fillStyle = '#222'; ctx.fillRect(cx - Math.abs(px) * s * 0.4 - Math.abs(dx) * s * 0.04 + 0, cy - Math.abs(py) * s * 0.4 - Math.abs(dy) * s * 0.04, Math.abs(px) * s * 0.8 + s * 0.08 * Math.abs(dx), Math.abs(py) * s * 0.8 + s * 0.08 * Math.abs(dy)); }
  arrow(ctx, cx - dx * s * 0.25, cy - dy * s * 0.25, s * 0.5, f, 'rgba(0,0,0,.35)');
}
function drawComparator(ctx, x, y, s, st) {
  const f = S.facing(st); const cx = x + s / 2; const cy = y + s / 2; const [dx, dy] = VEC[f]; const px = -dy; const py = dx;
  box(ctx, x + s * 0.06, y + s * 0.06, s * 0.88, s * 0.88, '#b4b4b4', '#555');
  const frontLit = S.mode(st) || S.power(st) > 0;
  drawTorch(ctx, cx + dx * s * 0.28 + px * s * 0.2, cy + dy * s * 0.28 + py * s * 0.2, s * 0.65, frontLit);
  drawTorch(ctx, cx + dx * s * 0.28 - px * s * 0.2, cy + dy * s * 0.28 - py * s * 0.2, s * 0.65, frontLit);
  drawTorch(ctx, cx - dx * s * 0.25, cy - dy * s * 0.25, s * 0.65, S.power(st) > 0);
  arrow(ctx, cx, cy, s * 0.4, f, 'rgba(0,0,0,.35)');
}

function drawLever(ctx, x, y, s, st) {
  const cx = x + s / 2; const cy = y + s / 2; const on = S.powered(st); const face = S.face(st);
  let f = S.facing(st); if (face !== FACE.WALL) f = DIR.N;
  const [dx, dy] = VEC[f];
  box(ctx, cx - s * 0.18, cy - s * 0.18, s * 0.36, s * 0.36, '#7d7d7d', '#444');
  ctx.strokeStyle = on ? '#ffd24a' : '#8a6a3a'; ctx.lineWidth = s * 0.1; ctx.lineCap = 'round';
  const k = face === FACE.WALL ? (on ? 0.38 : 0.2) : (on ? 0.38 : -0.38);
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + dx * s * k, cy + dy * s * k); ctx.stroke(); ctx.lineCap = 'butt';
  if (face === FACE.WALL) arrow(ctx, cx + dx * s * 0.3, cy + dy * s * 0.3, s * 0.3, f, 'rgba(255,255,255,.25)');
}

function drawPiston(ctx, x, y, s, id, st) {
  const f = S.facing(st); const sticky = BLOCKS[id].sticky; const cx = x + s / 2; const cy = y + s / 2;
  const base = sticky ? '#8fb05a' : '#a68a5a';
  box(ctx, x + s * 0.05, y + s * 0.05, s * 0.9, s * 0.9, '#6f6f6f', '#333');
  if (f === DIR.U || f === DIR.D) { box(ctx, x + s * 0.2, y + s * 0.2, s * 0.6, s * 0.6, base, '#333'); verticalMark(ctx, cx, cy, s, f === DIR.U, '#222'); return; }
  const [dx, dy] = VEC[f];
  const horizontal = dx !== 0; const t = s * 0.28;
  const ex = S.extended(st);
  if (horizontal) box(ctx, dx > 0 ? x + s * 0.95 - t - (ex ? 0 : 0) : x + s * 0.05, y + s * 0.05, t, s * 0.9, base, '#333');
  else box(ctx, x + s * 0.05, dy > 0 ? y + s * 0.95 - t : y + s * 0.05, s * 0.9, t, base, '#333');
  arrow(ctx, cx - dx * s * 0.05, cy - dy * s * 0.05, s * 0.6, f, ex ? 'rgba(0,0,0,.2)' : '#222');
}
function drawHead(ctx, x, y, s, st) {
  const f = S.facing(st); const sticky = S.mode(st); const cx = x + s / 2; const cy = y + s / 2;
  const col = sticky ? '#8fb05a' : '#c8aa6e'; const horizontal = f === DIR.E || f === DIR.W;
  if (f === DIR.U || f === DIR.D) { box(ctx, x + s * 0.1, y + s * 0.1, s * 0.8, s * 0.8, col, '#333'); circle(ctx, cx, cy, s * 0.1, '#5a4a2a'); return; }
  const [dx, dy] = VEC[f];
  if (horizontal) { box(ctx, x, cy - s * 0.12, s, s * 0.24, '#7a5a30'); box(ctx, dx > 0 ? x + s * 0.75 : x, y + s * 0.05, s * 0.25, s * 0.9, col, '#333'); }
  else { box(ctx, cx - s * 0.12, y, s * 0.24, s, '#7a5a30'); box(ctx, x + s * 0.05, dy > 0 ? y + s * 0.75 : y, s * 0.9, s * 0.25, col, '#333'); }
}

/** Draw one block icon in the square [x,y,x+s,y+s]. `shape` optional dust connection map. */
export function drawBlock(ctx, id, st, x, y, s, shape = null) {
  const b = BLOCKS[id]; const cx = x + s / 2; const cy = y + s / 2; const on = S.powered(st);
  if (id === 0) return;
  if (b.wool || id === ID.STONE || id === ID.OBSIDIAN) {
    box(ctx, x, y, s, s, b.color, 'rgba(0,0,0,.45)');
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x + s * 0.1, y + s * 0.1, s * 0.8, s * 0.12);
    return;
  }
  switch (id) {
    case ID.GLASS: box(ctx, x, y, s, s, 'rgba(168,216,232,.3)', '#9ad'); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.moveTo(x + s * .2, y + s * .8); ctx.lineTo(x + s * .8, y + s * .2); ctx.stroke(); break;
    case ID.REDSTONE_BLOCK: box(ctx, x, y, s, s, '#b01a0a', '#400'); box(ctx, x + s * .2, y + s * .2, s * .6, s * .6, '#d8321c'); break;
    case ID.REDSTONE_DUST: drawDust(ctx, x, y, s, S.power(st), shape); break;
    case ID.REDSTONE_TORCH: {
      let ox = 0; let oy = 0;
      if (S.face(st) === FACE.WALL) { const v = VEC[S.facing(st)]; ox = v[0] * s * 0.22; oy = v[1] * s * 0.22; }
      drawTorch(ctx, cx + ox, cy + oy, s, on); break;
    }
    case ID.LEVER: drawLever(ctx, x, y, s, st); break;
    case ID.STONE_BUTTON: case ID.WOODEN_BUTTON:
      box(ctx, cx - s * 0.18, cy - s * 0.18, s * 0.36, s * 0.36, id === ID.STONE_BUTTON ? (on ? '#d0d0d0' : '#8a8a8a') : (on ? '#d8b070' : '#a8814a'), '#222'); break;
    case ID.STONE_PLATE: case ID.WOODEN_PLATE:
      box(ctx, x + s * .12, y + s * .12, s * .76, s * .76, id === ID.STONE_PLATE ? '#9a9a9a' : '#b08850', '#333');
      if (on) box(ctx, x + s * .25, y + s * .25, s * .5, s * .5, 'rgba(0,0,0,.35)'); break;
    case ID.REPEATER: drawRepeater(ctx, x, y, s, st); break;
    case ID.COMPARATOR: drawComparator(ctx, x, y, s, st); break;
    case ID.REDSTONE_LAMP:
      box(ctx, x, y, s, s, on ? '#f6d27a' : '#5a4630', '#2a1e10');
      circle(ctx, cx, cy, s * 0.3, on ? '#fff3b0' : '#7a6040');
      if (on) { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.9); g.addColorStop(0, 'rgba(255,220,120,.5)'); g.addColorStop(1, 'rgba(255,220,120,0)'); ctx.fillStyle = g; ctx.fillRect(x - s * .4, y - s * .4, s * 1.8, s * 1.8); }
      break;
    case ID.OBSERVER: {
      box(ctx, x, y, s, s, '#707070', '#333'); const f = S.facing(st);
      if (f === DIR.U || f === DIR.D) verticalMark(ctx, cx, cy, s, f === DIR.U, '#ddd');
      else { const [dx, dy] = VEC[f]; box(ctx, cx + dx * s * 0.3 - s * 0.14, cy + dy * s * 0.3 - s * 0.14, s * 0.28, s * 0.28, '#222');
        circle(ctx, cx - dx * s * 0.3, cy - dy * s * 0.3, s * 0.11, on ? '#ff3a1a' : '#4a2a2a'); arrow(ctx, cx, cy, s * 0.5, f, 'rgba(255,255,255,.35)'); }
      break;
    }
    case ID.PISTON: case ID.STICKY_PISTON: drawPiston(ctx, x, y, s, id, st); break;
    case ID.PISTON_HEAD: drawHead(ctx, x, y, s, st); break;
    case ID.DAYLIGHT_SENSOR: box(ctx, x + s * .05, y + s * .05, s * .9, s * .9, '#cdb878', '#555'); circle(ctx, cx, cy, s * .2, on ? '#ffe45a' : '#6b6b5a'); break;
    case ID.TARGET: box(ctx, x, y, s, s, '#e8d8c8', '#555'); circle(ctx, cx, cy, s * .32, '#d04a3a'); circle(ctx, cx, cy, s * .14, '#fff'); if (on) circle(ctx, cx, cy, s * .4, null, '#ff3a1a'); break;
    case ID.DROPPER: case ID.DISPENSER: box(ctx, x, y, s, s, '#6a6a6a', '#333'); circle(ctx, cx, cy, s * .22, '#222'); letter(ctx, cx, cy, s, id === ID.DROPPER ? 'Dr' : 'Di', on ? '#ff6a4a' : '#bbb'); facingMark(ctx, cx, y + s * .85, s * .6, S.facing(st), 'rgba(255,255,255,.4)'); break;
    case ID.HOPPER: box(ctx, x + s * .1, y + s * .1, s * .8, s * .8, '#4a4a4a', '#222'); circle(ctx, cx, cy, s * .2, '#111'); break;
    case ID.NOTE_BLOCK: box(ctx, x, y, s, s, '#7a5230', '#2a1a10'); letter(ctx, cx, cy, s, '♪', on ? '#ff6a4a' : '#e8d0a0'); break;
    case ID.TNT: box(ctx, x, y, s, s, on ? '#fff' : '#c33', '#600'); letter(ctx, cx, cy, s, 'TNT', on ? '#c33' : '#fff'); break;
    case ID.IRON_DOOR: case ID.IRON_TRAPDOOR: case ID.FENCE_GATE: {
      const open = S.extended(st); const f = S.facing(st); const alongX = f === DIR.E || f === DIR.W;
      const wide = (alongX !== open);
      const col = id === ID.FENCE_GATE ? '#8a6a3a' : '#d0d0d0';
      if (id === ID.IRON_TRAPDOOR) { box(ctx, x + s * .1, y + s * .1, s * .8, s * .8, open ? 'rgba(180,180,180,.35)' : '#b8b8b8', '#555'); break; }
      if (wide) box(ctx, x, cy - s * .1, s, s * .2, col, '#333'); else box(ctx, cx - s * .1, y, s * .2, s, col, '#333');
      break;
    }
    default: box(ctx, x, y, s, s, b.color, '#000');
  }
}

/** Palette thumbnail with a sensible default state. */
export function drawThumbnail(canvas, id, state) {
  const ctx = canvas.getContext('2d'); const s = canvas.width;
  ctx.clearRect(0, 0, s, s); ctx.fillStyle = '#20242b'; ctx.fillRect(0, 0, s, s);
  drawBlock(ctx, id, state, 0, 0, s);
}
