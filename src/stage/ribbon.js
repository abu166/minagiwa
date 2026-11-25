import * as THREE from 'three';
import { NOISE } from './glsl.js';

// The water: a drawn serpent that swims along a curve. Flat tones and ink lines,
// woodblock style, with an inverted-hull outline and claw foam along its crest.
const SEG = 420, RAD = 22;

const COMMON = /* glsl */ `
attribute vec3 aC, aN, aB; attribute vec2 aUA;
uniform float uHead, uLen, uTime, uRadius, uHull, uBoil;
varying vec2 vUA; varying float vS; varying vec3 vP;
${NOISE}
float profile(float s){ // s: 0 at the head, 1 at the tail
  if (s<0.||s>1.) return 0.;
  float head = sqrt(clamp(s/.06,0.,1.));
  return head*pow(1.-s,.75);
}
`;
const VERT = COMMON + /* glsl */ `
void main(){
  float s = (uHead-aUA.x)/uLen;
  vS = s; vUA = aUA;
  float t = floor(uTime*12.)/12.;
  float w = (vnoise(vec2(aUA.x*46.-t*2.2, aUA.y*1.9+t))-.5)*.55*uBoil;
  float crest = pow(max(0.,sin(aUA.y)),3.)*.45*(.6+.4*sin(aUA.x*130.-t*9.));
  float r = uRadius*profile(s)*(1.+w+crest);
  if (r>0.) r += uHull;
  vec3 sway = aB*sin(aUA.x*22.-t*3.)*.14*uBoil;
  vec3 p = aC + sway + (aN*cos(aUA.y)+aB*sin(aUA.y))*r;
  vP = p;
  gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.);
}`;
const FRAG = /* glsl */ `
precision highp float;
uniform float uTime, uHull, uOpacity; uniform vec3 cInk, cDeep, cMid, cPale, cFoam;
varying vec2 vUA; varying float vS; varying vec3 vP;
${NOISE}
void main(){
  if (vS<0.||vS>1.) discard;
  if (uHull>0.) { gl_FragColor = vec4(cInk,uOpacity); return; }
  float t = floor(uTime*12.)/12.;
  float a = vUA.y;
  // streaks run along the body, thick-thin like a brush
  float warp = vnoise(vec2(vUA.x*30.-t*1.6, a*1.4))*1.7;
  float f = fract((a/6.2831853)*7. + warp + vS*2.);
  float wide = .32+.2*vnoise(vec2(vUA.x*60., a*2.));
  vec3 c = cMid;
  float lit = sin(a+.6);
  if (lit < -.15) c = cDeep;
  if (f < wide*.55 && lit > -.5) c = cPale;
  if (f < wide*.16) c = cFoam;
  float ink = abs(f-wide*.62);
  if (ink < .022) c = cInk;
  // claws of foam on the crest and at the head
  float n = vnoise(vec2(vUA.x*150.-t*5., a*4.));
  float crest = smoothstep(.35,1.,sin(a));
  if (crest + n*.5 > 1.12) c = cFoam;
  else if (crest + n*.5 > 1.06) c = cInk;
  if (vS < .05+.05*n) c = cFoam;
  else if (vS < .062+.05*n) c = cInk;
  if (vS > .8 && n > 1.6-vS) discard;
  gl_FragColor = vec4(c,uOpacity);
}`;

// foam discs thrown off around the head and along the crest
const FOAM_VERT = /* glsl */ `
attribute vec3 iC, iN, iB; attribute vec4 iS;
uniform float uHead, uLen, uTime, uRadius, uFoam;
varying vec2 vUv;
void main(){
  vUv = uv*2.-1.;
  float s = (uHead-iS.x)/uLen;
  float t = floor(uTime*12.)/12.;
  float alive = step(0.,s)*step(s,.8);
  float born = clamp(s/.05,0.,1.);
  float die = 1.-clamp(s/(.25+iS.w*.5),0.,1.);
  float k = alive*born*die;
  float th = iS.y*6.2831853;
  float r = uRadius*(.95+s*3.2*iS.z)*(.8+.2*sin(t*4.+iS.y*30.));
  vec3 p = iC+(iN*cos(th)+iB*sin(th))*r; p.y -= s*s*2.2*iS.w;
  vec4 mv = modelViewMatrix*vec4(p,1.);
  mv.xy += position.xy*uFoam*(.25+iS.w)*k;
  gl_Position = projectionMatrix*mv;
}`;
const FOAM_FRAG = /* glsl */ `
precision highp float; uniform vec3 cInk, cFoam, cPale; varying vec2 vUv;
void main(){ float r=length(vUv); if(r>1.) discard; vec3 c=cFoam; if(length(vUv-vec2(.22,.25))>.85) c=cPale; if(r>.82) c=cInk; gl_FragColor=vec4(c,1.); }`;

