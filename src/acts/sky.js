import * as THREE from 'three';
import gsap from 'gsap';
import { Layer, tex, textTex } from '../stage/layer.js';
import { particles } from '../stage/particles.js';
import { cam, $, say, slamIn, seg, smooth, outExpo } from './kit.js';

// The boy under the mask; then the third way to read the character.
export function sky() {
  const el = $('#sky'), scene = new THREE.Scene(), camera = cam(35);
  const boy = new Layer(tex('./art/sora.webp'), { z: -4, cover: 1.18, order: 20, depth: tex('./art/sora_d.webp') });
  const bg = new Layer(tex('./art/skyend.webp'), { z: -8, cover: 1.2, order: 0, depth: tex('./art/skyend_d.webp'), water: 0.008, horizon: 0.24 });
  const kanji = new Layer(textTex('空', { font: 'Yuji Boku', size: 900, color: '#ffffff' }), { z: -5, x: -0.14, y: 0.1, h: 0.86, order: 4, portrait: { x: 0, y: 0.16, h: 0.46 } });
  const hero = new Layer(tex('./art/dawn_char.webp'), { z: -1, x: 0.2, h: 0.78, anchor: 'bottom', order: 10, wind: 0.014, pivot: [0.5, 0.35], portrait: { x: 0.14, h: 0.52 } });
  const drops = particles({ kind: 'foam', n: 120, box: [20, 12, 10], size: 0.045, vel: [0.1, 0.5, 0], c1: 0xffffff, c2: 0xcdeaff, seed: 91, order: 25 });
  const petals = particles({ kind: 'petal', n: 120, box: [22, 12, 12], size: 0.08, c1: 0xffffff, c2: 0xe5261f, seed: 93, order: 15 });
  for (const l of [bg, kanji, hero, boy]) { l.place(camera); scene.add(l.mesh); }
  scene.add(drops.mesh, petals.mesh);
  const tl = gsap.timeline({ paused: true });
  slamIn(tl, $('.sk-t1', el), 0.08, 0.2); say(tl, '#sky .v1', 0.23, 0.34);
  say(tl, '#sky .v2', 0.5, 0.64); slamIn(tl, $('.sk-t2', el), 0.72, 0);
  tl.set({}, {}, 1);
  return {
    id: 'sky', name: 'Sky', el, scene, camera, tl, clear: 0xbfe6ff, ink: 'dusk',
    out: { type: 'cut', span: 0.02, lead: 1.2, full: true },
    look: (p) => ({ glow: 0.95 - seg(p, 0.5, 0.8) * 0.35, thresh: 0.58, letterbox: seg(p, 0.02, 0.1) * (1 - seg(p, 0.34, 0.42)) }),
    resize() { for (const l of [bg, kanji, hero, boy]) l.place(camera); },
    update({ time, mouse }) {
      const p = this.p ?? 0, a = seg(p, 0, 0.42), b = smooth(seg(p, 0.36, 1));
      for (const o of [bg.u, hero.u, boy.u, petals.u, drops.u]) o.uTime.value = time;
      // the memory burns away from its darkest parts, into light
      boy.opacity = 1 - smooth(seg(p, 0.36, 0.46)); boy.scale(1.1 - a * 0.08);
      boy.u.uPar.value.set(mouse.x * 0.014, mouse.y * 0.01); boy.u.uTint.value.set(0xffffff); boy.u.uTintAmt.value = smooth(seg(p, 0.33, 0.4)) * 0.9;
      drops.mesh.visible = p < 0.5; drops.u.uScroll.value = p * 6; petals.mesh.visible = p > 0.38; petals.u.uScroll.value = p * 5;
      bg.u.uPar.value.set(mouse.x * 0.012, (b - 0.5) * 0.02); bg.move(0, 0.04 - b * 0.06);
      const kk = outExpo(seg(p, 0.46, 0.6)); kanji.opacity = seg(p, 0.45, 0.52) * (1 - seg(p, 0.9, 1) * 0.25); kanji.move(0, -0.3 * (1 - kk) + b * 0.03); kanji.scale(0.8 + kk * 0.25);
      hero.move(0.02 * b, -0.5 * (1 - outExpo(seg(p, 0.42, 0.6)))); hero.scale(1.1 - b * 0.1);
      camera.position.set(mouse.x * 0.3, mouse.y * 0.18, 9 + b * 1);
    },
  };
}
