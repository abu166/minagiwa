import * as THREE from 'three';
import gsap from 'gsap';
import { Layer, tex, textTex } from '../stage/layer.js';
import { ribbon, FLAME } from '../stage/ribbon.js';
import { particles } from '../stage/particles.js';
import { cam, backdrop, $, chars, seg, smooth, lerp, isPortrait } from './kit.js';

// Drawn fire: stepped tongues with hard edges, climbing.
const FIRE = /* glsl */ `
uniform float uHeat;
void main(){
  vec2 p = (vUv-.5)*vec2(uAsp,1.);
  float t = floor(uTime*12.)/12.;
  vec2 q = vec2(p.x*2.6, p.y*1.5);
  q.x += sin(p.y*5.+t*2.)*.12;
  float n = fbm(q*1.6+vec2(0.,-t*1.5)) + .5*fbm(q*4.+vec2(t*.3,-t*2.6));
  float h = n - (vUv.y*.95) + uHeat*.42 - abs(p.x)*.1 + uP*.12;
  vec3 c = vec3(.10,.012,.03);
  if (h>.02) c = vec3(.30,.02,.04);
  if (h>.16) c = vec3(.66,.06,.04);
  if (h>.30) c = vec3(.93,.23,.05);
  if (h>.46) c = vec3(1.,.55,.08);
  if (h>.66) c = vec3(1.,.86,.36);
  if (abs(h-.16)<.006||abs(h-.02)<.005) c = vec3(.06,.0,.02);
  gl_FragColor = vec4(c,1.);
}`;

export function fire({ stage, fx }) {
  const el = $('#fire'), scene = new THREE.Scene(), camera = cam(38);
  const u = { uTime: { value: 0 }, uAsp: { value: 1 }, uP: { value: 0 }, uHeat: { value: 0.35 } };
  scene.add(backdrop(FIRE, u));
  const kanji = new Layer(textTex('炎', { font: 'Yuji Boku', size: 900, color: '#12020a' }), { z: -2.5, x: -0.16, h: 1.15, order: 1, portrait: { x: 0 } });
  const hero = new Layer(tex('./art/fire_char.webp'), { z: 0, x: 0.07, h: 1.14, y: -0.06, order: 5, solid: true, wind: 0.02, outline: 6, outlineColor: 0x12020a, portrait: { x: 0, y: -0.1, h: 0.74 } });
  for (const l of [kanji, hero]) { l.place(camera); scene.add(l.mesh); }
  const pts = [[8, -5, 2], [4.8, -3.2, 0.5], [2.6, -2.2, -1.8]];
  for (let i = 0; i <= 14; i++) { const a = 2.4 + i / 14 * Math.PI * 3, k = 1 - i / 14 * 0.1; pts.push([Math.sin(a) * 3.3 * k, -2 + i / 14 * 3.6, Math.cos(a) * 2.3]); }
  pts.push([-2, 2.6, -2], [-3.5, 4.5, -4], [0, 7, -6]);
  const flame = ribbon(pts, { radius: 0.46, len: 0.7, palette: FLAME, foam: 380, foamSize: 0.13 });
  scene.add(flame.group);
  const em = particles({ kind: 'ember', n: 260, box: [18, 12, 12], size: 0.055, vel: [0.3, 1.9, 0.2], c1: 0xffd23d, c2: 0xff5a1f, seed: 30 });
  scene.add(em.mesh);
  const t = chars($('.fire-t', el));
  const slider = $('sakuga-slider', el), st = { heat: 0.35, to: 0.35 };
  slider.addEventListener('input', () => { st.to = slider.value / 100; fx.ping(st.to); });
  slider.addEventListener('change', () => { if (slider.value > 85) { stage.impact(110); stage.kickLines(1); fx.boom(innerWidth / 2, innerHeight * 0.42); } });
  const tl = gsap.timeline({ paused: true });
  tl.fromTo(t, { yPercent: 140, rotate: (i) => (i % 3 - 1) * 18, autoAlpha: 0 }, { yPercent: 0, rotate: 0, autoAlpha: 1, stagger: 0.0025, duration: 0.07, ease: 'back.out(1.8)' }, 0.16)
    .fromTo('.heat', { autoAlpha: 0, y: 70 }, { autoAlpha: 1, y: 0, duration: 0.08, ease: 'back.out(1.6)' }, 0.34)
    .to('.heat', { autoAlpha: 0, y: 60, duration: 0.05 }, 0.8)
    .to(t, { yPercent: -120, autoAlpha: 0, stagger: 0.002, duration: 0.05, ease: 'power2.in' }, 0.8).set({}, {}, 1);
  return {
    id: 'fire', num: '六', name: 'Boiling Point', el, scene, camera, tl, clear: 0x1a0208,
    out: { type: 'iris', span: 0.95, center: [0.5, 0.5] },
    lines: (p) => 0.5 * seg(p, 0, 0.05) * (1 - seg(p, 0.1, 0.2)) + seg(st.heat, 0.8, 1) * 0.5,
    beats: [[0.14, () => { stage.flashWhite(0.7); fx.boom(innerWidth * 0.5, innerHeight * 0.4); }]],
    resize(w, h) { u.uAsp.value = w / h; kanji.place(camera); hero.place(camera); flame.group.scale.setScalar(isPortrait() ? 0.6 : 1); },
    update({ time, mouse, dt }) {
      const p = this.p ?? 0;
      st.heat = lerp(st.heat, st.to, 1 - Math.exp(-dt * 5));
      for (const o of [u, hero.u, flame.u, em.u]) o.uTime.value = time;
      u.uP.value = p; u.uHeat.value = st.heat - 0.25 + p * 0.25;
      flame.u.uHead.value = 0.1 + p * 1.5;
      flame.u.uRadius.value = 0.34 + st.heat * 0.34; flame.u.uBoil.value = 1 + st.heat;
      em.u.uSize.value = 0.035 + st.heat * 0.06; em.u.uScroll.value = p * 8;
      const a = Math.sin(p * 5 - 1) * 0.22 + mouse.x * 0.06;
      camera.position.set(Math.sin(a) * 10, -0.5 + mouse.y * 0.25 + p * 0.7, Math.cos(a) * 10 - smooth(seg(p, 0.7, 1)) * 1.5);
      camera.lookAt(0, 0.1, 0);
      kanji.move(0, 0.03 - p * 0.12); kanji.scale(0.85 + p * 0.35);
      hero.scale(0.94 + p * 0.16);
    },
  };
}
