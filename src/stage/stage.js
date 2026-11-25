import * as THREE from 'three';
import { createPost, TRANSITION } from './post.js';

THREE.ColorManagement.enabled = false;

// One fixed canvas. Each act owns a scene and a camera; the stage renders the
// act (or two, mid-transition) into targets and composites them.
export class Stage {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.autoClear = true;
    const opt = { samples: 4, type: THREE.UnsignedByteType };
    this.rtA = new THREE.WebGLRenderTarget(2, 2, opt);
    this.rtB = new THREE.WebGLRenderTarget(2, 2, opt);
    this.post = createPost();
    this.acts = [];
    this.mouse = new THREE.Vector2();
    this.mouseTo = new THREE.Vector2();
    this.time = 0;
    this.invertUntil = 0;
    this.flash = 0;
    this.lines = 0;
    this.linesKick = 0;
    addEventListener('pointermove', (e) => this.mouseTo.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight * 2 - 1)), { passive: true });
    addEventListener('resize', () => this.resize());
    this.resize();
  }

  add(act) { this.acts.push(act); act.resize?.(this.w, this.h); return act; }

  resize() {
    this.w = innerWidth; this.h = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, this.w < 800 ? 1.5 : 1.75);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(this.w, this.h, false);
    const W = Math.round(this.w * dpr), H = Math.round(this.h * dpr);
    this.rtA.setSize(W, H); this.rtB.setSize(W, H);
    this.post.uniforms.uRes.value.set(W, H);
    for (const a of this.acts) { a.camera.aspect = this.w / this.h; a.camera.updateProjectionMatrix(); a.resize?.(this.w, this.h); }
  }

  // Beats the timeline can call.
  impact(ms = 90) { this.invertUntil = performance.now() + ms; }
  flashWhite(v = 1) { this.flash = v; }
  kickLines(v = 1) { this.linesKick = Math.max(this.linesKick, v); }

  // state: { a, b, mix, type, center, velocity, letterbox, lines }
  render(state, dt) {
    this.time += dt;
    this.mouse.lerp(this.mouseTo, 1 - Math.exp(-dt * 4));
    const u = this.post.uniforms;
    const ctx = { time: this.time, dt, mouse: this.mouse, velocity: state.velocity };
    const draw = (act, rt) => {
      act.update(ctx);
      this.renderer.setRenderTarget(rt);
      this.renderer.setClearColor(act.clear ?? 0x07102b, 1);
      this.renderer.clear();
      this.renderer.render(act.scene, act.camera);
    };
    if (state.mix < 0.9999) draw(state.a, this.rtA);
    if (state.mix > 0.0001 && state.b) draw(state.b, this.rtB);
    u.tA.value = this.rtA.texture; u.tB.value = this.rtB.texture;
    u.uMix.value = state.mix; u.uType.value = TRANSITION[state.type] ?? 0;
    u.uTime.value = this.time; u.uVel.value = state.velocity;
    u.uCenter.value.set(state.center?.[0] ?? 0.5, state.center?.[1] ?? 0.5);
    u.uInvert.value = performance.now() < this.invertUntil ? 1 : 0;
    this.flash *= Math.exp(-dt * 7); u.uFlash.value = this.flash < 0.01 ? 0 : this.flash;
    this.linesKick *= Math.exp(-dt * 3.2);
    u.uLines.value = Math.max(state.lines ?? 0, this.linesKick < 0.02 ? 0 : this.linesKick);
    u.uLetterbox.value += ((state.letterbox ?? 0) - u.uLetterbox.value) * (1 - Math.exp(-dt * 6));
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.post.scene, this.post.camera);
  }
}
