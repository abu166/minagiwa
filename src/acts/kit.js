import * as THREE from 'three';
import { NOISE } from '../stage/glsl.js';

export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
export const smooth = (t) => t * t * (3 - 2 * t);
export const outExpo = (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
export const inCubic = (t) => t * t * t;
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const isPortrait = () => innerWidth / innerHeight < 0.85;
export const rm = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function cam(fov = 35) { const c = new THREE.PerspectiveCamera(fov, innerWidth / innerHeight, 0.1, 400); c.position.z = 10; return c; }

export function backdrop(frag, uniforms) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position.xy,.9999,1.);}',
    fragmentShader: `precision highp float; varying vec2 vUv; uniform float uTime,uAsp,uP;\n${NOISE}\n${frag}`,
    uniforms, depthTest: false, depthWrite: false,
  }));
  m.renderOrder = -100; m.frustumCulled = false; return m;
}

// Split a heading into per-character spans, keeping the text readable to assistive tech.
export function chars(el) {
  const lines = [[]];
  for (const n of [...el.childNodes]) { if (n.nodeName === 'BR') lines.push([]); else lines.at(-1).push(n.textContent); }
  const text = lines.map((l) => l.join('').replace(/[ \n]+/g, ' ').trim());
  el.setAttribute('aria-label', text.join(' ').replace(/\u00a0/g, ' ')); el.textContent = '';
  const out = [];
  text.forEach((line, li) => {
    if (li) el.append(document.createElement('br'));
    line.split(' ').forEach((w, i) => {
      if (i) el.append(' ');
      const ws = document.createElement('span'); ws.className = 'w'; ws.ariaHidden = 'true';
      for (const ch of w) { const s = document.createElement('span'); s.className = 'c'; s.textContent = ch; ws.append(s); out.push(s); }
      el.append(ws);
    });
  });
  return out;
}

// Make a line that can be sliced: two clipped copies that part along a diagonal.
export function cuttable(el) {
  const t = el.innerHTML; el.setAttribute('aria-label', el.textContent.trim());
  el.innerHTML = `<span class="half hi" aria-hidden="true">${t}</span><span class="half lo" aria-hidden="true">${t}</span><i class="edge" aria-hidden="true"></i>`;
  return { top: $(".hi", el), bot: $(".lo", el), edge: $('.edge', el) };
}

// A line of narration: in at a, out at b.
export function say(tl, el, a, b, { y = 30 } = {}) {
  tl.fromTo(el, { autoAlpha: 0, y }, { autoAlpha: 1, y: 0, duration: 0.03, ease: 'power3.out' }, a)
    .to(el, { autoAlpha: 0, y: -y * 0.7, duration: 0.025, ease: 'power2.in' }, b);
}
// A headline that lands letter by letter and is swept off.
export function slamIn(tl, el, a, b) {
  const c = chars(el);
  tl.set(el, { autoAlpha: 1 }, a)
    .fromTo(c, { yPercent: 130, autoAlpha: 0, rotate: (i) => (i % 3 - 1) * 14 }, { yPercent: 0, autoAlpha: 1, rotate: 0, stagger: 0.0016, duration: 0.05, ease: 'back.out(1.9)' }, a);
  if (b) tl.to(c, { yPercent: -120, autoAlpha: 0, stagger: 0.0012, duration: 0.035, ease: 'power2.in' }, b);
}
export const NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
