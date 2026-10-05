// Pointer gesture recognizer shared by 2D and 3D views.
// 1 finger: press (preview) -> release commits; moving > threshold cancels the press and becomes a drag
// (only when oneFingerDrag() is true). 2 fingers: pinch + pan. Long press fires once without moving.
const MOVE_PX = 12; const LONG_MS = 500;

export class Gestures {
  /** h: { onPress(pt), onCommit(pt), onCancel(), onLongPress(pt), onDrag(dx,dy), onPinch(f,cx,cy), onPan(dx,dy), oneFingerDrag() } */
  constructor(el, h) {
    this.el = el; this.h = h; this.ptrs = new Map(); this.state = 'idle'; this.timer = 0;
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', (e) => this.down(e));
    el.addEventListener('pointermove', (e) => this.move(e));
    el.addEventListener('pointerup', (e) => this.up(e, false));
    el.addEventListener('pointercancel', (e) => this.up(e, true));
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('wheel', (e) => { e.preventDefault(); const r = el.getBoundingClientRect(); h.onPinch(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  }
  pt(e) { const r = this.el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }

  down(e) {
    e.preventDefault();
    try { this.el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    this.ptrs.set(e.pointerId, this.pt(e));
    if (this.ptrs.size === 1) {
      this.start = this.pt(e); this.last = this.start; this.state = 'pending'; this.long = false;
      this.h.onPress(this.start);
      clearTimeout(this.timer);
      this.timer = setTimeout(() => { if (this.state === 'pending') { this.long = true; this.h.onLongPress(this.start); } }, LONG_MS);
    } else if (this.ptrs.size === 2) {
      if (this.state === 'pending') this.h.onCancel();
      clearTimeout(this.timer); this.state = 'multi'; this.multiInit();
    }
  }
  multiInit() {
    const [a, b] = [...this.ptrs.values()];
    this.dist = Math.hypot(a.x - b.x, a.y - b.y) || 1; this.mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }
  move(e) {
    if (!this.ptrs.has(e.pointerId)) return;
    const p = this.pt(e); this.ptrs.set(e.pointerId, p);
    if (this.state === 'multi' && this.ptrs.size >= 2) return this.moveMulti();
    if (this.state === 'pending') {
      if (Math.hypot(p.x - this.start.x, p.y - this.start.y) > MOVE_PX) {
        clearTimeout(this.timer); this.h.onCancel();
        this.state = this.h.oneFingerDrag() ? 'drag' : 'dead';
        if (this.state === 'drag') this.h.onDrag(p.x - this.start.x, p.y - this.start.y);
        this.last = p;
      }
    } else if (this.state === 'drag') {
      this.h.onDrag(p.x - this.last.x, p.y - this.last.y); this.last = p;
    }
  }
  moveMulti() {
    const [a, b] = [...this.ptrs.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y) || 1; const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    this.h.onPinch(d / this.dist, mid.x, mid.y); this.h.onPan(mid.x - this.mid.x, mid.y - this.mid.y);
    this.dist = d; this.mid = mid;
  }
  up(e, cancelled) {
    const p = this.ptrs.get(e.pointerId); this.ptrs.delete(e.pointerId);
    if (this.state === 'pending' && this.ptrs.size === 0) {
      clearTimeout(this.timer);
      if (cancelled || this.long) { this.h.onCancel(); } else this.h.onCommit(this.pt(e) || p);
      this.state = 'idle';
    } else if (this.ptrs.size === 0) { this.state = 'idle'; clearTimeout(this.timer); }
    else if (this.state === 'multi' && this.ptrs.size === 1) { this.state = 'dead'; }
  }
}
