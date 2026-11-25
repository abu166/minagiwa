import * as THREE from 'three';
import gsap from 'gsap';
import { Layer, tex } from '../stage/layer.js';
import { particles } from '../stage/particles.js';
import { cam, $, chars, seg, smooth } from './kit.js';

export function dawn({ stage, fx }) {
  const el = $('#dawn'), scene = new THREE.Scene(), camera = cam(35);
  const bg = new Layer(tex('./art/dawn_bg.webp'), { z: -8, cover: 1.18, order: 0 });
  const hero = new Layer(tex('./art/dawn_char.webp'), { z: -1, x: 0.23, h: 0.82, anchor: 'bottom', order: 10, wind: 0.014, pivot: [0.5, 0.35], portrait: { x: 0.14, y: 0.34, h: 0.44 } });
  for (const l of [bg, hero]) { l.place(camera); scene.add(l.mesh); }
  const petals = particles({ kind: 'petal', n: 130, box: [22, 12, 12], size: 0.085, c1: 0xffffff, c2: 0xff8fae, seed: 41 });
  const near = particles({ kind: 'petal', n: 22, box: [14, 9, 3], size: 0.2, c1: 0xff4a3a, c2: 0xd01f2b, seed: 43, order: 70 });
  near.mesh.position.z = 4.5; scene.add(petals.mesh, near.mesh);
  const t = chars($('.dawn-t', el));
  const tl = gsap.timeline({ paused: true });
  tl.fromTo(t, { yPercent: 120, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, stagger: 0.007, duration: 0.12, ease: 'power3.out' }, 0.14)
    .fromTo('.oath', { autoAlpha: 0, y: 120, rotate: -4 }, { autoAlpha: 1, y: 0, rotate: 0, duration: 0.16, ease: 'back.out(1.5)' }, 0.48)
    .set({}, {}, 1);
  return {
    id: 'dawn', num: '七', name: 'Morning', el, scene, camera, tl, clear: 0xffd9a8,
    resize() { bg.place(camera); hero.place(camera); },
    update({ time, mouse }) {
      const p = this.p ?? 0, s = smooth(p);
      for (const o of [bg.u, hero.u, petals.u, near.u]) o.uTime.value = time;
      petals.u.uScroll.value = near.u.uScroll.value = p * 9;
      camera.position.set(mouse.x * 0.35, mouse.y * 0.2 + s * 0.3, 8.4 + s * 1.6);
      bg.move(-mouse.x * 0.006, 0.03 - s * 0.05);
      hero.move(0.02 * s, Math.sin(time * 1.6) * 0.002);
      hero.scale(1.12 - s * 0.12);
    },
  };
}
