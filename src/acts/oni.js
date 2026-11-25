import * as THREE from 'three';
import gsap from 'gsap';
import { Layer, tex } from '../stage/layer.js';
import { Panel } from '../stage/panel.js';
import { particles } from '../stage/particles.js';
import { cam, $, slamIn, seg, smooth, outExpo, isPortrait } from './kit.js';

export function oni({ stage, fx, sound }) {
  const el = $('#oni'), scene = new THREE.Scene(), camera = cam(35);
  const bg = new Layer(tex('./art/oni_wide.webp'), { z: -4, cover: 1.2, order: 0, depth: tex('./art/oni_wide_d.webp'), water: 0.01, horizon: 0.25 });
  const full = new Layer(tex('./art/onis.webp'), { z: -4, cover: 1.3, y: -0.14, order: 1, depth: tex('./art/onis_d.webp') });
  for (const l of [bg, full]) { l.place(camera); scene.add(l.mesh); }
  const pa = new Panel(tex('./art/eyes.webp'), { border: 8, edge: 0xffffff, order: 80, depth: tex('./art/eyes_d.webp') }), pb = new Panel(tex('./art/oni.webp'), { border: 8, edge: 0xffffff, order: 81, depth: tex('./art/oni_d.webp') });
  scene.add(pa.mesh, pb.mesh); pa.mesh.visible = pb.mesh.visible = false; const st = { a: -1.05, b: 1.05 };
  const ash = particles({ kind: 'ember', n: 150, box: [20, 12, 12], size: 0.06, vel: [0.5, 0.9, 0.3], c1: 0xff3a2a, c2: 0xffb12a, seed: 12 });
  const rain = particles({ kind: 'rain', n: 160, box: [22, 14, 12], size: 0.11, vel: [-4, -16, 0], c1: 0xffd0c4, c2: 0xff5a44, seed: 17 });
  scene.add(ash.mesh, rain.mesh);
  const tl = gsap.timeline({ paused: true });
  slamIn(tl, $('.oni-t1', el), 0.06, 0.24); slamIn(tl, $('.oni-t2', el), 0.3, 0.45);
  tl.fromTo(st, { a: -1.05 }, { a: 0, duration: 0.06, ease: 'expo.out' }, 0.5)
    .fromTo(st, { b: 1.05 }, { b: 0, duration: 0.06, ease: 'expo.out' }, 0.57)
    .fromTo('.oni-t3 span', { autoAlpha: 0, scale: 2.6, rotate: (i) => (i ? 8 : -8) }, { autoAlpha: 1, scale: 1, rotate: 0, duration: 0.04, stagger: 0.1, ease: 'power4.in' }, 0.64)
    .to(st, { a: 1.1, b: -1.1, duration: 0.06, ease: 'power3.in' }, 0.89)
    .to('.oni-t3', { autoAlpha: 0, scale: 1.5, duration: 0.04, ease: 'power2.in' }, 0.89)
    .set({}, {}, 1);
  return {
    id: 'oni', name: 'What Came Up', ink: 'blood', el, scene, camera, tl, clear: 0x1a0208,
    out: { type: 'burn', span: 0.9, scarf: 1 },
    look: (p) => ({ glow: 0.8, thresh: 0.55, letterbox: seg(p, 0.02, 0.08) * (1 - seg(p, 0.25, 0.28)) + seg(p, 0.46, 0.5) * (1 - seg(p, 0.93, 0.98)), lines: seg(p, 0.86, 0.94) * 0.9 }),
    beats: [
      [0.05, () => fx.rumble()], [0.28, () => { stage.impact(100); stage.kickLines(1); sound.hit(1); }],
      [0.53, () => { stage.impact(70); stage.flashWhite(0.5); fx.slam(innerWidth * 0.2, innerHeight * 0.35); }],
      [0.6, () => { stage.impact(70); fx.slam(innerWidth * 0.8, innerHeight * 0.65); }],
      [0.78, () => fx.boom(innerWidth * 0.5, innerHeight * 0.45)],
    ],
    resize() { bg.place(camera); full.place(camera); },
    update({ time, mouse }) {
      const p = this.p ?? 0;
      bg.u.uTime.value = ash.u.uTime.value = rain.u.uTime.value = time;
      const s = Math.floor(time * 12), q = seg(p, 0.1, 0.16) * (1 - seg(p, 0.3, 0.36)) * 0.05;
      camera.position.set(mouse.x * 0.3 + Math.sin(s * 7.7) * q, mouse.y * 0.2 + Math.cos(s * 5.1) * q + (0.5 - p) * 0.8, 10 - smooth(Math.min(p, 0.28) / 0.28) * 2.0 * (p < 0.28 ? 1 : 0));
      ash.u.uScroll.value = p * 8;
      bg.scale(1 + Math.sin(time * 0.9) * 0.004);
      bg.u.uPar.value.set(mouse.x * 0.014, (p - 0.3) * 0.03); bg.u.uDolly.value = smooth(p) * 0.12;
      full.u.uTime.value = time; full.opacity = p > 0.28 ? 1 : 0; full.scale(1.12 - outExpo(seg(p, 0.28, 0.5)) * 0.12);
      full.u.uPar.value.set(mouse.x * 0.016, (p - 0.5) * 0.04);
      const w = innerWidth, h = innerHeight, on = p > 0.48 && p < 0.97; pa.mesh.visible = pb.mesh.visible = on;
      if (on) {
        const xa = st.a * w, xb = st.b * w, yl = isPortrait() ? 0.5 : 0.57, yr = isPortrait() ? 0.38 : 0.34, drift = seg(p, 0.48, 0.92);
        pa.set([[xa - 30, -20], [xa + w + 30, -20], [xa + w + 30, h * yr], [xa - 30, h * yl]], { w, h, zoom: 1.28 - drift * 0.1, focus: [0.62, 0.45], slide: [(0.5 - drift) * 0.06, 0], par: [mouse.x * 0.016, 0.01 - drift * 0.02] });
        pb.set([[xb - 30, h * (yl + 0.015)], [xb + w + 30, h * (yr + 0.015)], [xb + w + 30, h + 20], [xb - 30, h + 20]], { w, h, zoom: 1.24 - drift * 0.08, focus: [0.42, 0.3], slide: [(drift - 0.5) * 0.06, 0], par: [mouse.x * 0.016, drift * 0.02 - 0.01] });
        pa.mesh.visible = Math.abs(st.a) < 1.04; pb.mesh.visible = Math.abs(st.b) < 1.04;
      }
    },
  };
}
