import * as THREE from 'three';
import { NOISE } from './glsl.js';

// The red scarf. It is the one thing that crosses every cut: a drawn ribbon laid
// over the finished frame that whips through each transition.
const N = 160;
const VERT = /* glsl */ `
attribute float side;
uniform vec2 uP[6]; uniform float uHead, uLen, uTime, uWidth, uAsp, uInkPass;
varying float vS, vFace, vT;
vec2 curve(float u){
  float x = clamp(u,0.,1.)*5.; float i = min(floor(x),4.), f = x-i;
  vec2 a=uP[0],b=uP[0],c=uP[0],d=uP[0];
  for(int k=0;k<6;k++){ float fk=float(k); if(fk==max(i-1.,0.))a=uP[k]; if(fk==i)b=uP[k]; if(fk==i+1.)c=uP[k]; if(fk==min(i+2.,5.))d=uP[k]; }
  return .5*((2.*b)+(c-a)*f+(2.*a-5.*b+4.*c-d)*f*f+(3.*b-a-3.*c+d)*f*f*f);
}
void main(){
  float s = position.x; vS = s; vT = side;
  float t = floor(uTime*14.)/14.;
  float u = uHead - s*uLen;
  vec2 p = curve(u), q = curve(u+.006);
  vec2 tan_ = normalize(q-p+1e-5), nrm = vec2(-tan_.y,tan_.x);
  float flut = sin(s*15.-t*9.)*.5+sin(s*27.-t*13.)*.25;
  p += nrm*flut*.055*smoothstep(0.,.35,s);
  float tw = cos(s*8.5-t*3.4+1.2);
  vFace = tw;
  float w = uWidth*(.22+.78*abs(tw))*(.12+.88*smoothstep(0.,.16,s));
  w += uInkPass;
  p += nrm*side*w;
  if (uInkPass>0. && s<.004) p += tan_*uInkPass;
  if (u<-.01||u>1.01) p = vec2(9.);
  gl_Position = vec4(p.x/uAsp, p.y, 0., 1.);
}`;
const FRAG = /* glsl */ `
precision highp float; varying float vS, vFace, vT; uniform float uInkPass;
${NOISE}
void main(){
  // the torn end
  float tear = .90+.07*abs(vT)+.03*step(.5,fract(vT*3.5));
  if (vS>tear) discard;
  if (uInkPass>0.) { gl_FragColor = vec4(.13,.0,.035,1.); return; }
  vec3 c = vFace>0. ? vec3(.92,.13,.11) : vec3(.60,.04,.08);
  if (vFace>0. && vT>.45) c = vec3(.74,.06,.09);
  if (vFace>.75 && vT<-.5 && vT>-.72) c = vec3(1.,.36,.28);
  gl_FragColor = vec4(c,1.);
}`;

const PATHS = [
  [[-2.6, -0.2], [-1.2, 0.55], [-0.1, -0.35], [0.7, 0.4], [1.5, -0.2], [2.8, 0.5]],
  [[2.6, 1.2], [1.0, 0.2], [0.2, 0.75], [-0.6, -0.1], [-1.3, 0.3], [-2.9, -0.7]],
  [[-2.4, -1.3], [-1.1, -0.2], [0.2, -0.8], [0.5, 0.5], [1.4, 0.2], [2.4, 1.6]],
  [[2.8, -0.5], [1.3, 0.25], [0.3, -0.55], [-0.7, 0.35], [-1.6, -0.3], [-2.8, 0.7]],
];

export function scarf() {
  const g = new THREE.BufferGeometry(), pos = [], side = [], idx = [];
  for (let i = 0; i <= N; i++) for (const s of [-1, 1]) { pos.push(i / N, 0, 0); side.push(s); }
  for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('side', new THREE.Float32BufferAttribute(side, 1)); g.setIndex(idx);
  const u = { uP: { value: PATHS[0].map((p) => new THREE.Vector2(...p)) }, uHead: { value: -1 }, uLen: { value: 0.62 }, uTime: { value: 0 }, uWidth: { value: 0.062 }, uAsp: { value: 1 } };
  const scene = new THREE.Scene();
  [0.012, 0].forEach((ink, i) => {
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { ...u, uInkPass: { value: ink } }, side: THREE.DoubleSide, depthTest: false, depthWrite: false }));
    m.frustumCulled = false; m.renderOrder = i; scene.add(m);
  });
  let cur = -1;
  return {
    scene, camera: new THREE.Camera(), visible: false,
    // k: which transition; m: how far through it
    set(k, m, time, asp) {
      this.visible = m > 0.001 && m < 0.999;
      if (!this.visible) return;
      if (k !== cur) { cur = k; PATHS[k % PATHS.length].forEach((p, i) => u.uP.value[i].set(p[0] * Math.max(0.62, asp / 1.6), p[1])); }
      u.uTime.value = time; u.uAsp.value = asp; u.uHead.value = m * (1 + u.uLen.value);
    },
  };
}
