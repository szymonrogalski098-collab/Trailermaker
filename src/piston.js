// Piston push/pull logic (push limit 12, immovable blocks, destroy-on-push blocks).
import { ID, BLOCKS, DIR, S, setField, opposite } from './blocks.js';
import { pistonShouldExtend } from './behaviors.js';

export const PUSH_LIMIT = 12;

/** Returns {ok, moves:[idx...], destroy:idx|-1}. moves are ordered nearest-first. */
export function resolvePush(world, pistonIdx) {
  const f = S.facing(world.states[pistonIdx]);
  const moves = []; let destroy = -1;
  let c = world.neighbor(pistonIdx, f);
  for (;;) {
    if (c < 0) return { ok: false };
    const id = world.ids[c];
    if (id === 0) break;
    const b = BLOCKS[id];
    if (b.immovable || (b.piston && S.extended(world.states[c]))) return { ok: false };
    if (b.destroy) { destroy = c; break; }
    if (moves.length >= PUSH_LIMIT) return { ok: false };
    moves.push(c);
    c = world.neighbor(c, f);
  }
  return { ok: true, moves, destroy };
}

function extend(e, p) {
  const w = e.world; const st = w.states[p]; const f = S.facing(st);
  const plan = resolvePush(w, p);
  if (!plan.ok) return;
  if (plan.destroy >= 0) e.breakBlock(plan.destroy);
  for (let i = plan.moves.length - 1; i >= 0; i--) {
    const from = plan.moves[i]; const to = w.neighbor(from, f);
    const id = w.ids[from]; const s = w.states[from];
    e.replace(to, id, s);
    e.replace(from, 0, 0);
  }
  const front = w.neighbor(p, f);
  const headState = setField(setField(setField(0, 'facing', f), 'mode', BLOCKS[w.ids[p]].sticky ? 1 : 0), 'extended', 1);
  e.replace(front, ID.PISTON_HEAD, headState);
  e.setState(p, setField(st, 'extended', 1));
}

function pullable(w, c) {
  if (c < 0 || w.ids[c] === 0) return false;
  const b = BLOCKS[w.ids[c]];
  if (b.immovable || b.destroy || b.head) return false;
  return !(b.piston && S.extended(w.states[c]));
}

function retract(e, p) {
  const w = e.world; const st = w.states[p]; const f = S.facing(st);
  const head = w.neighbor(p, f);
  if (w.ids[head] === ID.PISTON_HEAD) e.replace(head, 0, 0);
  e.setState(p, setField(st, 'extended', 0));
  if (!BLOCKS[w.ids[p]].sticky) return;
  const far = w.neighbor(head, f);
  if (!pullable(w, far)) return;
  e.replace(head, w.ids[far], w.states[far]);
  e.replace(far, 0, 0);
}

export function handlePistonEvent(e, ev) {
  const w = e.world; const id = w.ids[ev.p];
  if (!BLOCKS[id].piston) return;
  const should = pistonShouldExtend(w, ev.p);
  if (ev.type === 0 && should && !S.extended(w.states[ev.p])) extend(e, ev.p);
  else if (ev.type === 1 && !should && S.extended(w.states[ev.p])) retract(e, ev.p);
}
