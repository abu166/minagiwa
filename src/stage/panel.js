import * as THREE from 'three';

// A manga panel: any quadrilateral, in screen pixels, showing a painting that can
// slide and scale behind its frame. Drawn in the scene so transitions cut it too.
const VERT = /* glsl */ `
attribute vec2 px; attribute vec4 edge;
uniform vec2 uView; varying vec2 vP; varying vec2 vQ;
void main(){ vP = px; vQ = position.xy; gl_Position = vec4(px.x/uView.x*2.-1., 1.-px.y/uView.y*2., 0., 1.); }`;
const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D map, depth; uniform vec2 uC, uS, uView, uPar, q0, q1, q2, q3; uniform float uBorder, uHasDepth, uDim; uniform vec3 uEdge;
varying vec2 vP;
float line(vec2 a, vec2 b){ vec2 d = normalize(b-a); vec2 n = vec2(-d.y,d.x); return abs(dot(vP-a,n)); }
void main(){
  vec2 uv = (vP-uC)/uS; uv = vec2(uv.x+.5, .5-uv.y);
  if (uHasDepth>.5) { float d = texture2D(depth, uv).r; uv += uPar*(d-.5); }
  vec3 c = texture2D(map, uv).rgb*(1.-uDim);
  float e = min(min(line(q0,q1),line(q1,q2)),min(line(q2,q3),line(q3,q0)));
  if (e < uBorder) c = uEdge;
  gl_FragColor = vec4(c,1.);
}`;

export class Panel {
  constructor(map, { depth, border = 7, edge = 0x07102b, order = 0 } = {}) {
    this.map = map;
    const g = this.g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
    g.setAttribute('px', new THREE.BufferAttribute(new Float32Array(8), 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const V = () => ({ value: new THREE.Vector2() });
    this.u = { map: { value: map }, depth: { value: depth ?? null }, uHasDepth: { value: depth ? 1 : 0 }, uC: V(), uS: V(), uView: V(), uPar: V(), q0: V(), q1: V(), q2: V(), q3: V(), uBorder: { value: border }, uEdge: { value: new THREE.Color(edge) }, uDim: { value: 0 } };
    this.mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: this.u, side: THREE.DoubleSide, transparent: true, depthTest: false, depthWrite: false }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = order;
  }
  // q: four [x,y] corners in px, focus: where in the painting to look, zoom >= 1 covers
  set(q, { w, h, zoom = 1.05, focus = [0.5, 0.5], slide = [0, 0], par = [0, 0] }) {
    const img = this.map.image; if (!img) return;
    const xs = q.map((p) => p[0]), ys = q.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), bw = x1 - x0, bh = y1 - y0;
    const asp = img.width / img.height, iw = Math.max(bw, bh * asp) * zoom, ih = iw / asp;
    const cx = (x0 + x1) / 2 + (0.5 - focus[0]) * (iw - bw) + slide[0] * bw, cy = (y0 + y1) / 2 + (0.5 - focus[1]) * (ih - bh) + slide[1] * bh;
    const mx = (iw - bw) / 2, my = (ih - bh) / 2, lim = (v, c, m) => Math.min(c + m, Math.max(c - m, v));
    this.u.uC.value.set(lim(cx, (x0 + x1) / 2, mx), lim(cy, (y0 + y1) / 2, my)); this.u.uS.value.set(iw, ih); this.u.uView.value.set(w, h); this.u.uPar.value.set(...par);
    const a = this.g.attributes.px; q.forEach((p, i) => { a.setXY(i, p[0], p[1]); this.u['q' + i].value.set(p[0], p[1]); }); a.needsUpdate = true;
    this.mesh.visible = x1 > 0 && x0 < w;
  }
}
