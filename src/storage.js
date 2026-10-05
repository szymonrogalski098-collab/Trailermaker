// Persistence: versioned JSON (RLE), localStorage autosave/slots, settings, file export/import.
import { BLOCKS } from './blocks.js';
import { World } from './world.js';

export const FORMAT_VERSION = 1;
const KEY_AUTOSAVE = 'rse.autosave'; const KEY_SETTINGS = 'rse.settings'; const KEY_SLOT = 'rse.slot.';

export function rleEncode(arr) {
  const out = [];
  let i = 0;
  while (i < arr.length) {
    const v = arr[i]; let j = i + 1;
    while (j < arr.length && arr[j] === v) j++;
    out.push(v, j - i); i = j;
  }
  return out;
}
export function rleDecode(pairs, length, label) {
  if (!Array.isArray(pairs) || pairs.length % 2) throw new Error(`${label}: invalid RLE`);
  const out = new Uint32Array(length); let pos = 0;
  for (let i = 0; i < pairs.length; i += 2) {
    const v = pairs[i]; const n = pairs[i + 1];
    if (!Number.isInteger(v) || v < 0 || !Number.isInteger(n) || n < 1) throw new Error(`${label}: bad run at ${i}`);
    if (pos + n > length) throw new Error(`${label}: data longer than grid`);
    out.fill(v, pos, pos + n); pos += n;
  }
  if (pos !== length) throw new Error(`${label}: data shorter than grid (${pos}/${length})`);
  return out;
}

export function serializeWorld(world, metadata = {}) {
  const palette = []; const remap = new Map();
  const mapped = new Uint32Array(world.ids.length);
  for (let i = 0; i < world.ids.length; i++) {
    const id = world.ids[i];
    if (!remap.has(id)) { remap.set(id, palette.length); palette.push(BLOCKS[id].name); }
    mapped[i] = remap.get(id);
  }
  return { version: FORMAT_VERSION, size: [world.sx, world.sy, world.sz], palette,
    blocks: rleEncode(mapped), states: rleEncode(world.states), metadata: { savedAt: Date.now(), ...metadata } };
}

export function deserializeWorld(data) {
  if (!data || typeof data !== 'object') throw new Error('Not a valid JSON object');
  if (data.version !== FORMAT_VERSION) throw new Error(`Unsupported version: ${data.version}`);
  const { size, palette } = data;
  if (!Array.isArray(size) || size.length !== 3 || !size.every((n) => Number.isInteger(n) && n >= 1 && n <= 64)) {
    throw new Error('Invalid size (each axis 1..64)');
  }
  if (!Array.isArray(palette) || !palette.length) throw new Error('Invalid palette');
  const ids = palette.map((name) => {
    const b = BLOCKS.find((x) => x.name === name);
    if (!b) throw new Error(`Unknown block in palette: ${name}`);
    return b.id;
  });
  const [sx, sy, sz] = size; const len = sx * sy * sz;
  const idx = rleDecode(data.blocks, len, 'blocks');
  const states = rleDecode(data.states, len, 'states');
  const world = new World(sx, sy, sz);
  for (let i = 0; i < len; i++) {
    if (idx[i] >= ids.length) throw new Error(`blocks: palette index out of range at ${i}`);
    world.ids[i] = ids[idx[i]]; world.states[i] = states[i];
  }
  return { world, metadata: data.metadata || {} };
}

// ---- localStorage (all accessors guarded) ----
const ls = () => { try { return globalThis.localStorage || null; } catch { return null; } };
function readJSON(key) { try { const s = ls()?.getItem(key); return s ? JSON.parse(s) : null; } catch { return null; } }
function writeJSON(key, value) { try { ls()?.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }

export const Storage = {
  saveAutosave: (world, meta) => writeJSON(KEY_AUTOSAVE, serializeWorld(world, meta)),
  loadAutosave() { const d = readJSON(KEY_AUTOSAVE); if (!d) return null; try { return deserializeWorld(d); } catch { return null; } },
  saveSlot: (name, world) => writeJSON(KEY_SLOT + name, serializeWorld(world, { name })),
  loadSlot(name) { const d = readJSON(KEY_SLOT + name); if (!d) throw new Error('Slot not found'); return deserializeWorld(d); },
  deleteSlot(name) { try { ls()?.removeItem(KEY_SLOT + name); } catch { /* ignore */ } },
  listSlots() {
    const out = [];
    try {
      const s = ls(); if (!s) return out;
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i);
        if (k && k.startsWith(KEY_SLOT)) out.push({ name: k.slice(KEY_SLOT.length), savedAt: (readJSON(k)?.metadata || {}).savedAt || 0 });
      }
    } catch { /* ignore */ }
    return out.sort((a, b) => b.savedAt - a.savedAt);
  },
  loadSettings: () => readJSON(KEY_SETTINGS) || {},
  saveSettings: (settings) => writeJSON(KEY_SETTINGS, settings),
};

export function exportToFile(world, name = 'redstone-world') {
  const blob = new Blob([JSON.stringify(serializeWorld(world, { name }))], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${name}.json`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export async function importFromFile(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch (err) { throw new Error('File is not valid JSON'); }
  return deserializeWorld(data);
}
