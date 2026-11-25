import * as THREE from 'three';
import gsap from 'gsap';
import { Layer, tex } from '../stage/layer.js';
import { cam, $, slamIn, say, seg, smooth, outExpo, NUM } from './kit.js';

// The same eleven beats, ten winters later. The twelfth is the film's only button.
const A = 0.16, B = 0.58;
export function twelve({ stage, fx, sound, go }) {
  const el = $('#twelve'), scene = new THREE.Scene(), camera = cam(35);
  const oni = new Layer(tex('./art/oni.webp'), { z: -4, cover: 1.15, order: 0, depth: tex('./art/oni_d.webp'), portrait: { x: 0.12, cover: 1.15 } });
  const mask = new Layer(tex('./art/mask.webp'), { z: -4, cover: 1.15, order: 1, depth: tex('./art/mask_d.webp') });
  for (const l of [oni, mask]) { l.place(camera); scene.add(l.mesh); }
  const count = $('.count', el), btn = $('#name'); let n = -1;
  btn.addEventListener('click', () => { sound.heart(1.4); stage.impact(120); go('twelve', 1, 1.5); setTimeout(() => go('sky', 0.16, 2.6), 1500); });
  const tl = gsap.timeline({ paused: true });
  slamIn(tl, $('.tw-t1', el), 0.03, 0.14);
  say(tl, '#twelve .v1', 0.6, 0.66); say(tl, '#twelve .v2', 0.7, 0.95);
  tl.fromTo('#twelve .call', { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 0.05, ease: 'back.out(2.4)' }, 0.72).to('#twelve .call', { autoAlpha: 0, scale: 1.6, duration: 0.03 }, 0.94).set({}, {}, 1);
  return {
    id: 'twelve', name: 'Twelve', el, scene, camera, tl, clear: 0x05091c, ink: 'water',
    out: { type: 'shatter', span: 1.05, center: [0.5, 0.56], ease: (t) => t, scarf: 3 },
    look: (p) => ({ duo: outExpo(seg(p, 0, 0.05)) * (p < 0.999 ? 1 : 1), center: [0.5, 0.56], crack: seg(p, 0.4, 0.97) * 1.0, letterbox: 1 - seg(p, 0.96, 1), glow: 0.35, lines: 0.45 * seg(p, 0.9, 1) }),
    beats: [[0.02, () => { stage.impact(120); sound.stop(); }], [0.93, () => { stage.beat(1.6); stage.impact(90); sound.heart(1.6); fx.boom(innerWidth / 2, innerHeight * 0.44, false); }]],
    resize() { oni.place(camera); mask.place(camera); },
    update({ time, mouse }) {
      const p = this.p ?? 0, k = p < A ? 0 : p > 0.93 ? 12 : Math.min(11, 1 + Math.floor(seg(p, A, B) * 11));
      if (k !== n) {
        if (k > n && k > 0 && this.el.classList.contains('is-live')) { stage.beat(1); sound.heart(1); }
        n = k; count.textContent = [...NUM[k]].join('\n'); count.classList.toggle('dbl', NUM[k].length > 1); count.classList.remove('hit'); void count.offsetWidth; if (k) count.classList.add('hit');
      }
      oni.u.uTime.value = mask.u.uTime.value = time;
      mask.opacity = k >= 8 ? 1 : 0;
      const s = smooth(p); camera.position.set(0, 0, 10 - s * 1.5 - k * 0.05);
      for (const l of [oni, mask]) { l.u.uPar.value.set(mouse.x * 0.014 + (s - 0.5) * 0.02, mouse.y * 0.01); l.u.uDolly.value = s * 0.08; }
    },
  };
}
