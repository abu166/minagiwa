import * as THREE from 'three';
import { createPost, TRANSITION } from './post.js';
import { scarf } from './scarf.js';

THREE.ColorManagement.enabled = false;
const rm = matchMedia('(prefers-reduced-motion: reduce)').matches;

// One fixed canvas. Each act owns a scene and a camera; the stage renders the
// act (or two, mid-transition) into targets, composites, then photographs them.
export class Stage {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.autoClear = false;
    const T = THREE.UnsignedByteType;
    this.rtA = new THREE.WebGLRenderTarget(2, 2, { samples: 4, type: T });
    this.rtB = new THREE.WebGLRenderTarget(2, 2, { samples: 4, type: T });
    this.rtC = new THREE.WebGLRenderTarget(2, 2, { type: T, depthBuffer: false });
    this.g1 = new THREE.WebGLRenderTarget(2, 2, { type: T, depthBuffer: false });
    this.g2 = new THREE.WebGLRenderTarget(2, 2, { type: T, depthBuffer: false });
    this.post = createPost();
    this.scarf = scarf();
    this.acts = [];
    this.mouse = new THREE.Vector2();
    this.mouseTo = new THREE.Vector2();
    this.time = 0; this.invertUntil = 0; this.flash = 0; this.linesKick = 0; this.pulse = 0;
    addEventListener('pointermove', (e) => this.mouseTo.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight * 2 - 1)), { passive: true });
    addEventListener('resize', () => this.resize());
    this.resize();
  }

  add(act) { this.acts.push(act); act.resize?.(this.w, this.h); return act; }

  resize() {
    this.w = innerWidth; this.h = innerHeight;
    const dpr = this.dpr = Math.min(devicePixelRatio || 1, this.w < 800 ? 1.5 : 1.75);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(this.w, this.h, false);
    const W = Math.round(this.w * dpr), H = Math.round(this.h * dpr);
    for (const r of [this.rtA, this.rtB, this.rtC]) r.setSize(W, H);
    this.gw = Math.max(2, W >> 2); this.gh = Math.max(2, H >> 2);
    this.g1.setSize(this.gw, this.gh); this.g2.setSize(this.gw, this.gh);
    this.post.uniforms.uRes.value.set(W, H);
    for (const a of this.acts) { a.camera.aspect = this.w / this.h; a.camera.updateProjectionMatrix(); a.resize?.(this.w, this.h); }
  }

  // Beats the timeline can call.
  impact(ms = 90) { if (!rm) this.invertUntil = performance.now() + ms; }
  flashWhite(v = 1) { if (!rm) this.flash = v; }
  kickLines(v = 1) { if (!rm) this.linesKick = Math.max(this.linesKick, v); }
  beat(v = 1) { if (!rm) this.pulse = v; }

  pass(scene, target) { this.renderer.setRenderTarget(target); this.renderer.render(scene, this.post.camera); }

  // state: { a, b, mix, type, center, velocity, look, scarf }
  render(state, dt) {
    this.time += dt;
    this.mouse.lerp(this.mouseTo, 1 - Math.exp(-dt * 4));
    const u = this.post.uniforms, R = this.renderer, look = state.look ?? {};
    const ctx = { time: this.time, dt, mouse: this.mouse, velocity: state.velocity };
    const draw = (act, rt) => {
      act.update(ctx);
      R.setRenderTarget(rt); R.setClearColor(act.clear ?? 0x07102b, 1); R.clear();
      R.render(act.scene, act.camera);
    };
    if (state.mix < 0.9999) draw(state.a, this.rtA);
    if (state.mix > 0.0001 && state.b) draw(state.b, this.rtB);
    u.tA.value = this.rtA.texture; u.tB.value = this.rtB.texture;
    u.uMix.value = state.mix; u.uType.value = TRANSITION[state.type] ?? 0;
    u.uTime.value = this.time; u.uVel.value = rm ? 0 : state.velocity;
    const c = state.mix > 0.0001 ? state.center : look.center;
    u.uCenter.value.set(c?.[0] ?? 0.5, c?.[1] ?? 0.5);
    this.post.shard.visible = state.type === 'shatter' && state.mix > 0.0001 && state.mix < 0.9999;
    this.pass(this.post.composite, this.rtC);

    u.tC.value = this.rtC.texture; u.uTexel.value.set(1 / u.uRes.value.x, 1 / u.uRes.value.y);
    u.uThresh.value = look.thresh ?? 0.72;
    this.pass(this.post.bright, this.g1);
    for (const k of [1, 2.6]) {
      u.tC.value = this.g1.texture; u.uDir.value.set(k / this.gw, 0); this.pass(this.post.blur, this.g2);
      u.tC.value = this.g2.texture; u.uDir.value.set(0, k / this.gh); this.pass(this.post.blur, this.g1);
    }
    u.tC.value = this.rtC.texture; u.tGlow.value = this.g1.texture;
    u.uGlow.value = look.glow ?? 0.5;
    u.uInvert.value = performance.now() < this.invertUntil ? 1 : 0;
    this.flash *= Math.exp(-dt * 7); u.uFlash.value = this.flash < 0.01 ? 0 : this.flash;
    this.linesKick *= Math.exp(-dt * 3.2);
    this.pulse *= Math.exp(-dt * 6); u.uPulse.value = this.pulse < 0.01 ? 0 : this.pulse;
    u.uLines.value = rm ? 0 : Math.max(look.lines ?? 0, this.linesKick < 0.02 ? 0 : this.linesKick);
    u.uDuo.value = look.duo ?? 0; u.uCrack.value = look.crack ?? 0; u.uDark.value = look.dark ?? 0;
    u.uLetterbox.value += ((look.letterbox ?? 0) - u.uLetterbox.value) * (1 - Math.exp(-dt * 6));
    this.pass(this.post.final, null);
    if (state.scarf) {
      this.scarf.set(state.scarf[0], state.scarf[1], this.time, this.w / this.h);
      if (this.scarf.visible) R.render(this.scarf.scene, this.scarf.camera);
    }
  }
}
