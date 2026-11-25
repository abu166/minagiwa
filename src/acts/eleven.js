import * as THREE from 'three';
import gsap from 'gsap';
import { Layer, tex } from '../stage/layer.js';
import { Panel } from '../stage/panel.js';
import { particles } from '../stage/particles.js';
import { cam, $, say, slamIn, seg, smooth, outExpo, NUM } from './kit.js';

// He holds the sea for eleven heartbeats. Time is stopped: four tones and red.
const A = 0.3, B = 0.7;
export function eleven({ stage, fx, sound }) {
  const el = $('#eleven'), scene = new THREE.Scene(), camera = cam(35);
  const wave = new Layer(tex('./art/wave.webp'), { z: -4, cover: 1.22, order: 0, depth: tex('./art/wave_d.webp') });
  const drift = new Layer(tex('./art/scarf.webp'), { z: -4, cover: 1.2, order: 5, depth: tex('./art/scarf_d.webp'), water: 0.006, horizon: 1.4 });
  const hold = new Panel(tex('./art/hold.webp'), { border: 9, edge: 0xffffff, order: 8 });
  for (const l of [wave, drift]) { l.place(camera); scene.add(l.mesh); }
  scene.add(hold.mesh);
  const spray = particles({ kind: 'foam', n: 130, box: [18, 12, 8], size: 0.05, vel: [1.6, -0.4, 0.4], c1: 0xffffff, c2: 0x8fd8ff, seed: 77, order: 4 });
  scene.add(spray.mesh);
  const count = $('.count', el); let n = -1, held = 0;
  const tl = gsap.timeline({ paused: true });
  slamIn(tl, $('.el-t1', el), 0.05, 0.19);
  slamIn(tl, $('.el-t2', el), 0.22, 0.3);
  slamIn(tl, $('.el-t3', el), 0.84, 0);
  tl.to('#eleven .el-t3', { autoAlpha: 0, duration: 0.03 }, 0.975).set({}, {}, 1);
  return {
    id: 'eleven', name: 'Eleven', el, scene, camera, tl, clear: 0x02040c, ink: 'water',
    out: { type: 'ink', span: 0.8, scarf: 2 },
    look: (p) => ({
      duo: p < 0.235 || p > 0.735 ? 0 : outExpo(seg(p, 0.235, 0.275)) * (1 - seg(p, 0.72, 0.735)), center: [0.5, 0.42],
      crack: seg(p, 0.56, 0.72) * 0.55 * (p < 0.735 ? 1 : 0),
      letterbox: seg(p, 0.2, 0.25) * (1 - seg(p, 0.94, 0.98)),
      dark: Math.max(0, seg(p, 0.735, 0.745) - seg(p, 0.78, 0.9)), glow: 0.5, lines: p > 0.66 && p < 0.735 ? 0.7 : 0,
    }),
    beats: [[0.235, () => { stage.impact(110); sound.stop(); }], [0.735, () => { stage.flashWhite(1); stage.impact(140); fx.boom(innerWidth / 2, innerHeight / 2, false); sound.crash(); }]],
    resize() { wave.place(camera); drift.place(camera); },
    update({ time, mouse }) {
      const p = this.p ?? 0, frozen = p > 0.235 && p < 0.735;
      const k = p < A || p > 0.735 ? 0 : Math.min(11, 1 + Math.floor(seg(p, A, B) * 11));
      if (k !== n) {
        if (k > n && k > 0 && this.el.classList.contains('is-live')) { stage.beat(1); sound.heart(1); }
        n = k; count.textContent = [...NUM[k]].join('\n'); count.classList.toggle('dbl', NUM[k].length > 1); count.classList.remove('hit'); void count.offsetWidth; if (k) count.classList.add('hit');
        el.style.setProperty('--k', k);
      }
      if (!frozen) held = time; 
      wave.u.uTime.value = time; drift.u.uTime.value = time; spray.u.uTime.value = frozen ? held : time;
      const grow = seg(p, 0, 0.23), strain = seg(p, 0.235, 0.735), s = Math.floor(time * 14), q = strain * strain * 0.05 * (frozen ? 1 : 0);
      camera.position.set(Math.sin(s * 9.1) * q, (0.5 - grow) * -0.5 + Math.cos(s * 7.7) * q, 10 - grow * 1.2 - k * 0.07);
      wave.u.uPar.value.set(mouse.x * 0.01, -0.02 + grow * 0.03 + strain * 0.012); wave.u.uDolly.value = grow * 0.06 + strain * 0.1;
      const d = p > 0.737; drift.opacity = d ? 1 : 0; wave.opacity = d ? 0 : 1; spray.mesh.visible = !d;
      const e = seg(p, 0.74, 1); drift.scale(1.16 - e * 0.14); drift.u.uPar.value.set(mouse.x * 0.008, (e - 0.5) * 0.02); drift.mesh.rotation.z = (e - 0.5) * 0.08;
      // the close-up cuts in for three beats, then again at the end
      const w = innerWidth, h = innerHeight, on = k >= 4 && k <= 7, on2 = k >= 10;
      hold.mesh.visible = false;
      if (on || on2) {
        const y0 = on ? 0.3 : 0.16, y1 = on ? 0.72 : 0.84, t = on ? seg(p, A + (3 / 11) * (B - A), A + (3.5 / 11) * (B - A)) : 1, x = (1 - outExpo(t)) * -w * 1.1;
        hold.set([[x - 20, h * (y0 + 0.07)], [x + w + 20, h * (y0 - 0.03)], [x + w + 20, h * (y1 - 0.06)], [x - 20, h * (y1 + 0.04)]], { w, h, zoom: 1.1 + k * 0.02, focus: [0.5, 0.42] });
      }
    },
  };
}
