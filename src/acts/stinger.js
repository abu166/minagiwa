import * as THREE from 'three';
import gsap from 'gsap';
import { Layer, tex } from '../stage/layer.js';
import { particles } from '../stage/particles.js';
import { cam, $, slamIn, say, smooth } from './kit.js';

// After the credits.
export function stinger() {
  const el = $('#stinger'), scene = new THREE.Scene(), camera = cam(35);
  const bg = new Layer(tex('./art/lanterns.webp'), { z: -4, cover: 1.2, order: 0, depth: tex('./art/lanterns_d.webp'), water: 0.008, horizon: 0.3 });
  bg.place(camera); scene.add(bg.mesh);
  const em = particles({ kind: 'ember', n: 150, box: [18, 12, 10], size: 0.05, vel: [0.1, 0.5, 0], c1: 0xffe9b0, c2: 0xffa640, seed: 99 });
  scene.add(em.mesh);
  const tl = gsap.timeline({ paused: true });
  say(tl, '#stinger .v1', 0.12, 0.4); slamIn(tl, $('.st-t', el), 0.5, 0); tl.set({}, {}, 1);
  return {
    id: 'stinger', name: '', el, scene, camera, tl, clear: 0x02040c, hidden: true, ink: 'fire',
    look: () => ({ glow: 0.9, thresh: 0.55, letterbox: 1 }),
    resize() { bg.place(camera); },
    update({ time, mouse }) {
      const p = this.p ?? 0, s = smooth(p);
      bg.u.uTime.value = em.u.uTime.value = time; em.u.uScroll.value = p * 4;
      camera.position.set(0, (s - 0.5) * 0.6, 9 + s); bg.u.uPar.value.set(mouse.x * 0.014, mouse.y * 0.01 + (s - 0.5) * 0.02);
    },
  };
}
