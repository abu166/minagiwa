import * as THREE from 'three';
import { NOISE, FULLSCREEN_VERT } from './glsl.js';

// Composites the current act (A) with the next one (B) using a drawn transition,
// then does the photography: glow, time-stop tones, cracks, focus lines, impact
// frames, letterbox and print grain.
export const TRANSITION = { cut: 0, iris: 1, slash: 2, ink: 3, burn: 4, diamond: 5, shatter: 6, swell: 7, white: 8 };

const COMPOSITE = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tA, tB;
uniform float uMix, uTime;
uniform int uType;
uniform vec2 uRes, uCenter;
uniform vec3 uInk, uEdge;
${NOISE}
vec3 A(vec2 p){ return texture2D(tA, p).rgb; }
vec3 B(vec2 p){ return texture2D(tB, p).rgb; }

vec3 transition(vec2 uv){
  float asp = uRes.x/uRes.y;
  if (uMix <= 0.0001) return A(uv);
  if (uMix >= 0.9999) return B(uv);

  if (uType == 1) { // iris with a wobbling drawn ring
    vec2 d = (uv-uCenter)*vec2(asp,1.);
    float ang = atan(d.y,d.x);
    float boil = floor(uTime*10.)*3.1;
    float wob = (vnoise(vec2(ang*2.2+boil, boil))-.5)*.035*(1.-uMix*.6);
    float maxR = length(vec2(asp,1.))*1.05;
    float R = pow(uMix,1.6)*maxR;
    float r = length(d)+wob;
    float w = .012+.02*(1.-uMix);
    vec2 pull = normalize(d+1e-5)*smoothstep(R-.25,R,r)*.05/vec2(asp,1.);
    vec3 c = r < R ? B(uv-pull) : A(uv);
    if (abs(r-R) < w) c = uEdge;
    if (abs(r-R-w*2.4) < w*.35) c = uEdge;
    return c;
  }
  if (uType == 5) { // rotating diamond that grows into the frame
    vec2 d = (uv-uCenter)*vec2(asp,1.);
    float th = uMix*1.2; d = mat2(cos(th),-sin(th),sin(th),cos(th))*d;
    float r = pow(pow(abs(d.x),1.15)+pow(abs(d.y),1.15),1./1.15);
    float R = pow(uMix,1.7)*(asp+1.1)*1.3;
    vec3 c = r<R ? B((uv-uCenter)*mix(.72,1.,uMix)+uCenter) : A(uv);
    if (abs(r-R)<.012) c = uEdge;
    return c;
  }
  if (uType == 2) { // blade cut: the frame splits along a diagonal and slides apart
    vec2 p = (uv-.5)*vec2(asp,1.);
    vec2 dir = normalize(vec2(1.,.42)), nrm = vec2(-dir.y,dir.x);
    float side = dot(p,nrm), along = dot(p,dir);
    float draw = smoothstep(0.,.22,uMix);
    float open = pow(smoothstep(.2,1.,uMix),2.2);
    float gap = open*1.25;
    float jag = (vnoise(vec2(along*9.,2.))-.5)*.015*(1.-open);
    vec3 c;
    if (side+jag > gap)       c = A(uv-(nrm*gap+dir*open*.35)/vec2(asp,1.));
    else if (side+jag < -gap) c = A(uv+(nrm*gap+dir*open*.35)/vec2(asp,1.));
    else                      c = B((uv-.5)*mix(.86,1.,open)+.5);
    float head = mix(-1.3,1.3,draw)*asp*.6;
    float taper = smoothstep(head, head-.5, along)*smoothstep(-asp*.75,-asp*.2,along);
    float thick = .012*taper*(1.-open);
    if (abs(side) < thick) c = vec3(1.);
    else if (abs(side) < thick*1.9) c = uInk;
    float rim = min(abs(side+jag-gap),abs(side+jag+gap));
    if (open>.001 && rim < .006) c = vec3(1.);
    return c;
  }
  if (uType == 3) { // ink brush sweep
    float s = uv.x*.75+uv.y*.35 + (fbm(vec2(uv.x*2.5,uv.y*9.))-.5)*.55 + (vnoise(vec2(uv.x*3.,uv.y*120.))-.5)*.16;
    float t = uMix*2.1-.45;
    vec3 c = A(uv);
    if (s < t+.32) c = uInk;
    if (s < t) c = B(uv);
    return c;
  }
  if (uType == 4) { // paper burn
    float n = fbm(uv*vec2(asp,1.)*3.2+vec2(0.,-uTime*.06))*.75 + (1.-uv.y)*-.35 + .28 + vnoise(uv*26.)*.06;
    float t = uMix*1.35-.15;
    vec3 c = n < t ? B(uv) : A(uv);
    float e = n-t;
    if (e>0. && e<.085) c = mix(vec3(.09,.02,.03), c, step(.06,e)*.35);
    if (e>0. && e<.04) c = vec3(.93,.22,.06);
    if (e>0. && e<.018) c = vec3(1.,.83,.35);
    return c;
  }
  if (uType == 7) { // the sea rises over the frame, foam first
    float t = floor(uTime*12.)/12.;
    float x = uv.x*asp;
    float h = uMix*1.55-.28;
    float crest = h + sin(x*2.1+t*1.6)*.05*(1.-uMix*.5) + sin(x*5.3-t*2.3)*.022
      + (vnoise(vec2(x*7.+t*.8,t*.6))-.5)*.05;
    float claw = pow(abs(sin(x*9.+t*.9+sin(x*3.)*1.5)),3.)*.045;
    float d = crest + claw - uv.y;
    vec2 q = uv; q.x += sin(uv.y*30.+t*4.)*.006*smoothstep(.0,.2,d)*(1.-uMix); 
    vec3 c = d > 0. ? B(q) : A(uv);
    if (d > 0. && d < .16) c = mix(vec3(.06,.22,.62), c, .25);
    if (d > 0. && d < .10) c = vec3(.35,.67,.98);
    float lace = vnoise(vec2(x*16.+t, uv.y*22.-t*3.));
    if (d > 0. && d < .045+lace*.06) c = vec3(1.);
    if (d > -.007 && d < 0.) c = uInk;
    if (d > .045+lace*.06 && d < .052+lace*.06) c = uInk;
    return c;
  }
  if (uType == 8) { // dissolve through white light, brightest parts first
    vec3 a = A(uv), b = B(uv);
    float l = dot(a,vec3(.3,.59,.11));
    float w = smoothstep(0.,.5,uMix+l*.22-.1);
    float o = smoothstep(.5,1.,uMix);
    return mix(mix(a,vec3(1.),w), b, o);
  }
  return uMix<.5?A(uv):B(uv);
}
void main(){ gl_FragColor = vec4(uType==6 && uMix>0.0001 ? B(vUv) : transition(vUv),1.); }
`;

const BRIGHT = /* glsl */ `
precision highp float; varying vec2 vUv; uniform sampler2D tC; uniform vec2 uTexel; uniform float uThresh;
void main(){
  vec3 c = (texture2D(tC,vUv+uTexel*vec2(1,1)).rgb+texture2D(tC,vUv+uTexel*vec2(-1,1)).rgb+texture2D(tC,vUv+uTexel*vec2(1,-1)).rgb+texture2D(tC,vUv+uTexel*vec2(-1,-1)).rgb)*.25;
  float l = max(c.r,max(c.g,c.b));
  gl_FragColor = vec4(c*smoothstep(uThresh,1.,l),1.);
}`;
const BLUR = /* glsl */ `
precision highp float; varying vec2 vUv; uniform sampler2D tC; uniform vec2 uDir;
void main(){
  vec3 c = texture2D(tC,vUv).rgb*.204;
  c += (texture2D(tC,vUv+uDir*1.407).rgb+texture2D(tC,vUv-uDir*1.407).rgb)*.304;
  c += (texture2D(tC,vUv+uDir*3.294).rgb+texture2D(tC,vUv-uDir*3.294).rgb)*.094;
  gl_FragColor = vec4(c,1.);
}`;

const FINAL = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tC, tGlow;
uniform float uTime, uInvert, uLines, uLetterbox, uVel, uFlash, uGlow, uDuo, uCrack, uPulse, uDark;
uniform vec2 uRes, uCenter;
uniform vec3 uInk;
${NOISE}

// shards of a cracked pane: cells in warped polar space so they radiate from the hit
vec4 cells(vec2 d){
  float r = length(d), a = atan(d.y,d.x)/6.2831853;
  vec2 g = vec2(a*23., log(r+.05)*1.25+hash(vec2(floor(a*23.),1.))*.0);
  vec2 ip = floor(g), f = fract(g); float f1=9.,f2=9.; vec2 id=vec2(0.);
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
    vec2 c = ip+vec2(float(x),float(y)); vec2 w = vec2(mod(c.x+23.,23.),c.y);
    vec2 o = vec2(hash(w),hash(w+7.7)); vec2 q = vec2(float(x),float(y))+o*.9-f; float dd=dot(q,q);
    if(dd<f1){f2=f1;f1=dd;id=w;} else if(dd<f2) f2=dd;
  }
  return vec4(sqrt(f2)-sqrt(f1), id, r);
}

void main(){
  vec2 uv = vUv;
  float asp = uRes.x/uRes.y;
  vec2 d0 = (uv-uCenter)*vec2(asp,1.);

  // a heartbeat pushes the whole frame
  uv = (uv-uCenter)*(1.-uPulse*.035)+uCenter;

  float crackLine = 0.;
  if (uCrack > .001) {
    vec4 k = cells(d0);
    float on = step(k.w, uCrack*1.35*(.65+.35*hash(k.yz)));
    vec2 off = (vec2(hash(k.yz+1.),hash(k.yz+3.))-.5)*.05*uCrack*on;
    uv += off;
    float th = (.012+.035*uCrack*smoothstep(1.1,0.,k.w))*on;
    crackLine = step(k.x, th);
  }

  vec3 c = texture2D(tC, uv).rgb;
  vec3 glow = texture2D(tGlow, uv).rgb;
  c = 1.-(1.-c)*(1.-glow*uGlow);

  // time stops: four flat tones, and red is the only colour left
  if (uDuo > .001) {
    float n = (vnoise(vec2(atan(d0.y,d0.x)*4.,floor(uTime*10.)))-.5)*.06;
    float reach = length(d0)+n;
    if (reach < uDuo*1.5) {
      float l = dot(c,vec3(.3,.59,.11));
      float red = c.r-max(c.g,c.b);
      vec3 t = vec3(.016,.03,.10);
      if (l>.16) t = vec3(.05,.13,.36);
      if (l>.38) t = vec3(.42,.60,.90);
      if (l>.62) t = vec3(.95,.98,1.);
      if (red>.16) t = l>.2 ? vec3(.92,.13,.10) : vec3(.5,.04,.07);
      c = t;
      if (reach > uDuo*1.5-.012) c = vec3(1.);
    }
  }

  if (uLines > .001) {
    float a = atan(d0.y,d0.x)/6.2831853+.5, r = length(d0);
    float boil = floor(uTime*12.);
    float n = vnoise(vec2(a*150.,boil*7.3)), n2 = hash(vec2(floor(a*150.),boil));
    float inner = mix(1.2,.36,uLines)+n2*.3;
    float w = clamp((r-inner)*2.6,0.,1.3);
    if (n < w*.55*uLines) c = uInk;
  }

  float v = clamp(abs(uVel),0.,1.);
  if (v > .05) {
    float edge = abs(vUv.x-.5)*2.;
    float k = hash(vec2(floor(vUv.x*220.), floor(uTime*18.)));
    float len = hash(vec2(floor(vUv.x*220.)+9., floor(uTime*18.)));
    float y = fract(vUv.y+len*7.+uTime*3.*sign(uVel));
    if (k > .965 && edge > .55 && y < len*.35*v) c = mix(c, vec3(1.), .85);
  }
  if (crackLine > .5) c = vec3(1.);
  if (uInvert > .5) { float l = dot(c, vec3(.3,.59,.11)); c = l > .42 ? uInk : vec3(1.); }

  c = mix(c, vec3(1.), uFlash);
  c *= 1.-uDark;
  float g = hash(gl_FragCoord.xy*.7+floor(uTime*12.)*13.);
  c += (g-.5)*.028;
  float bar = uLetterbox*.12;
  if (vUv.y < bar || vUv.y > 1.-bar) c = vec3(.012,.014,.03);
  gl_FragColor = vec4(c,1.);
}`;

