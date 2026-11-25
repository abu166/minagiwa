import './style.css';
import { Stage } from './stage/stage.js';
import { pending } from './stage/layer.js';
import { Director } from './scroll.js';
import { makeSound } from './ui/sound.js';
import { makeFx } from './ui/fx.js';
import { $, $$, rm } from './acts/kit.js';
import { moon } from './acts/moon.js';
import { breath } from './acts/breath.js';
import { forms } from './acts/forms.js';
import { gates } from './acts/gates.js';
import { oni } from './acts/oni.js';
import { fire } from './acts/fire.js';
import { dawn } from './acts/dawn.js';

// The kit ships plain scripts that register elements; load them as they are.
const KIT = ['button', 'progress', 'toggle', 'tabs', 'slider', 'input', 'radio', 'checkbox', 'tooltip', 'toast'];
const script = (n) => new Promise((r) => { const s = document.createElement('script'); s.src = `./sakuga-vfx/${n}.js`; s.onload = s.onerror = r; document.head.append(s); });

async function boot() {
  history.scrollRestoration = 'manual'; scrollTo(0, 0);
  await script('progress');
  const bar = $('#loader sakuga-progress'), loaded = { n: 0 };
  const total = KIT.length + 2 + 12;
  const step = () => bar.set?.(Math.min(0.97, ++loaded.n / total));
  await Promise.all([
    ...KIT.filter((k) => k !== 'progress').map((k) => script(k).then(step)),
    ...[['Reggae One', 'Minagiwa'], ['Yuji Boku', '水際炎沈月走潮輪波静雨沸点一二三四五六七']].map(([f, t]) => document.fonts.load(`100px "${f}"`, t).then(step)),
  ]);

  const sound = makeSound(), fx = makeFx(sound);
  const stage = new Stage($('#stage'));
  const ctx = { stage, fx, go: (id, p) => { const a = acts.find((x) => x.id === id); director.to(a, p, { duration: 1.1 }); } };
  const acts = [moon, breath, forms, gates, oni, fire, dawn].map((f) => stage.add(f(ctx)));
  pending.forEach((p) => p.then(step));
  const imgs = $$('main img').map((i) => i.decode().catch(() => { }));
  await Promise.all([...pending, ...imgs]);
  stage.resize();

  const blade = $('.blade'), slug = $('.slug'), list = $('ol', blade);
  const director = new Director(acts, {
    onAct(a, i) {
      $('b', slug).textContent = a.num; $('span', slug).textContent = a.name;
      slug.classList.remove('swap'); void slug.offsetWidth; slug.classList.add('swap');
      $$('button', list).forEach((b, k) => b.setAttribute('aria-current', String(k === i)));
    },
  });
  const end = () => document.documentElement.scrollHeight - innerHeight;
  acts.forEach((a) => {
    const li = document.createElement('li'), b = document.createElement('button');
    b.textContent = a.num; b.setAttribute('aria-label', `Cut ${a.num}: ${a.name}`); b.onclick = () => director.to(a, 0.04);
    li.append(b); list.append(li);
  });
  const placeTicks = () => [...list.children].forEach((li, i) => { li.style.top = `${acts[i].top / end() * 100}%`; });
  placeTicks(); addEventListener('resize', placeTicks);
  wire({ director, acts, sound, fx, stage });

  // compile shaders before the curtain goes up
  for (const a of acts) { a.p = 0; stage.renderer.compile(a.scene, a.camera); a.scene.traverse((o) => { const t = o.material?.uniforms?.map?.value; if (t?.image) stage.renderer.initTexture(t); }); }
  // and draw each act once off-screen, so the first real frame of a cut is never the slow one
  for (const a of acts) stage.render({ a, mix: 0, type: 'cut', velocity: 0 }, 0.016);

  const foot = $('.foot-big');
  let last = performance.now(), shown = false;
  const frame = (ms) => {
    const dt = Math.min(0.05, Math.max(0.001, (ms - last) / 1000)); last = ms;
    const s = director.raf(ms, dt);
    const fr = foot.getBoundingClientRect();
    if (fr.top > 0 || fr.bottom > 0) { if (fr.top < innerHeight) foot.style.transform = `translateX(${(fr.top / innerHeight - 0.2) * -26}%) skewX(${-director.vel * 14}deg)`; }
    document.body.classList.toggle('at-foot', fr.top < innerHeight);
    blade.style.setProperty('--drawn', (director.y / end()).toFixed(4));
    sound.velocity(director.vel);
    stage.render({ ...s, letterbox: rm ? 0 : s.letterbox }, dt);
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

function wire({ director, acts, sound, fx, stage }) {
  const dawnAct = acts.at(-1), toast = $('.toast');
  $('.snd sakuga-toggle').addEventListener('change', (e) => sound.set(e.currentTarget.checked));
  $('#jump-oath').addEventListener('click', () => director.to(dawnAct, 1, { duration: 2.4 }));
  $$('a[href="#moon"]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); director.lenis.scrollTo(0, { duration: 2.2 }); }));

  const form = $('.oath'), name = $('sakuga-input', form), radio = $('sakuga-radio', form), vow = $('sakuga-checkbox', form), btn = $('#seal');
  const stamp = (n, k) => {
    const b = document.createElement('b'), s = document.createElement('small');
    b.textContent = k; s.textContent = n; b.append(s); $('.stamp').replaceChildren(b);
  };
  const seal = () => {
    const n = (name.value || '').trim().slice(0, 18);
    if (!n) return toast.show('The gate needs a name');
    if (!vow.checked) return toast.show('Make the vow first');
    stamp(n, radio.value || '水');
    try { localStorage.setItem('minagiwa-oath', JSON.stringify([n, radio.value || '水'])); } catch { }
    btn.done(); stage.impact(90);
    const r = $('.stamp').getBoundingClientRect(); fx.boom(r.left + r.width / 2, r.top + r.height / 2);
    toast.show('Sealed');
  };
  btn.addEventListener('click', seal);
  form.addEventListener('submit', (e) => { e.preventDefault(); seal(); });
  try { const o = JSON.parse(localStorage.getItem('minagiwa-oath')); if (o) stamp(...o); } catch { }
}

boot();
