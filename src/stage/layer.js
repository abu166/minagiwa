import * as THREE from 'three';
import { NOISE } from './glsl.js';

const loader = new THREE.TextureLoader();
export const pending = [];
export function tex(url) {
  let done; const p = new Promise((r) => { done = r; }); pending.push(p);
  const t = loader.load(url, (x) => { x.onReady?.(); done(); }, undefined, () => { console.warn('missing art', url); done(); });
  t.colorSpace = THREE.NoColorSpace;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 4;
  return t;
}

const VERT = /* glsl */ `
uniform float uTime, uWind, uBreathe;
uniform vec2 uPivot;
varying vec2 vUv;
void main(){
  vUv = uv;
  vec3 p = position;
  // cloth sway: grows with distance from the pivot, stepped to animate on threes
  float t = floor(uTime*10.)/10.;
  vec2 d = uv-uPivot;
  float far = smoothstep(.05,.6,length(d));
  p.x += sin(t*2.1+uv.y*7.+uv.x*4.)*uWind*far;
  p.y += cos(t*1.7+uv.x*8.)*uWind*.7*far;
  p.y += sin(uTime*1.4)*uBreathe*(uv.y);
  gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.);
}`;

const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D map;
uniform float uTime, uOpacity, uTintAmt, uOutline, uWater, uHorizon, uRim, uCut;
uniform vec3 uTint, uOutlineColor, uRimColor;
uniform vec2 uTexel, uRimDir, uUvScale, uUvOffset;
varying vec2 vUv;
${NOISE}
void main(){
  vec2 uv = (vUv-.5)*uUvScale+.5+uUvOffset;
  if (uWater > 0. && uv.y < uHorizon) {
    float d = (uHorizon-uv.y)/uHorizon;
    float t = floor(uTime*12.)/12.;
    uv.x += (vnoise(vec2(uv.x*6.+t*.7, uv.y*90.-t*2.4))-.5)*uWater*d;
    uv.y += (vnoise(vec2(uv.x*9.-t, uv.y*60.+t*1.5))-.5)*uWater*.35*d;
  }
  vec4 c = texture2D(map, uv);
  c.rgb = mix(c.rgb, uTint, uTintAmt);
  float a = c.a;
  if (uRim > 0.) {
    float n = texture2D(map, uv+uRimDir*uTexel).a;
    float r = step(.5,a)*(1.-smoothstep(.2,.7,n));
    c.rgb = mix(c.rgb, uRimColor, r*uRim);
  }
  if (uOutline > 0.) {
    float m = 0.;
    for (int i=0;i<12;i++){ float th = float(i)*.5236; m = max(m, texture2D(map, uv+vec2(cos(th),sin(th))*uTexel*uOutline).a); }
    float o = smoothstep(.3,.6,m);
    c.rgb = mix(uOutlineColor, c.rgb, smoothstep(.35,.65,a));
    a = max(a,o);
  }
  if (a < uCut) discard;
  gl_FragColor = vec4(c.rgb, a*uOpacity);
}`;

export const viewAt = (cam, z, camZ = 10) => {
  const h = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * (camZ - z);
  return { w: h * cam.aspect, h };
};

// A painted cel on a multiplane stand. x/y are fractions of the view at that
// depth, h is a fraction of the view height; cover fills the view times `cover`.
export class Layer {
  constructor(map, o = {}) {
    this.o = { z: 0, x: 0, y: 0, h: 1, ...o };
    this.map = map;
    this.u = {
      map: { value: map }, uTime: { value: 0 }, uWind: { value: o.wind ?? 0 }, uBreathe: { value: o.breathe ?? 0 },
      uPivot: { value: new THREE.Vector2(...(o.pivot ?? [0.5, 0.45])) },
      uOpacity: { value: 1 }, uTint: { value: new THREE.Color(o.tint ?? 0) }, uTintAmt: { value: o.tintAmt ?? 0 },
      uOutline: { value: o.outline ?? 0 }, uOutlineColor: { value: new THREE.Color(o.outlineColor ?? 0xffffff) },
      uWater: { value: o.water ?? 0 }, uHorizon: { value: o.horizon ?? 0.4 },
      uRim: { value: o.rim ?? 0 }, uRimColor: { value: new THREE.Color(o.rimColor ?? 0xffffff) }, uRimDir: { value: new THREE.Vector2(...(o.rimDir ?? [6, 6])) },
      uTexel: { value: new THREE.Vector2(1 / 1000, 1 / 1000) }, uUvScale: { value: new THREE.Vector2(1, 1) }, uUvOffset: { value: new THREE.Vector2() },
      uCut: { value: o.solid ? 0.5 : 0.01 },
    };
    const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: this.u, transparent: true, depthWrite: !!o.solid, depthTest: !!o.solid });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, o.wind ? 24 : 1, o.wind ? 24 : 1), mat);
    this.mesh.renderOrder = o.order ?? this.o.z * 10;
    this.mesh.frustumCulled = false;
    const prev = map.onReady;
    map.onReady = () => { prev?.(); this.place(); };
  }
  place(cam = this.cam) {
    if (!cam) return; this.cam = cam;
    const img = this.map.image; if (!img) return;
    const iw = img.width, ih = img.height, asp = iw / ih;
    this.u.uTexel.value.set(1 / iw, 1 / ih);
    const o = cam.aspect < 0.85 && this.o.portrait ? { ...this.o, ...this.o.portrait } : this.o;
    const v = viewAt(cam, o.z);
    let w, h;
    if (o.cover) { const s = Math.max(v.w / asp, v.h) * o.cover; h = s; w = s * asp; }
    else { h = v.h * o.h; w = h * asp; }
    this.size = { w, h, vw: v.w, vh: v.h };
    this.mesh.scale.set(o.flip ? -w : w, h, 1);
    if (o.flip) this.mesh.material.side = THREE.DoubleSide;
    this.base = { x: v.w * o.x, y: v.h * o.y + (o.anchor === 'bottom' ? -v.h / 2 + h / 2 : 0), z: o.z };
    this.mesh.position.set(this.base.x, this.base.y, this.base.z);
  }
  // offset in fractions of the view at this depth
  move(dx = 0, dy = 0, dz = 0) { if (this.base) this.mesh.position.set(this.base.x + dx * this.size.vw, this.base.y + dy * this.size.vh, this.base.z + dz); }
  scale(k) { if (this.size) this.mesh.scale.set((this.o.flip ? -1 : 1) * this.size.w * k, this.size.h * k, 1); }
  set opacity(v) { this.u.uOpacity.value = v; this.mesh.visible = v > 0.003; }
}

// Brush lettering as a cel, so characters can stand in front of the title.
export function textTex(str, { font = 'Reggae One', size = 520, color = '#fff', vertical = false, stroke, strokeW = 0 } = {}) {
  const c = document.createElement('canvas'), x = c.getContext('2d');
  const chars = [...str];
  x.font = `${size}px "${font}"`;
  const pad = size * 0.16 + strokeW;
  const w = vertical ? size * 1.1 : x.measureText(str).width;
  c.width = Math.ceil(w + pad * 2); c.height = Math.ceil((vertical ? size * 1.04 * chars.length : size * 1.15) + pad * 2);
  x.font = `${size}px "${font}"`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  const put = (s, px, py) => { if (stroke) { x.strokeStyle = stroke; x.lineWidth = strokeW; x.strokeText(s, px, py); } x.fillStyle = color; x.fillText(s, px, py); };
  if (vertical) chars.forEach((ch, i) => put(ch, c.width / 2, pad + size * 1.04 * (i + 0.5)));
  else put(str, c.width / 2, c.height / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4;
  return t;
}
