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
  el.innerHTML = `<span class="half top" aria-hidden="true">${t}</span><span class="half bot" aria-hidden="true">${t}</span><i class="edge" aria-hidden="true"></i>`;
  return { top: $('.top', el), bot: $('.bot', el), edge: $('.edge', el) };
}
