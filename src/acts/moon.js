import * as THREE from 'three';
import gsap from 'gsap';
import { Layer, tex, textTex } from '../stage/layer.js';
import { particles } from '../stage/particles.js';
import { cam, $, chars, seg, smooth, inCubic } from './kit.js';

export function moon({ stage, fx }) {
  const el = $('#moon'), scene = new THREE.Scene(), camera = cam(35);
  const bg = new Layer(tex('./art/hero_bg.webp'), { z: -8, cover: 1.16, order: 0, water: 0.014, horizon: 0.222 });
  const title = new Layer(textTex('水際', { font: 'Yuji Boku', size: 620, color: '#ffffff', vertical: true }), { z: -3, x: -0.07, y: 0.03, h: 1.04, order: 10, portrait: { h: 0.8, y: 0.08, x: -0.1 } });
  const hero = new Layer(tex('./art/hero_char.webp'), { z: 0, x: 0.17, h: 1.1, anchor: 'bottom', order: 20, wind: 0.012, pivot: [0.5, 0.35], portrait: { x: 0.08, h: 0.86 } });
  const back = particles({ kind: 'petal', n: 90, box: [22, 12, 8], size: 0.07, c1: 0xffffff, c2: 0xa9c8ff, seed: 3, order: 12 });
  const front = particles({ kind: 'petal', n: 26, box: [14, 9, 3], size: 0.17, c1: 0xff3b2e, c2: 0xc0141b, seed: 9, order: 40 });
  front.mesh.position.z = 4.5; back.mesh.position.z = -3;
  for (const l of [bg, title, hero]) { l.place(camera); scene.add(l.mesh); }
  scene.add(back.mesh, front.mesh);

  const h = chars($('h1', el));
  const tl = gsap.timeline({ paused: true });
  tl.to(h, { yPercent: -620, rotate: (i) => (i % 2 ? 24 : -18), stagger: 0.018, duration: 0.42, ease: 'power2.in' }, 0.05)
    .to('.hero-sub', { xPercent: -120, autoAlpha: 0, duration: 0.2, ease: 'power2.in' }, 0.04)
    .to('.hint', { autoAlpha: 0, duration: 0.08 }, 0)
    .set({}, {}, 1);

  return {
    id: 'moon', num: '一', name: 'The Water’s Edge', el, scene, camera, tl,
    out: { type: 'iris', span: 0.95, center: [0.5, 0.56] },
    lines: (p) => seg(p, 0.55, 0.95) * 0.5,
    intro: () => {
      gsap.from(h, { yPercent: 130, rotate: 18, duration: 0.9, stagger: 0.045, ease: 'back.out(1.7)' });
      gsap.from('.hero-sub', { x: -60, autoAlpha: 0, duration: 0.7, delay: 0.5, ease: 'power3.out' });
      hero.enter = 1; gsap.to(hero, { enter: 0, duration: 1.4, ease: 'expo.out' });
      title.enter = 1; gsap.to(title, { enter: 0, duration: 1.6, ease: 'expo.out', delay: 0.1 });
      stage.flashWhite(1); stage.kickLines(1); fx.boom(innerWidth * 0.5, innerHeight * 0.45);
    },
    resize() { for (const l of [bg, title, hero]) l.place(camera); },
    update({ time, mouse, velocity }) {
      const p = this.p ?? 0, push = smooth(seg(p, 0, 1));
      const e = hero.enter ?? 0, te = title.enter ?? 0;
      for (const l of [bg, title, hero]) l.u.uTime.value = time;
      back.u.uTime.value = front.u.uTime.value = time;
      front.u.uScroll.value = back.u.uScroll.value = p * 14;
      camera.position.x = mouse.x * 0.35; camera.position.y = mouse.y * 0.2;
      camera.position.z = 10 - inCubic(push) * 3;
      camera.rotation.z = -velocity * 0.03;
      hero.move(push * 0.02, -0.02 - push * 0.55 - e * 0.5); hero.scale(1 + push * 0.5);
      title.move(0, push * 0.75 + te * 0.4); title.scale(1 + te * 0.25 + push * 0.1);
      bg.scale(1 + push * 0.16); bg.move(-mouse.x * 0.006, -0.035 + push * -0.02);
    },
  };
}
