import * as THREE from 'three';
import { NOISE } from './glsl.js';

// A cel-shaded run of torii gates standing in shallow water. Flat light and one
// shadow tone, inverted-hull ink lines, and fog that is stepped, not blended.
const N = 46, GAP = 5.2;

const LIT_V = /* glsl */ `
uniform float uHull; varying vec3 vN; varying float vD; varying vec3 vW; varying float vPart;
attribute float part;
void main(){
  vec3 n = normalize(mat3(instanceMatrix)*normal);
  vN = n; vPart = part;
  vec4 w = modelMatrix*instanceMatrix*vec4(position,1.);
  w.xyz += normalize(mat3(modelMatrix)*n)*uHull;
  vW = w.xyz;
  vec4 mv = viewMatrix*w; vD = -mv.z;
  gl_Position = projectionMatrix*mv;
}`;
const LIT_F = /* glsl */ `
precision highp float;
varying vec3 vN; varying float vD; varying vec3 vW; varying float vPart;
uniform vec3 cLit, cShade, cBlack, cInk, cFog; uniform float uHull, uReflect, uTime;
${NOISE}
void main(){
  if (uReflect>.5) { // broken into bands like a reflection painted on ripples
    float b = vnoise(vec2(vW.x*1.2, vW.y*5.+vW.z*.4-uTime*1.4));
    if (b < .42) discard;
  }
  float l = dot(normalize(vN), normalize(vec3(-.55,.7,.6)));
  vec3 a = vPart>.5 ? cBlack : cLit, s = vPart>.5 ? cInk : cShade;
  vec3 c = l>.15 ? a : s;
  if (uHull>0.) c = cInk;
  float f = floor(clamp((vD-10.)/74.,0.,1.)*6.)/6.;
  c = mix(c, cFog, f);
  if (uReflect>.5) c = mix(c, cFog, .38);
  gl_FragColor = vec4(c,1.);
}`;

const WATER_F = /* glsl */ `
precision highp float;
varying vec3 vW; varying float vD;
uniform float uTime; uniform vec3 cA, cB, cFoam, cFog, cInk;
${NOISE}
void main(){
  float t = floor(uTime*10.)/10.;
  vec2 p = vW.xz;
  float n = vnoise(vec2(p.x*.55, p.y*2.2+t*.9)) + .5*vnoise(vec2(p.x*1.4+t*.3, p.y*5.+t));
  vec3 c = n>.82 ? cB : cA;
  if (n>1.12) c = cFoam;
  float f = floor(clamp((vD-8.)/74.,0.,1.)*7.)/7.;
  c = mix(c,cFog,f);
  gl_FragColor = vec4(c, n>.82?.86:.6);
}`;
const WATER_V = /* glsl */ `varying vec3 vW; varying float vD; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vec4 mv=viewMatrix*w; vD=-mv.z; gl_Position=projectionMatrix*mv; }`;

const SKY_F = /* glsl */ `
precision highp float; varying vec2 vUv;
uniform vec3 cFog, cSky, cSun, cCloud; uniform float uTime, uAsp, uSun;
${NOISE}
void main(){
  vec2 p = (vUv-.5)*vec2(uAsp,1.);
  vec3 c = mix(cFog,cSky,smoothstep(.0,.6,floor((p.y+.1)*14.)/14.));
  float r = length(p-vec2(0.,.06));
  if (r < uSun) c = cSun;
  if (abs(r-uSun*1.12) < .004) c = cSun;
  float n = fbm(vec2(p.x*1.6+uTime*.015, p.y*7.));
  float cl = n - abs(p.y-.16)*1.1;
  if (cl > .42) c = cCloud; 
  if (cl > .42 && cl < .435) c = cSky;
  gl_FragColor = vec4(c,1.);
}`;

