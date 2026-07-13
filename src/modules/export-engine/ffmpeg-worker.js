/**
 * Web Worker responsible for MP4 export via FFmpeg.wasm — built in ETAP 4.
 *
 * Planned responsibility: isolate FFmpeg.wasm's heavy WASM/memory work off
 * the main thread. It will receive a sequence of rendered frames (produced
 * by stepping Preview Engine's canvas-renderer.js draw routines offscreen,
 * frame-by-frame, rather than in real time) via postMessage, encode them to
 * MP4, and post back progress events + the final Blob.
 *
 * Reusing canvas-renderer.js/effect renderers for frame generation (instead
 * of re-implementing rendering here) avoids duplicating drawing logic
 * between preview and export.
 */
