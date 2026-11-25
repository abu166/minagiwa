import * as THREE from 'three';

// Flat, hard-edged particles: petals, embers, rain, foam. One instanced quad each,
// moved entirely in the vertex shader so a few hundred cost nothing.
const VERT = /* glsl */ `
attribute vec4 seed;
uniform float uTime, uSize, uScroll, uSpeed;
uniform vec3 uBox, uVelDir;
uniform int uKind;
varying vec2 vUv; varying float vS; varying float vLife;
void main(){
  vUv = uv; vS = seed.w;
  float t = uTime*uSpeed*(.6+seed.w*.8);
  vec3 p = (seed.xyz-.5)*uBox + uVelDir*t;
  p.y += uScroll*(.5+seed.w);
  if (uKind==0) { p.x += sin(t*1.3+seed.x*20.)*.6; p.y += cos(t*.9+seed.z*14.)*.3; }
  if (uKind==1) { p.x += sin(t*2.6+seed.x*30.)*.35; p.z += cos(t*2.1+seed.y*30.)*.35; }
  p = mod(p+uBox*.5, uBox)-uBox*.5;
  vLife = .5+.5*sin(t*3.+seed.x*40.);
  vec2 q = position.xy*uSize*(.35+seed.w);
  if (uKind==0) {
    float a = t*2.2+seed.y*6.28; float flip = cos(t*3.1+seed.x*9.);
    q.x *= .25+.75*abs(flip);
    q = mat2(cos(a),-sin(a),sin(a),cos(a))*q;
  }
  if (uKind==2) { q.x *= .06; q.y *= 6.; q = mat2(.97,-.24,.24,.97)*q; }
  if (uKind==1) q *= .55+.45*vLife;
  vec4 mv = modelViewMatrix*vec4(p,1.);
  mv.xy += q;
  gl_Position = projectionMatrix*mv;
}`;
const FRAG = /* glsl */ `
precision highp float;
uniform vec3 uC1, uC2; uniform int uKind; uniform float uOpacity;
varying vec2 vUv; varying float vS; varying float vLife;
void main(){
  vec2 p = vUv*2.-1.;
  vec3 c = vS>.5?uC1:uC2; float a = 1.;
  if (uKind==0) { // petal with a notch
    float w = sqrt(max(0.,1.-p.y*p.y))*(.62-.18*p.y);
    if (abs(p.x)>w || (p.y>.72 && abs(p.x)<(p.y-.72)*.9)) discard;
    if (p.x>.06) c = mix(c,uC2,.55);
  } else if (uKind==1) { // ember: diamond
    if (abs(p.x)+abs(p.y)>1.) discard;
    if (abs(p.x)+abs(p.y)<.45) c = mix(c,vec3(1.),.7);
  } else if (uKind==2) { a = .55; }
  else { float r=length(p); if(r>1.) discard; if(r>.74) c=uC2; else c=uC1; }
  gl_FragColor = vec4(c,a*uOpacity);
}`;
const KIND = { petal: 0, ember: 1, rain: 2, foam: 3 };

export function particles({ kind = 'petal', n = 160, box = [24, 14, 12], size = 0.14, vel = [-0.8, -0.5, 0.2], speed = 1, c1 = 0xffffff, c2 = 0xff9db8, seed = 1, order = 60 } = {}) {
  const g = new THREE.InstancedBufferGeometry();
  const q = new THREE.PlaneGeometry(2, 2);
  g.index = q.index; g.setAttribute('position', q.attributes.position); g.setAttribute('uv', q.attributes.uv);
  let s = seed * 9301 + 49297; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  g.setAttribute('seed', new THREE.InstancedBufferAttribute(new Float32Array(Array.from({ length: n * 4 }, r)), 4));
  g.instanceCount = n;
  const u = {
    uTime: { value: 0 }, uSize: { value: size }, uScroll: { value: 0 }, uSpeed: { value: speed }, uBox: { value: new THREE.Vector3(...box) }, uVelDir: { value: new THREE.Vector3(...vel) },
    uKind: { value: KIND[kind] }, uC1: { value: new THREE.Color(c1) }, uC2: { value: new THREE.Color(c2) }, uOpacity: { value: 1 },
  };
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: u, transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide }));
  m.frustumCulled = false; m.renderOrder = order;
  return { mesh: m, u };
}