function gateGeometry() {
  const parts = [];
  const add = (g, part, m) => { g.applyMatrix4(m); const n = g.attributes.position.count; g.setAttribute('part', new THREE.BufferAttribute(new Float32Array(n).fill(part), 1)); parts.push(g.toNonIndexed()); };
  const T = (x, y, z, rz = 0) => new THREE.Matrix4().makeRotationZ(rz).setPosition(x, y, z);
  for (const s of [-1, 1]) {
    add(new THREE.CylinderGeometry(0.26, 0.32, 6.4, 12), 0, T(s * 2.5, 2.8, 0, s * 0.035));
    add(new THREE.CylinderGeometry(0.4, 0.44, 0.8, 12), 1, T(s * 2.62, 0.1, 0));
  }
  add(new THREE.BoxGeometry(6, 0.42, 0.34), 0, T(0, 4.75, 0));
  add(new THREE.BoxGeometry(0.5, 0.8, 0.3), 1, T(0, 5.4, 0));
  // kasagi: a lintel that lifts at the ends
  for (const [y, h, d, part, wid] of [[6.0, 0.36, 0.5, 0, 7.6], [6.36, 0.3, 0.72, 1, 8.3]]) {
    const g = new THREE.BoxGeometry(wid, h, d, 16, 1, 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + Math.pow(Math.abs(p.getX(i)) / (wid / 2), 2.6) * 0.55);
    g.computeVertexNormals(); add(g, part, T(0, y, 0));
  }
  const out = new THREE.BufferGeometry();
  for (const [n, s] of [['position', 3], ['normal', 3], ['part', 1]]) {
    const len = parts.reduce((a, g) => a + g.attributes[n].array.length, 0), arr = new Float32Array(len); let o = 0;
    for (const g of parts) { arr.set(g.attributes[n].array, o); o += g.attributes[n].array.length; }
    out.setAttribute(n, new THREE.BufferAttribute(arr, s));
  }
  return out;
}

export const path = (z) => new THREE.Vector3(Math.sin(z * 0.022) * 7, 0, z);

export function torii() {
  const scene = new THREE.Scene();
  const u = {
    uTime: { value: 0 }, cFog: { value: new THREE.Color(0xbfe9ff) }, cInk: { value: new THREE.Color(0x0b1233) },
    cLit: { value: new THREE.Color(0xff3b1f) }, cShade: { value: new THREE.Color(0xa81a24) }, cBlack: { value: new THREE.Color(0x26305c) },
    cA: { value: new THREE.Color(0x1a63d6) }, cB: { value: new THREE.Color(0x5fb7f5) }, cFoam: { value: new THREE.Color(0xffffff) },
    cSky: { value: new THREE.Color(0x1d7fe8) }, cSun: { value: new THREE.Color(0xffffff) }, cCloud: { value: new THREE.Color(0xffffff) },
    uAsp: { value: 1 }, uSun: { value: 0.16 },
  };
  const geo = gateGeometry();
  const mk = (hull, reflect, side) => new THREE.ShaderMaterial({ vertexShader: LIT_V, fragmentShader: LIT_F, uniforms: { ...u, uHull: { value: hull }, uReflect: { value: reflect } }, side });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  const fill = (mesh, flip) => {
    for (let i = 0; i < N; i++) {
      const z = -i * GAP, p = path(z), a = path(z - 1);
      q.setFromAxisAngle(up, Math.atan2(a.x - p.x, a.z - p.z) + Math.PI);
      const k = 1 + Math.sin(i * 1.7) * 0.06;
      m4.compose(p, q, new THREE.Vector3(k, flip ? -k : k, k)); mesh.setMatrixAt(i, m4);
    }
    mesh.frustumCulled = false; scene.add(mesh);
  };
  fill(new THREE.InstancedMesh(geo, mk(0.045, 0, THREE.BackSide), N), false);
  fill(new THREE.InstancedMesh(geo, mk(0, 0, THREE.FrontSide), N), false);
  fill(new THREE.InstancedMesh(geo, mk(0, 1, THREE.DoubleSide), N), true);

  const water = new THREE.Mesh(new THREE.PlaneGeometry(260, 420), new THREE.ShaderMaterial({ vertexShader: WATER_V, fragmentShader: WATER_F, uniforms: u, transparent: true, depthWrite: false }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, 0, -150); water.renderOrder = 5; scene.add(water);

  const sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position.xy,.9999,1.);}', fragmentShader: SKY_F, uniforms: u, depthWrite: false, depthTest: false }));
  sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
  return { scene, u, length: N * GAP };
}
