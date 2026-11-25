import * as THREE from 'three';
import gsap from 'gsap';
import { Layer, tex } from '../stage/layer.js';
import { ribbon, WATER } from '../stage/ribbon.js';
import { particles } from '../stage/particles.js';
import { cam, backdrop, $, cuttable, seg, smooth, isPortrait } from './kit.js';

// Seigaiha: the old overlapping-wave pattern, breathing.
const SEIGAIHA = /* glsl */ `
uniform vec3 c1,c2,c3;
vec3 scale(vec2 p, float t){
  vec3 c = c1; float row = floor(p.y*2.);
  for (int k=2;k>=-1;k--){
    float r = row+float(k);
    vec2 o = vec2(mod(r,2.)*.5, r*.5);
    vec2 q = vec2(fract(p.x-o.x)-.5, p.y-o.y);
    float d = length(q)/.5;
    if (d<1.) { float b = fract(d*3.-t); c = b<.5 ? c1 : c2; if (d>.94) c = c3; }
  }
  return c;
}
void main(){
  vec2 p = (vUv-.5)*vec2(uAsp,1.);
  float t = floor(uTime*12.)/12.;
  float l = length(p);
  p *= 1.-.16*smoothstep(0.,1.,l)*sin(uP*9.);
  p.y += uP*1.6; p += .02*sin(p.yx*4.+t);
  vec3 c = scale(p*4.2, t*.25);
  float glow = floor(smoothstep(.95,.05,l)*4.)/4.;
  c = mix(c, c2, glow*.35);
  gl_FragColor = vec4(c,1.);
}`;

export function breath({ stage, fx }) {
  const el = $('#breath'), scene = new THREE.Scene(), camera = cam(38);
  const u = { uTime: { value: 0 }, uAsp: { value: 1 }, uP: { value: 0 }, c1: { value: new THREE.Color(0x0b2f9e) }, c2: { value: new THREE.Color(0x1549cf) }, c3: { value: new THREE.Color(0x2f7bf0) } };
  scene.add(backdrop(SEIGAIHA, u));
  const hero = new Layer(tex('./art/slash.webp'), { z: 0, x: 0.08, y: 0, h: 0.96, order: 5, solid: true, wind: 0.02, outline: 7, outlineColor: 0xffffff, portrait: { h: 0.5 } });
  hero.place(camera); scene.add(hero.mesh);

  // A helix that swims round the figure, then off toward the lens.
  const pts = [[-9, -4, -5], [-5.5, -2.6, -2.4], [-1.5, -2.2, 1.6]];
  for (let i = 0; i <= 16; i++) { const a = -0.6 + i / 16 * Math.PI * 3.6, k = 1 - i / 16 * 0.25; pts.push([Math.sin(a) * 3.1 * k, -2 + i / 16 * 3.7, Math.cos(a) * 2.2]); }
  pts.push([2.2, 2.2, 3.2], [4.5, 1.2, 5.2], [5.2, -2, 8.5], [2, -5, 13]);
  const water = ribbon(pts, { radius: 0.5, len: 0.62, palette: WATER, foam: 420, foamSize: 0.17 });
  scene.add(water.group);
  const drops = particles({ kind: 'foam', n: 70, box: [18, 12, 8], size: 0.07, vel: [0.2, 0.7, 0], c1: 0xffffff, c2: 0x8fd8ff, seed: 21, order: 4 });
  scene.add(drops.mesh);

  const L = ['.l1', '.l2', '.l3'].map((s) => cuttable($(s, el)));
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
  const slot = [[0.06, 0.27], [0.33, 0.54], [0.62, 0.88]];
  L.forEach((h, i) => {
    const line = $(`.l${i + 1}`, el), [a, b] = slot[i];
    tl.fromTo(line, { autoAlpha: 0, x: i % 2 ? 160 : -160, skewX: i % 2 ? -24 : 24 }, { autoAlpha: 1, x: 0, skewX: 0, duration: 0.05 }, a)
      .fromTo(h.edge, { scaleX: 0, autoAlpha: 1 }, { scaleX: 1, duration: 0.02, ease: 'power4.in' }, b - 0.03)
      .to(h.top, { xPercent: 9, yPercent: -55, rotate: 4, duration: 0.07, ease: 'power3.in' }, b)
      .to(h.bot, { xPercent: -9, yPercent: 65, rotate: -5, duration: 0.07, ease: 'power3.in' }, b)
      .to(line, { autoAlpha: 0, duration: 0.025 }, b + 0.05);
  });
  tl.fromTo('#breath .aside', { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.06 }, 0.36).to('#breath .aside', { autoAlpha: 0, y: -80, duration: 0.05, ease: 'power2.in' }, 0.56).set({}, {}, 1);

  return {
    id: 'breath', num: '二', name: 'Breath', el, scene, camera, tl,
    out: { type: 'ink', span: 0.8 },
    lines: (p) => (p > 0.58 && p < 0.9 ? 0.75 * seg(p, 0.58, 0.66) * (1 - seg(p, 0.84, 0.9)) : 0),
    beats: [
      [0.26, () => fx.cut(0.3, 0.5)], [0.53, () => fx.cut(0.68, 0.5)],
      [0.62, () => { stage.impact(110); stage.kickLines(1); fx.boom(innerWidth * 0.5, innerHeight * 0.5); }],
    ],
    resize(w, h) { hero.place(camera); u.uAsp.value = w / h; water.group.scale.setScalar(isPortrait() ? 0.62 : 1); },
    update({ time, mouse }) {
      const p = this.p ?? 0;
      u.uTime.value = time; u.uP.value = p; hero.u.uTime.value = time; water.u.uTime.value = time; drops.u.uTime.value = time;
      drops.u.uScroll.value = p * 10;
      water.u.uHead.value = 0.02 + p * 1.42;
      water.u.uBoil.value = 1 + seg(p, 0.55, 0.7) * 0.7;
      const hit = smooth(seg(p, 0.56, 0.66));
      const ang = Math.sin(p * Math.PI * 1.5) * 0.28 + mouse.x * 0.06;
      camera.position.set(Math.sin(ang) * 10, mouse.y * 0.25 + 0.4 - p * 0.6, Math.cos(ang) * 10 - hit * 1.8);
      camera.lookAt(0, 0, 0); camera.rotation.z += hit * -0.12 + Math.sin(p * 6) * 0.02;
      hero.move(0, -0.08 + p * 0.12); hero.scale(0.9 + p * 0.12 + hit * 0.14);
    },
  };
}
