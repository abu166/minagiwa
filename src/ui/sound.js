// Everything is synthesised: sea wash, blade swish, taiko hit. Off until asked for.
export function makeSound() {
  let ac, master, wash, on = false;
  const noise = (sec) => { const b = ac.createBuffer(1, ac.sampleRate * sec, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = ac.createBufferSource(); s.buffer = b; return s; };
  const boot = () => {
    ac = new AudioContext(); master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
    const s = noise(4); s.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.11; lg.gain.value = 240; lfo.connect(lg).connect(f.frequency); lfo.start();
    wash = ac.createGain(); wash.gain.value = 0.16; s.connect(f).connect(wash).connect(master); s.start();
  };
  const env = (g, peak, dur) => { const t = ac.currentTime; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); };
  return {
    set(v) { on = v; if (v && !ac) boot(); if (ac) { ac.resume(); master.gain.setTargetAtTime(v ? 0.9 : 0, ac.currentTime, 0.15); } },
    velocity(v) { if (on && wash) wash.gain.setTargetAtTime(0.14 + Math.abs(v) * 0.3, ac.currentTime, 0.1); },
    hit(k = 1) {
      if (!on) return; const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.25); env(g, 0.8 * k, 0.6); o.connect(g).connect(master); o.start(); o.stop(t + 0.7);
      const s = noise(0.12), g2 = ac.createGain(); env(g2, 0.25 * k, 0.1); s.connect(g2).connect(master); s.start();
    },
    swish(k = 1) {
      if (!on) return; const t = ac.currentTime, s = noise(0.5), f = ac.createBiquadFilter(), g = ac.createGain();
      f.type = 'bandpass'; f.Q.value = 2.4; f.frequency.setValueAtTime(700, t); f.frequency.exponentialRampToValueAtTime(5200, t + 0.16); f.frequency.exponentialRampToValueAtTime(1400, t + 0.4);
      env(g, 0.45 * k, 0.42); s.connect(f).connect(g).connect(master); s.start();
    },
    rumble() {
      if (!on) return; const t = ac.currentTime, s = noise(2), f = ac.createBiquadFilter(), g = ac.createGain();
      f.type = 'lowpass'; f.frequency.value = 90; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1.2, t + 0.4); g.gain.linearRampToValueAtTime(0, t + 1.9); s.connect(f).connect(g).connect(master); s.start();
    },
    ping(v) {
      if (!on) return; const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = 260 + v * 900; env(g, 0.06, 0.12); o.connect(g).connect(master); o.start(); o.stop(ac.currentTime + 0.15);
    },
  };
}
