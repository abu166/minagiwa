import * as THREE from 'three';
import gsap from 'gsap';
import { Layer, tex } from '../stage/layer.js';
import { particles } from '../stage/particles.js';
import { cam, $, $$, chars, seg, smooth } from './kit.js';

export function oni({ stage, fx }) {
  const el = $('#oni'), scene = new THREE.Scene(), camera = cam(35);
  const bg = new Layer(tex('./art/oni_wide.webp'), { z: -4, cover: 1.2, order: 0, water: 0.01, horizon: 0.25 });
  bg.place(camera); scene.add(bg.mesh);
  const ash = particles({ kind: 'ember', n: 150, box: [20, 12, 12], size: 0.06, vel: [0.5, 0.9, 0.3], c1: 0xff3a2a, c2: 0xffb12a, seed: 12 });
  const rain = particles({ kind: 'rain', n: 160, box: [22, 14, 12], size: 0.11, vel: [-4, -16, 0], c1: 0xffd0c4, c2: 0xff5a44, seed: 17 });
  scene.add(ash.mesh, rain.mesh);
  const t1 = chars($('.oni-t1', el).firstChild ? $('.oni-t1', el) : el);
  const tl = gsap.timeline({ paused: true });
  tl.fromTo(t1, { yPercent: 120, autoAlpha: 0, rotate: 12 }, { yPercent: 0, autoAlpha: 1, rotate: 0, stagger: 0.004, duration: 0.07, ease: 'back.out(2)' }, 0.1)
    .to('.oni-t1', { scale: 1.06, duration: 0.2, ease: 'none' }, 0.2)
    .to('.oni-t1', { autoAlpha: 0, x: -220, skewX: 30, duration: 0.04, ease: 'power3.in' }, 0.4)
    .fromTo('.vs-a', { xPercent: -105 }, { xPercent: 0, duration: 0.07, ease: 'expo.out' }, 0.46)
    .fromTo('.vs-b', { xPercent: 105 }, { xPercent: 0, duration: 0.07, ease: 'expo.out' }, 0.54)
    .fromTo('.vs-a img', { xPercent: -9, scale: 1.25 }, { xPercent: 5, scale: 1.12, duration: 0.42, ease: 'none' }, 0.46)
    .fromTo('.vs-b img', { yPercent: 8, scale: 1.3 }, { yPercent: -7, scale: 1.15, duration: 0.36, ease: 'none' }, 0.54)
    .fromTo('.oni-t2 span', { autoAlpha: 0, scale: 2.6, rotate: (i) => (i ? 8 : -8) }, { autoAlpha: 1, scale: 1, rotate: 0, duration: 0.04, stagger: 0.09, ease: 'power4.in' }, 0.62)
    .to('.vs-a', { xPercent: 108, duration: 0.05, ease: 'power3.in' }, 0.86)
    .to('.vs-b', { xPercent: -108, duration: 0.05, ease: 'power3.in' }, 0.86)
    .to('.oni-t2', { autoAlpha: 0, scale: 1.5, duration: 0.04, ease: 'power2.in' }, 0.86)
    .set({}, {}, 1);
  return {
    id: 'oni', num: '五', name: 'What Came Up', el, scene, camera, tl, clear: 0x1a0208,
    out: { type: 'slash', span: 1.1, ease: (t) => t },
    letterbox: (p) => seg(p, 0.02, 0.1) * (1 - seg(p, 0.9, 0.97)),
    lines: (p) => seg(p, 0.84, 0.94) * 0.95,
    beats: [
      [0.1, () => fx.rumble()],
      [0.49, () => { stage.impact(70); stage.flashWhite(0.5); fx.slam(innerWidth * 0.2, innerHeight * 0.35); }],
      [0.57, () => { stage.impact(70); fx.slam(innerWidth * 0.8, innerHeight * 0.65); }],
      [0.66, () => fx.boom(innerWidth * 0.5, innerHeight * 0.45)],
      [0.97, () => { stage.impact(130); fx.bigSlash(); }],
    ],
    resize() { bg.place(camera); },
    update({ time, mouse }) {
      const p = this.p ?? 0;
      bg.u.uTime.value = ash.u.uTime.value = rain.u.uTime.value = time;
      const s = Math.floor(time * 12), q = seg(p, 0.1, 0.16) * (1 - seg(p, 0.3, 0.36)) * 0.05;
      camera.position.set(mouse.x * 0.3 + Math.sin(s * 7.7) * q, mouse.y * 0.2 + Math.cos(s * 5.1) * q + (0.5 - p) * 0.8, 10 - smooth(p) * 3.4);
      ash.u.uScroll.value = p * 8;
      bg.scale(1 + Math.sin(time * 0.9) * 0.004);
      bg.u.uTintAmt.value = seg(p, 0.86, 1) * 0.85;
    },
  };
}
