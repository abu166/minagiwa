import './style.css';
import { Stage } from './stage/stage.js';
import { pending } from './stage/layer.js';
import { Director } from './scroll.js';
import { makeSound } from './ui/sound.js';
import { makeFx } from './ui/fx.js';
import { $, $$, rm, NUM } from './acts/kit.js';
import { moon } from './acts/moon.js';
import { breath } from './acts/breath.js';
import { forms } from './acts/forms.js';
import { gates } from './acts/gates.js';
import { oni } from './acts/oni.js';
import { fire } from './acts/fire.js';
import { two } from './acts/two.js';
import { eleven } from './acts/eleven.js';
import { twelve } from './acts/twelve.js';
import { sky } from './acts/sky.js';
import { stinger } from './acts/stinger.js';

// The kit ships plain scripts that register elements; load them as they are.
const KIT = ['progress', 'button', 'toggle'];
const script = (n) => new Promise((r) => { const s = document.createElement('script'); s.src = `./sakuga-vfx/${n}.js`; s.onload = s.onerror = r; document.head.append(s); });

async function boot() {
  history.scrollRestoration = 'manual'; scrollTo(0, 0);
  await script('progress');
  const bar = $('#loader sakuga-progress'), loaded = { n: 0 };
  const total = KIT.length + 2 + 38;
  const step = () => bar.set?.(Math.min(0.97, ++loaded.n / total));
  await Promise.all([
    ...KIT.filter((k) => k !== 'progress').map((k) => script(k).then(step)),
    ...[['Reggae One', 'Minagiwa'], ['Yuji Boku', '水際炎空沈月走潮輪波静雨沸点一二三四五六七八九十蓮花湊凪葵海楓律澪朔紬樹雫陸渚茜仁百合大地小春直千代汐光桜健沙羅勇美波圭鈴修文幸岬実清隼和']].map(([f, t]) => document.fonts.load(`100px "${f}"`, t).then(step)),
  ]);

  const sound = makeSound(), fx = makeFx(sound);
  const stage = new Stage($('#stage'));
  const ctx = { stage, fx, sound, go: (id, p, duration = 1.1) => { const a = acts.find((x) => x.id === id); director.to(a, p, { duration }); } };
  const acts = [moon, two, eleven, breath, forms, gates, oni, fire, twelve, sky, stinger].map((f) => stage.add(f(ctx)));
  pending.forEach((p) => p.then(step));
  const imgs = $$('main img').map((i) => i.decode().catch(() => { }));
  await Promise.all([...pending, ...imgs]);
  stage.resize();

  const blade = $('.blade'), slug = $('.slug'), list = $('ol', blade);
  const director = new Director(acts, {
    onAct(a, i) {
      $('b', slug).textContent = a.hidden ? '' : NUM[i + 1]; $('span', slug).textContent = a.name;
      fx.ink(a.ink);
      slug.classList.remove('swap'); void slug.offsetWidth; slug.classList.add('swap');
      $$('button', list).forEach((b, k) => b.setAttribute('aria-current', String(k === i)));
    },
  });
  const end = () => document.documentElement.scrollHeight - innerHeight;
  acts.forEach((a, i) => {
    if (a.hidden) return;
    const li = document.createElement('li'), b = document.createElement('button');
    b.textContent = NUM[i + 1]; b.setAttribute('aria-label', `Cut ${i + 1}: ${a.name}`); b.onclick = () => director.to(a, 0.04);
    li.append(b); list.append(li);
  });
  const placeTicks = () => [...list.children].forEach((li, i) => { li.style.top = `${acts[i].top / end() * 100}%`; });
  placeTicks(); addEventListener('resize', placeTicks);
  wire({ director, sound, stage });

  // compile shaders before the curtain goes up
  for (const a of acts) { a.p = 0; stage.renderer.compile(a.scene, a.camera); a.scene.traverse((o) => { const t = o.material?.uniforms?.map?.value; if (t?.image) stage.renderer.initTexture(t); }); }
  // and draw each act once off-screen, so the first real frame of a cut is never the slow one
  for (const a of acts) stage.render({ a, mix: 0, type: 'cut', velocity: 0 }, 0.016);

  const foot = $('footer');
  let last = performance.now(), shown = false;
  const frame = (ms) => {
    const dt = Math.min(0.05, Math.max(0.001, (ms - last) / 1000)); last = ms;
    const s = director.raf(ms, dt);
    const fr = foot.getBoundingClientRect();
    document.body.classList.toggle('at-foot', fr.top < innerHeight * 0.9 && fr.bottom > 0);
    blade.style.setProperty('--drawn', (director.y / end()).toFixed(4));
    sound.velocity(director.vel);
    stage.render(s, dt);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  if (import.meta.env.DEV) Object.assign(window, { __film: { director, acts, stage } });

  const open = () => {
    if (shown) return; shown = true;
    document.body.classList.remove('is-loading'); $('#loader').classList.add('gone');
    setTimeout(() => { director.measure(); director.ready = true; acts[0].intro?.(); }, 260);
    setTimeout(() => $('#loader').remove(), 1200);
  };
  bar.addEventListener('sakuga:done', () => setTimeout(open, 550));
  bar.set?.(1); setTimeout(open, 3500);
}

function wire({ director, sound, stage }) {
  $('.snd sakuga-toggle').addEventListener('change', (e) => sound.set(e.currentTarget.checked));
  $$('a[href="#moon"]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); director.lenis.scrollTo(0, { duration: 2.2 }); }));

  // Play: the film runs itself at a watchable pace until you take the wheel back.
  const play = $('#play'); let on = false;
  const stop = () => { if (!on) return; on = false; play.textContent = 'Play'; director.lenis.stop(); director.lenis.start(); };
  play.addEventListener('click', () => {
    if (on) return stop();
    const end = document.documentElement.scrollHeight - innerHeight, left = end - director.lenis.scroll;
    if (left < 40) return director.lenis.scrollTo(0, { duration: 2 });
    on = true; play.textContent = 'Pause';
    director.lenis.scrollTo(end, { duration: left / innerHeight * 3.4, easing: (t) => t, onComplete: () => { on = false; play.textContent = 'Play'; } });
  });
  for (const ev of ['wheel', 'touchstart', 'keydown']) addEventListener(ev, (e) => { if (!(ev === 'keydown' && ['Enter', 'Tab'].includes(e.key)) && !play.contains(e.target)) stop(); }, { passive: true });
}

boot();
