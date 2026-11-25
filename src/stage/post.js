import * as THREE from 'three';
import { NOISE, FULLSCREEN_VERT } from './glsl.js';

// Composites the current act (A) with the next one (B) using a drawn transition,
// then adds the things a key animator would add in camera: focus lines, impact
// frames, letterbox bars, print grain.
export const TRANSITION = { cut: 0, iris: 1, slash: 2, ink: 3, burn: 4, diamond: 5 };

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tA, tB;
uniform float uMix, uTime, uInvert, uLines, uLetterbox, uVel, uFlash;
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
    // slight lens pull at the rim, like looking through a drop
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
    // the blade line itself, tapered at both ends
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
  return uMix<.5?A(uv):B(uv);
}

void main(){
  vec2 uv = vUv;
  float asp = uRes.x/uRes.y;
  vec3 c = transition(uv);

  // manga focus lines, redrawn on twos
  if (uLines > .001) {
    vec2 d = (uv-uCenter)*vec2(asp,1.);
    float a = atan(d.y,d.x)/6.2831853+.5, r = length(d);
    float boil = floor(uTime*12.);
    float n = vnoise(vec2(a*150.,boil*7.3)), n2 = hash(vec2(floor(a*150.),boil));
    float inner = mix(1.2,.36,uLines)+n2*.3;
    float w = clamp((r-inner)*2.6,0.,1.3);
    if (n < w*.55*uLines) c = mix(c, uInk, step(n, w*.55*uLines));
  }

  // speed smear: hard horizontal tone bands at the frame edge when you throw the scroll
  float v = clamp(abs(uVel),0.,1.);
  if (v > .05) {
    float edge = abs(uv.x-.5)*2.;
    float k = hash(vec2(floor(uv.x*220.), floor(uTime*18.)));
    float len = hash(vec2(floor(uv.x*220.)+9., floor(uTime*18.)));
    float y = fract(uv.y+len*7.+uTime*3.*sign(uVel));
    if (k > .965 && edge > .55 && y < len*.35*v) c = mix(c, vec3(1.), .85);
  }

  // impact frame
  if (uInvert > .5) {
    float l = dot(c, vec3(.3,.59,.11));
    c = l > .42 ? uInk : vec3(1.);
  }
  c = mix(c, vec3(1.), uFlash);

  // print grain, static per 1/12s so it sits still like cel dust
  float g = hash(gl_FragCoord.xy*.7+floor(uTime*12.)*13.);
  c += (g-.5)*.028;

  float bar = uLetterbox*.12;
  if (uv.y < bar || uv.y > 1.-bar) c = vec3(.012,.014,.03);
  gl_FragColor = vec4(c,1.);
}
`;

export function createPost() {
  const uniforms = {
    tA: { value: null }, tB: { value: null },
    uMix: { value: 0 }, uType: { value: 0 }, uTime: { value: 0 },
    uInvert: { value: 0 }, uLines: { value: 0 }, uLetterbox: { value: 0 },
    uVel: { value: 0 }, uFlash: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) }, uCenter: { value: new THREE.Vector2(0.5, 0.5) },
    uInk: { value: new THREE.Color(0x07102b) }, uEdge: { value: new THREE.Color(0xffffff) },
  };
  const mat = new THREE.ShaderMaterial({ vertexShader: FULLSCREEN_VERT, fragmentShader: FRAG, uniforms, depthTest: false, depthWrite: false });
  const scene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  scene.add(quad);
  return { scene, camera: new THREE.Camera(), uniforms };
}