// Real shards for the mask breaking: a radial fracture whose pieces carry frame A away.
function shards() {
  const RINGS = [0, 0.1, 0.22, 0.4, 0.66, 1.05, 1.7, 2.6], SEC = 15;
  let s = 11; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const node = RINGS.map((R, i) => Array.from({ length: SEC }, (_, k) => {
    const a = (k + (i ? (r() - 0.5) * 0.7 : 0) + (i % 2) * 0.5) / SEC * Math.PI * 2, rr = R * (1 + (r() - 0.5) * 0.28);
    return [Math.cos(a) * rr, Math.sin(a) * rr];
  }));
  const pos = [], cen = [], rnd = [], bar = [];
  const tri = (a, b, c) => {
    const m = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3], q = [r(), r(), r(), r()];
    [a, b, c].forEach((p, i) => { pos.push(p[0], p[1], 0); cen.push(...m); rnd.push(...q); bar.push(+(i === 0), +(i === 1), +(i === 2)); });
  };
  for (let i = 0; i < RINGS.length - 1; i++) for (let k = 0; k < SEC; k++) {
    const n = (k + 1) % SEC, a = node[i][k], b = node[i][n], c = node[i + 1][k], d = node[i + 1][n];
    if (i) tri(a, b, d); tri(a, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('cen', new THREE.Float32BufferAttribute(cen, 2));
  g.setAttribute('rnd', new THREE.Float32BufferAttribute(rnd, 4)); g.setAttribute('bar', new THREE.Float32BufferAttribute(bar, 3));
  return g;
}
const SHARD_V = /* glsl */ `
attribute vec2 cen; attribute vec4 rnd; attribute vec3 bar;
uniform float uMix; uniform vec2 uRes, uCenter;
varying vec2 vUv; varying vec3 vB; varying float vL;
mat3 rot(vec3 a, float t){ float c=cos(t),s=sin(t),k=1.-c; return mat3(c+a.x*a.x*k,a.x*a.y*k-a.z*s,a.x*a.z*k+a.y*s,a.y*a.x*k+a.z*s,c+a.y*a.y*k,a.y*a.z*k-a.x*s,a.z*a.x*k-a.y*s,a.z*a.y*k+a.x*s,c+a.z*a.z*k); }
void main(){
  float asp = uRes.x/uRes.y;
  vec2 C = (uCenter*2.-1.)*vec2(asp,1.);
  vec2 world = position.xy*2.+C;
  vUv = world/vec2(asp,1.)*.5+.5; vB = bar;
  float t = max(0., uMix*1.5 - length(cen)*.16 - rnd.w*.08);
  vec3 l = vec3((position.xy-cen)*2.,0.);
  l = rot(normalize(rnd.xyz-.5), t*t*(5.+rnd.x*6.))*l;
  vL = abs(l.z)*3.;
  vec3 p = vec3(cen*2.+C,0.) + l;
  p.xy += normalize(cen+1e-4)*t*t*(1.4+rnd.y*2.2); p.y -= t*t*1.6; p.z += t*(1.2+rnd.z*3.2);
  float w = max(.15, 1.-p.z*.16);
  gl_Position = vec4(p.x/asp, p.y, 0., w);
}`;
const SHARD_F = /* glsl */ `
precision highp float; uniform sampler2D tA; varying vec2 vUv; varying vec3 vB; varying float vL; uniform float uMix;
void main(){
  vec3 c = texture2D(tA, clamp(vUv,0.,1.)).rgb;
  float e = min(vB.x,min(vB.y,vB.z));
  c = mix(c, vec3(1.), clamp(vL*.35,0.,.6));
  if (e < .03*smoothstep(0.,.1,uMix)) c = vec3(1.);
  gl_FragColor = vec4(c,1.);
}`;

export function createPost() {
  const u = {
    tA: { value: null }, tB: { value: null }, tC: { value: null }, tGlow: { value: null },
    uMix: { value: 0 }, uType: { value: 0 }, uTime: { value: 0 }, uInvert: { value: 0 }, uLines: { value: 0 }, uLetterbox: { value: 0 },
    uVel: { value: 0 }, uFlash: { value: 0 }, uGlow: { value: 0.5 }, uDuo: { value: 0 }, uCrack: { value: 0 }, uPulse: { value: 0 }, uDark: { value: 0 },
    uThresh: { value: 0.7 }, uTexel: { value: new THREE.Vector2() }, uDir: { value: new THREE.Vector2() },
    uRes: { value: new THREE.Vector2(1, 1) }, uCenter: { value: new THREE.Vector2(0.5, 0.5) },
    uInk: { value: new THREE.Color(0x07102b) }, uEdge: { value: new THREE.Color(0xffffff) },
  };
  const mk = (frag) => {
    const scene = new THREE.Scene();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: FULLSCREEN_VERT, fragmentShader: frag, uniforms: u, depthTest: false, depthWrite: false }));
    quad.frustumCulled = false; scene.add(quad); return scene;
  };
  const composite = mk(COMPOSITE);
  const shard = new THREE.Mesh(shards(), new THREE.ShaderMaterial({ vertexShader: SHARD_V, fragmentShader: SHARD_F, uniforms: u, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
  shard.frustumCulled = false; shard.renderOrder = 2; shard.visible = false; composite.add(shard);
  return { composite, bright: mk(BRIGHT), blur: mk(BLUR), final: mk(FINAL), shard, camera: new THREE.Camera(), uniforms: u };
}