export const WATER = { cInk: 0x07133a, cDeep: 0x10369c, cMid: 0x1f6fe0, cPale: 0x8fd8ff, cFoam: 0xffffff };
export const FLAME = { cInk: 0x2a0408, cDeep: 0xb3160c, cMid: 0xf2480f, cPale: 0xffb21e, cFoam: 0xfff3c4 };

export function ribbon(points, { radius = 0.42, len = 0.5, palette = WATER, foam = 260, foamSize = 0.16, depthTest = true } = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
  const frames = curve.computeFrenetFrames(SEG, false);
  const pts = curve.getSpacedPoints(SEG);
  const nV = (SEG + 1) * (RAD + 1);
  const aC = new Float32Array(nV * 3), aN = new Float32Array(nV * 3), aB = new Float32Array(nV * 3), aUA = new Float32Array(nV * 2);
  let k = 0;
  for (let i = 0; i <= SEG; i++) for (let j = 0; j <= RAD; j++, k++) {
    pts[i].toArray(aC, k * 3); frames.normals[i].toArray(aN, k * 3); frames.binormals[i].toArray(aB, k * 3);
    aUA[k * 2] = i / SEG; aUA[k * 2 + 1] = j / RAD * Math.PI * 2;
  }
  const idx = [];
  for (let i = 0; i < SEG; i++) for (let j = 0; j < RAD; j++) { const a = i * (RAD + 1) + j, b = a + RAD + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(aC, 3));
  for (const [n, d, s] of [['aC', aC, 3], ['aN', aN, 3], ['aB', aB, 3], ['aUA', aUA, 2]]) g.setAttribute(n, new THREE.BufferAttribute(d, s));
  g.setIndex(idx);
  const shared = { uHead: { value: 0 }, uLen: { value: len }, uTime: { value: 0 }, uRadius: { value: radius }, uBoil: { value: 1 }, uOpacity: { value: 1 }, uFoam: { value: foamSize } };
  for (const c of Object.keys(palette)) shared[c] = { value: new THREE.Color(palette[c]) };
  const mk = (hull, side) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { ...shared, uHull: { value: hull } }, side, depthTest, transparent: true, depthWrite: true });
  const group = new THREE.Group();
  const body = new THREE.Mesh(g, mk(0, THREE.DoubleSide)), hull = new THREE.Mesh(g, mk(radius * 0.11, THREE.BackSide));
  body.frustumCulled = hull.frustumCulled = false; hull.renderOrder = 10; body.renderOrder = 11;
  group.add(hull, body);

  const fg = new THREE.InstancedBufferGeometry(), q = new THREE.PlaneGeometry(2, 2);
  fg.index = q.index; fg.setAttribute('position', q.attributes.position); fg.setAttribute('uv', q.attributes.uv);
  const iC = new Float32Array(foam * 3), iN = new Float32Array(foam * 3), iB = new Float32Array(foam * 3), iS = new Float32Array(foam * 4);
  for (let i = 0; i < foam; i++) {
    const at = Math.floor(Math.random() * SEG);
    pts[at].toArray(iC, i * 3); frames.normals[at].toArray(iN, i * 3); frames.binormals[at].toArray(iB, i * 3);
    iS.set([at / SEG, Math.random(), Math.random(), Math.random() ** 1.6], i * 4);
  }
  for (const [n, d, s] of [['iC', iC, 3], ['iN', iN, 3], ['iB', iB, 3], ['iS', iS, 4]]) fg.setAttribute(n, new THREE.InstancedBufferAttribute(d, s));
  fg.instanceCount = foam;
  const fm = new THREE.Mesh(fg, new THREE.ShaderMaterial({ vertexShader: FOAM_VERT, fragmentShader: FOAM_FRAG, uniforms: shared, depthTest }));
  fm.frustumCulled = false; fm.renderOrder = 12;
  group.add(fm);
  return { group, u: shared, curve, body, hull, foam: fm };
}
