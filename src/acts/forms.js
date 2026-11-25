import * as THREE from 'three';
import gsap from 'gsap';
import { tex } from '../stage/layer.js';
import { Panel } from '../stage/panel.js';
import { cam, backdrop, $, $$, seg, lerp, isPortrait } from './kit.js';

const PAPER = /* glsl */ `
uniform vec3 cNow,cNext; uniform float uShift,uWipe;
void main(){
  vec2 p = (vUv-.5)*vec2(uAsp,1.);
  vec3 cA = p.x-p.y*.28 > (.5-uWipe)*(uAsp+.9) ? cNext : cNow, cB = cA*.84;
  vec3 c = cA;
  vec2 q = mat2(.866,-.5,.5,.866)*(p+vec2(uShift*.35,0.))*46.;
  float tone = smoothstep(-.5,.75, p.y*-1.+p.x*.35+sin(uShift*2.)*.2);
  float d = length(fract(q)-.5);
  if (d < tone*.5) c = cB;
  // action streaks
  float y = floor((p.y+.5)*130.);
  float s = fract(hash(vec2(y,3.))+uShift*(.5+hash(vec2(y,8.))*1.5)+p.x*.16);
  if (hash(vec2(y,5.))>.9 && s<.22) c = mix(cB,vec3(1.),.0);
  gl_FragColor = vec4(c,1.);
}`;

export function forms({ stage, fx }) {
  const el = $('#forms'), scene = new THREE.Scene(), camera = cam(35);
  const u = { uTime: { value: 0 }, uAsp: { value: 1 }, uP: { value: 0 }, uShift: { value: 0 }, uWipe: { value: 0 }, cNow: { value: new THREE.Color(0x0d4fd1) }, cNext: { value: new THREE.Color(0x0d4fd1) } };
  scene.add(backdrop(PAPER, u));
  const panels = $$('.panel', el), track = $('.track', el);
  const art = panels.map((p, i) => new Panel(tex(`./art/form${i + 1}.webp`), { depth: tex(`./art/form${i + 1}_d.webp`), order: 5 }));
  art.forEach((a) => scene.add(a.mesh));
  const FOCUS = [[0.6, 0.92], [0.4, 0.2], [0.55, 0.15], [0.5, 0.3], [0.5, 0.35]];
  const cols = panels.map((p) => new THREE.Color(p.style.getPropertyValue('--k').trim()));
  const big = panels.map((p) => $('b', p)), caps = panels.map((p) => $('.cap', p));
  const A = 0.07, B = 0.93;
  const at = (i) => lerp(A, B, i / (panels.length - 1));
  let centers = [], box = [];
  const act = {
    id: 'forms', name: 'Ten Winters', ink: 'water', el, scene, camera,
    out: { type: 'diamond', span: 0.9, scarf: 2 },
    look: () => ({ glow: 0.4 }),
    tl: gsap.timeline({ paused: true }).fromTo('.forms-head', { yPercent: -330 }, { yPercent: 0, duration: 0.05, ease: 'back.out(1.6)' }, 0).to('.forms-head', { yPercent: -330, duration: 0.04, ease: 'power2.in' }, 0.95).set({}, {}, 1),
    beats: panels.map((p, i) => [at(i) - 0.035, () => { const r = p.getBoundingClientRect(); fx.land(r.left + r.width * 0.5, r.top + r.height * 0.9, i === 4); if (i === 4) stage.impact(80); }]),
    resize(w, h) {
      u.uAsp.value = w / h; track.style.transform = 'none';
      centers = panels.map((p) => p.offsetLeft + p.offsetWidth / 2);
      box = panels.map((p) => [p.offsetLeft, p.offsetTop + track.offsetTop, p.offsetWidth, p.offsetHeight]);
    },
    update({ time, velocity, mouse }) {
      const p = this.p ?? 0, n = panels.length, f = seg(p, A, B) * (n - 1);
      u.uTime.value = time; u.uShift.value = p * 6;
      // hold on each panel, whip between them
      const i = Math.min(n - 2, Math.floor(f)), t = f - i, e = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
      const inn = 1 - seg(p, 0, A), outt = seg(p, B, 1);
      const cx = lerp(centers[i] ?? 0, centers[i + 1] ?? 0, e);
      const W = innerWidth, H = innerHeight, tx = W / 2 - cx + inn * W * 1.1 - outt * W * 0.9, sk = -velocity * 7, sh = Math.tan(sk * Math.PI / 180);
      track.style.transform = `translate3d(${tx}px,0,0) skewX(${sk.toFixed(2)}deg)`;
      for (let k = 0; k < n; k++) {
        const d = k - (i + e) + inn * 1.2 - outt;
        const [bx, by, bw, bh] = box[k], my = by + bh / 2, X = (fx0, y) => bx + bw * fx0 + tx + sh * (y - my);
        art[k].set([[X(0.09, by), by], [X(1, by), by], [X(0.91, by + bh), by + bh], [X(0, by + bh), by + bh]], { w: W, h: H, zoom: 1.12 + Math.min(0.5, Math.abs(d) * 0.22), focus: FOCUS[k], slide: [d * -0.1, 0], par: [mouse.x * 0.014 + d * 0.02, mouse.y * 0.01] });
        big[k].style.transform = `translate3d(${(d * 46).toFixed(2)}%,${(d * -8).toFixed(2)}%,0)`;
        caps[k].style.transform = `translate3d(${(d * 70).toFixed(2)}px,0,0)`;
      }
      u.cNow.value.copy(cols[i]); u.cNext.value.copy(cols[i + 1]); u.uWipe.value = e;
    },
  };
  return act;
}
