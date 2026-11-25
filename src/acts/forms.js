import * as THREE from 'three';
import gsap from 'gsap';
import { cam, backdrop, $, $$, seg, lerp, isPortrait } from './kit.js';

const PAPER = /* glsl */ `
uniform vec3 cA,cB; uniform float uShift;
void main(){
  vec2 p = (vUv-.5)*vec2(uAsp,1.);
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

export function forms({ stage, fx, go }) {
  const el = $('#forms'), scene = new THREE.Scene(), camera = cam(35);
  const u = { uTime: { value: 0 }, uAsp: { value: 1 }, uP: { value: 0 }, uShift: { value: 0 }, cA: { value: new THREE.Color(0x0d4fd1) }, cB: { value: new THREE.Color(0x0a3da6) } };
  scene.add(backdrop(PAPER, u));
  const panels = $$('.panel', el), track = $('.track', el), tabs = $('sakuga-tabs', el);
  const cols = panels.map((p) => new THREE.Color(p.style.getPropertyValue('--k').trim()));
  const imgs = panels.map((p) => $('img', p)), big = panels.map((p) => $('b', p)), caps = panels.map((p) => $('.cap', p));
  const A = 0.07, B = 0.93; let sel = 0, quiet = false;
  const at = (i) => lerp(A, B, i / (panels.length - 1));
  tabs.addEventListener('change', (e) => { if (!quiet) go('forms', at(e.detail.index)); });
  let centers = [];
  const act = {
    id: 'forms', num: '三', name: 'Five Forms', el, scene, camera,
    out: { type: 'diamond', span: 0.9 },
    tl: gsap.timeline({ paused: true }).fromTo('.forms-head', { yPercent: -330 }, { yPercent: 0, duration: 0.05, ease: 'back.out(1.6)' }, 0).fromTo('.forms-tabs', { y: 160 }, { y: 0, duration: 0.05, ease: 'back.out(1.6)' }, 0.01).to('.forms-head', { yPercent: -330, duration: 0.04, ease: 'power2.in' }, 0.95).to('.forms-tabs', { y: 160, duration: 0.04, ease: 'power2.in' }, 0.95).set({}, {}, 1),
    beats: panels.map((p, i) => [at(i) - 0.035, () => { const r = p.getBoundingClientRect(); fx.land(r.left + r.width * 0.5, r.top + r.height * 0.9, i === 4); if (i === 4) stage.impact(80); }]),
    resize(w, h) {
      u.uAsp.value = w / h; track.style.transform = 'none';
      centers = panels.map((p) => p.offsetLeft + p.offsetWidth / 2);
    },
    update({ time, velocity }) {
      const p = this.p ?? 0, n = panels.length, f = seg(p, A, B) * (n - 1);
      u.uTime.value = time; u.uShift.value = p * 6;
      // hold on each panel, whip between them
      const i = Math.min(n - 2, Math.floor(f)), t = f - i, e = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
      const inn = 1 - seg(p, 0, A), outt = seg(p, B, 1);
      const cx = lerp(centers[i] ?? 0, centers[i + 1] ?? 0, e);
      track.style.transform = `translate3d(${innerWidth / 2 - cx + inn * innerWidth * 1.1 - outt * innerWidth * 0.9}px,0,0) skewX(${(-velocity * 7).toFixed(2)}deg)`;
      for (let k = 0; k < n; k++) {
        const d = k - (i + e) + inn * 1.2 - outt;
        imgs[k].style.transform = `translate3d(${(d * -15).toFixed(2)}%,0,0) scale(${(1.12 + Math.min(0.5, Math.abs(d) * 0.22)).toFixed(3)})`;
        big[k].style.transform = `translate3d(${(d * 46).toFixed(2)}%,${(d * -8).toFixed(2)}%,0)`;
        caps[k].style.transform = `translate3d(${(d * 70).toFixed(2)}px,0,0)`;
      }
      const c = cols[i].clone().lerp(cols[i + 1], Math.round(e * 6) / 6);
      u.cA.value.copy(c); u.cB.value.copy(c).multiplyScalar(0.84);
      const s = Math.round(i + e);
      if (s !== sel) { sel = s; quiet = true; tabs.selected = s; quiet = false; }
    },
  };
  return act;
}
