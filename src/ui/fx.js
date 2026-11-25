// Scroll beats drawn with the Sakuga VFX core: the same bursts, smoke and
// lettering the controls use, fired at moments in the film.
import { rm } from '../acts/kit.js';

export function makeFx(sound) {
  const S = window.SakugaFX, n = () => { };
  if (!S || rm) return { boom: n, cut: n, land: n, slam: n, rumble: n, bigSlash: n, ink: n };
  const X = (x) => x + scrollX, Y = (y) => y + scrollY;
  const R = (a, b) => a + Math.random() * (b - a);
  // the kit's effects, re-inked for each part of the story
  const INK = {
    water: { fill: '#ffffff', shade: '#8fc8ff', line: '#0e3fb4', accent: '#e5261f', ink: '#07102b', sfx: ['#07102b', '#ffffff'] },
    dusk: { fill: '#fffaf0', shade: '#ffc98a', line: '#b3421e', accent: '#e5261f', ink: '#3a0d12', sfx: ['#3a0d12', '#fffaf0'] },
    blood: { fill: '#fff1ec', shade: '#ff6a55', line: '#8a0d1c', accent: '#ffffff', ink: '#1d0208', sfx: ['#1d0208', '#ffffff'] },
    fire: { fill: '#fff6cf', shade: '#ffb21e', line: '#c22a08', accent: '#e5261f', ink: '#2a0408', sfx: ['#2a0408', '#fff3c4'] },
  };
  return {
    ink(k) { const c = INK[k]; if (c) Object.assign(S.P, c, { sfx: c.sfx }); },
    boom(x, y, word = true) {
      x = X(x); y = Y(y);
      const r = Math.min(innerWidth, innerHeight) * 0.26;
      S.burst(x, y, { r, spikes: 19, life: 0.42 });
      S.shards(x, y, { n: 22, speed: 620, size: 13, life: 1.1, arc: Math.PI * 2 });
      for (let i = 0; i < 6; i++) { const a = i / 6 * S.TAU + 0.3; S.later(60 + i * 18, () => S.puff(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.5, { n: 5, size: 30, vx: Math.cos(a) * 130, vy: Math.sin(a) * 60 - 30, life: 1 })); }
      if (word) S.later(50, () => S.sfx('don', x + r * 0.95, y - r * 0.7, { size: Math.min(280, innerWidth * 0.3), life: 1.2 }));
      sound.hit(1);
    },
    cut(fx, fy) {
      const x = X(innerWidth * fx), y = Y(innerHeight * fy);
      S.slash(x, y, { len: Math.min(520, innerWidth * 0.6), ang: -0.3, thick: 42, life: 0.5 });
      S.later(90, () => S.shards(x, y, { n: 12, speed: 420, size: 9, arc: Math.PI * 2 }));
      S.later(80, () => S.sfx('shu', x + 160, y - 110, { size: 190, ...S.hollow() }));
      sound.swish();
    },
    land(x, y, big) {
      x = X(x); y = Y(y);
      for (let i = -2; i <= 2; i++) S.puff(x + i * 90, y + R(-8, 8), { n: 4, size: big ? 34 : 22, vx: i * 46, vy: -18, life: 0.9 });
      S.ticks(x, y - 30, { n: 5, r: 60, len: 30, dir: -Math.PI / 2 });
      S.sfx(big ? 'don' : 'zuza', x + Math.min(260, innerWidth * 0.3), y - 40, { size: big ? 220 : 150, ...(big ? {} : S.dotted()) });
      sound.hit(big ? 0.9 : 0.4);
    },
    slam(x, y) { x = X(x); y = Y(y); S.burst(x, y, { r: 110, spikes: 15 }); S.lines(x, y, { n: 14, len: 260, spread: 180, life: 0.4 }); S.sfx('kachi', x, y - 90, { size: 180, ...S.hollow() }); sound.hit(0.7); },
    rumble() {
      const w = Math.min(420, innerWidth * 0.5);
      S.sfx('gogo', X(innerWidth * 0.78), Y(innerHeight * 0.3), { size: w, life: 1.9 });
      S.later(260, () => S.sfx('gogo', X(innerWidth * 0.7), Y(innerHeight * 0.74), { size: w * 0.7, life: 1.7, rot: 0.12 }));
      for (let i = 0; i < 9; i++) S.later(i * 70, () => S.shards(X(R(0.1, 0.9) * innerWidth), Y(innerHeight * 0.98), { n: 3, speed: 260, size: 8, dir: -Math.PI / 2, arc: 0.6, grav: 200, life: 1.2 }));
      sound.rumble();
    },
    bigSlash() {
      S.slash(X(innerWidth * 0.5), Y(innerHeight * 0.5), { len: innerWidth * 0.55, ang: -0.4, thick: 80, life: 0.6 });
      S.later(120, () => S.sfx('shu', X(innerWidth * 0.66), Y(innerHeight * 0.3), { size: Math.min(380, innerWidth * 0.5), life: 1.1, ...S.hollow() }));
      sound.swish(1.6); sound.hit(1);
    },
  };
}
