import { runAll } from './harness.js';
import './phase1.js';
import './phase3.js';
try { await import('./phase2.js'); } catch (err) { if (err.code !== 'ERR_MODULE_NOT_FOUND') throw err; }
await runAll();
