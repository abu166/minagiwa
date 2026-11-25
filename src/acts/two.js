import * as THREE from 'three';
import gsap from 'gsap';
import { Layer, tex } from '../stage/layer.js';
import { particles } from '../stage/particles.js';
import { cam, $, say, slamIn, smooth } from './kit.js';

// The brothers, and the scarf they share.
export function two() {
  const el = $('#two'), scene = new THREE.Scene(), camera = cam(35);
  const bg = new Layer(tex('./art/two.webp'), { z: -4, cover: 1.2, y: 0.05, order: 0, depth: tex('./art/two_d.webp'), water: 0.008, horizon: 0.37 });
  bg.place(camera); scene.add(bg.mesh);
  const petals = particles({ kind: 'petal', n: 70, box: [20, 12, 10], size: 0.06, c1: 0xfff1d6, c2: 0xffc38a, seed: 61 });
  scene.add(petals.mesh);
  const tl = gsap.timeline({ paused: true });
  slamIn(tl, $('.two-t', el), 0.1, 0.5);
  say(tl, '#two .v1', 0.26, 0.5); say(tl, '#two .v2', 0.58, 0.95);
  tl.set({}, {}, 1);
  return {
    id: 'two', name: 'Two Boys', el, scene, camera, tl, ink: 'dusk',
    out: { type: 'swell', span: 1.05, ease: (t) => t, scarf: 1 },
    look: () => ({ glow: 0.75, thresh: 0.6 }),
    resize() { bg.place(camera); },
    update({ time, mouse }) {
      const p = this.p ?? 0, s = smooth(p);
      bg.u.uTime.value = petals.u.uTime.value = time; petals.u.uScroll.value = p * 5;
      camera.position.set(0, (0.5 - s) * 0.5, 10 - s * 1.1);
      bg.u.uPar.value.set(mouse.x * 0.012 + (s - 0.5) * 0.018, mouse.y * 0.008 + (s - 0.5) * 0.01); bg.u.uDolly.value = s * 0.07;
    },
  };
}
