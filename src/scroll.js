import Lenis from 'lenis';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t) => t * t * (3 - 2 * t);

// Turns the scroll position into "which act, how far through it, and how far
// into the transition to the next". Each section is pinned and overlaps the next
// by one viewport, so an act's last frame is exactly the next act's first.
export class Director {
  constructor(acts, { onAct } = {}) {
    this.acts = acts; this.onAct = onAct; this.y = 0; this.vel = 0; this.index = -1;
    this.lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, anchors: true });
    addEventListener('resize', () => this.measure());
    this.measure();
  }
  measure() {
    this.vh = innerHeight;
    for (const a of this.acts) { a.top = a.el.offsetTop; a.len = a.el.offsetHeight - this.vh; }
  }
  raf(ms, dt) {
    this.lenis.raf(ms);
    this.y = this.lenis.scroll;
    const v = clamp(this.lenis.velocity / 70, -1, 1);
    this.vel += (v - this.vel) * (1 - Math.exp(-dt * 9));
    const { acts, vh } = this;
    let out = { a: acts[0], b: null, mix: 0, type: 'cut' };
    for (let i = 0; i < acts.length; i++) {
      const a = acts[i], n = acts[i + 1];
      const prev = a.p ?? 0;
      a.p = clamp((this.y - a.top) / Math.max(1, a.len));
      if (a.tl) a.tl.progress(a.p);
      if (a.beats && this.ready) for (const b of a.beats) if (prev < b[0] && a.p >= b[0] && a.p - prev < 0.35) b[1]();
      const begin = a.top - vh * 0.12;
      if (this.y >= begin || i === 0) {
        out = { a, b: null, mix: 0, type: 'cut', i };
        if (n) {
          const w = (a.out?.span ?? 0.8) * vh, s = n.top - vh * 0.12 - w;
          const m = clamp((this.y - s) / w);
          if (m > 0) out = { a, b: n, mix: (a.out?.ease ?? ease)(m), type: a.out?.type ?? 'iris', center: a.out?.center, i };
        }
      }
    }
    const live = out.mix > 0.55 ? out.i + 1 : out.i ?? 0;
    if (live !== this.index) {
      this.index = live;
      acts.forEach((a, i) => a.el.classList.toggle('is-live', i === live));
      this.onAct?.(acts[live], live);
    }
    const cur = out.a;
    return { ...out, velocity: this.vel, letterbox: cur.letterbox?.(cur.p) ?? 0, lines: cur.lines?.(cur.p) ?? 0 };
  }
  to(act, p = 0, o = {}) { this.lenis.scrollTo(act.top + act.len * p, { duration: 1.6, ...o }); }
}
