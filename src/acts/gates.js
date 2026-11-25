import * as THREE from 'three';
import gsap from 'gsap';
import { torii, path } from '../stage/torii.js';
import { particles } from '../stage/particles.js';
import { cam, $, chars, slamIn, say, seg, smooth } from './kit.js';

const K = [
  { p: 0, fog: 0xc9efff, sky: 0x1d7fe8, a: 0x1a63d6, b: 0x5fb7f5, foam: 0xffffff, lit: 0xff3b1f, shade: 0xa81a24, sun: 0xffffff, cloud: 0xffffff },
  { p: 0.5, fog: 0xffd08a, sky: 0xff7a3c, a: 0xd9502f, b: 0xff9a52, foam: 0xfff0c9, lit: 0xf2301c, shade: 0x7d1030, sun: 0xfff6d6, cloud: 0xffe3a8 },
  { p: 1, fog: 0x8a0d1c, sky: 0x2a0410, a: 0x4d0716, b: 0x9c1020, foam: 0xff4a3a, lit: 0xb3121d, shade: 0x2c0512, sun: 0xff2a1f, cloud: 0x5c0816 },
].map((k) => Object.fromEntries(Object.entries(k).map(([n, v]) => [n, n === 'p' ? v : new THREE.Color(v)])));

export function gates({ stage, fx }) {
  const el = $('#gates'), camera = cam(58), { scene, u, last } = torii();
  const petals = particles({ kind: 'petal', n: 120, box: [16, 10, 20], size: 0.06, c1: 0xffffff, c2: 0xffb3c6, seed: 5 });
  scene.add(petals.mesh);
  const names = { fog: 'cFog', sky: 'cSky', a: 'cA', b: 'cB', foam: 'cFoam', lit: 'cLit', shade: 'cShade', sun: 'cSun', cloud: 'cCloud' };
  const tl = gsap.timeline({ paused: true });
  [['.g1', 0.05, 0.2], ['.g2', 0.24, 0.37], ['.g3', 0.42, 0.56]].forEach(([s, a, b]) => {
    const cs = chars($(s, el));
    // the words come down the tunnel with the gates and pass the lens
    tl.fromTo($(s, el), { autoAlpha: 0, scale: 0.12 }, { autoAlpha: 1, scale: 1, duration: 0.06, ease: 'power3.out' }, a)
      .fromTo(cs, { rotateX: -80, y: 30 }, { rotateX: 0, y: 0, stagger: 0.0012, duration: 0.05 }, a)
      .to($(s, el), { scale: 1.1, duration: b - a - 0.1, ease: 'none' }, a + 0.06)
      .to($(s, el), { scale: 7, autoAlpha: 0, duration: 0.04, ease: 'power3.in' }, b - 0.04);
  });
  say(tl, '#gates .v1', 0.62, 0.74); slamIn(tl, $('.g4', el), 0.77, 0.85); slamIn(tl, $('.g5', el), 0.87, 0);
  tl.set({}, {}, 1);
  return {
    id: 'gates', name: 'A Thousand Gates', ink: 'blood', el, scene, camera, tl, clear: 0xc9efff,
    out: { type: 'ink', span: 0.9, scarf: 3 },
    look: (p) => ({ glow: 0.35 + p * 0.4, thresh: 0.75 }),
    beats: [[0.6, () => { stage.impact(120); fx.rumble(); }]],
    resize(w, h) { u.uAsp.value = w / h; },
    update({ time, mouse, velocity }) {
      const p = this.p ?? 0;
      u.uTime.value = time; petals.u.uTime.value = time;
      // rush the run, then slow to a stop under the last tablet
      const r = p < 0.6 ? p / 0.6 * 0.94 : 0.94 + (1 - (1 - seg(p, 0.6, 0.95)) ** 3) * 0.06;
      const z = 6 + r * (last - 1.1), c = path(z), f = path(z - 14), near = smooth(seg(p, 0.56, 0.8));
      const shake = seg(p, 0.58, 0.64) * (1 - seg(p, 0.72, 0.8)) * 0.07, s = Math.floor(time * 14);
      camera.position.set(c.x + mouse.x * 0.5 + Math.sin(s * 9.1) * shake, 2.1 + Math.sin(p * 20) * 0.12 + mouse.y * 0.3 + Math.cos(s * 7.3) * shake, z);
      camera.up.set(0, 1, 0); camera.lookAt(f.x + mouse.x * 0.6, 2.7 + near * 5.4, z - 14);
      camera.rotateZ((c.x - f.x) * 0.045 - velocity * 0.05);
      camera.fov = 58 + Math.abs(velocity) * 22; camera.updateProjectionMatrix();
      petals.mesh.position.copy(camera.position); petals.u.uScroll.value = 0;
      const a = p < 0.5 ? K[0] : K[1], b = p < 0.5 ? K[1] : K[2], t = smooth(p < 0.5 ? seg(p, 0.1, 0.36) : seg(p, 0.5, 0.66));
      for (const n in names) u[names[n]].value.lerpColors(a[n], b[n], t);
      u.uSun.value = 0.13 + p * 0.2;
      petals.u.uC1.value.lerpColors(new THREE.Color(0xffffff), new THREE.Color(0xff3a22), t * (p > 0.5 ? 1 : 0));
    },
  };
}
