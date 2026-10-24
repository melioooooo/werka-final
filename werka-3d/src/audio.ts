// Tiny WebAudio soundscape, all synthesised: wind bed, birds by day, crickets at night, fire indoors,
// plus pick / step / door / craft chimes. Starts on the first user gesture.
let ctx: AudioContext | null = null;
let master: GainNode, windGain: GainNode, cricketGain: GainNode, fireGain: GainNode;
let muted = false;
try { muted = localStorage.getItem('werka3d_muted') === '1'; } catch { /* storage blocked */ }

const noiseBuffer = (c: AudioContext, sec: number) => {
  const b = c.createBuffer(1, c.sampleRate * sec, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
};

export function startAudio() {
  if (ctx) { ctx.resume(); return; }
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.8;
  master.connect(ctx.destination);
  const noise = noiseBuffer(ctx, 3);

  // Wind: band-passed noise with a slow swell.
  const wind = ctx.createBufferSource();
  wind.buffer = noise; wind.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 0.6;
  windGain = ctx.createGain(); windGain.gain.value = 0.05;
  const lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
  lfo.frequency.value = 0.08; lfoGain.gain.value = 180;
  lfo.connect(lfoGain).connect(bp.frequency);
  wind.connect(bp).connect(windGain).connect(master);
  wind.start(); lfo.start();

  // Crickets: high sine chopped by a fast square LFO.
  const cr = ctx.createOscillator();
  cr.frequency.value = 4300;
  const chop = ctx.createGain(); chop.gain.value = 0;
  const chopLfo = ctx.createOscillator(); chopLfo.type = 'square'; chopLfo.frequency.value = 28;
  const chopDepth = ctx.createGain(); chopDepth.gain.value = 0.5;
  chopLfo.connect(chopDepth).connect(chop.gain);
  cricketGain = ctx.createGain(); cricketGain.gain.value = 0;
  cr.connect(chop).connect(cricketGain).connect(master);
  cr.start(); chopLfo.start();

  // Fire crackle: low-passed noise, only indoors.
  const fire = ctx.createBufferSource();
  fire.buffer = noise; fire.loop = true; fire.playbackRate.value = 0.5;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
  fireGain = ctx.createGain(); fireGain.gain.value = 0;
  fire.connect(lp).connect(fireGain).connect(master);
  fire.start();
}

const tone = (freq: number, at: number, dur: number, vol: number, type: OscillatorType = 'sine', slide = 0) => {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(master);
  o.start(at); o.stop(at + dur + 0.05);
};

let nextBird = 0, cricketPulse = 0;
// Call every frame: day 0..1, indoor flag.
export function ambience(day: number, indoor: boolean, dt: number) {
  if (!ctx) return;
  const t = ctx.currentTime;
  windGain.gain.setTargetAtTime(indoor ? 0.012 : 0.04 + 0.03 * day, t, 0.5);
  fireGain.gain.setTargetAtTime(indoor ? 0.03 : 0, t, 0.4);
  cricketPulse += dt;
  const night = 1 - day;
  const on = !indoor && night > 0.5 && cricketPulse % 1.1 < 0.45;
  cricketGain.gain.setTargetAtTime(on ? 0.012 * night : 0, t, 0.03);
  if (!indoor && day > 0.5 && t > nextBird) {
    nextBird = t + 2.5 + Math.random() * 5;
    const base = 2400 + Math.random() * 1400;
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) tone(base * (1 + (i % 2) * 0.18), t + i * 0.12, 0.09, 0.025, 'sine', 1.25);
  }
}

export const sfx = {
  pick() { if (!ctx) return; const t = ctx.currentTime; [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, t + i * 0.06, 0.35, 0.07, 'triangle')); },
  step() { if (!ctx) return; tone(160 + Math.random() * 60, ctx.currentTime, 0.06, 0.02, 'triangle', 0.6); },
  door() { if (!ctx) return; const t = ctx.currentTime; tone(392, t, 0.6, 0.06, 'sine'); tone(587, t + 0.12, 0.7, 0.05, 'sine'); },
  craft() { if (!ctx) return; const t = ctx.currentTime; [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, t + i * 0.09, 0.8, 0.06, 'triangle')); },
  full() { if (!ctx) return; tone(220, ctx.currentTime, 0.25, 0.05, 'square', 0.8); },
  ui() { if (!ctx) return; tone(880, ctx.currentTime, 0.08, 0.03, 'triangle'); },
  trinket() { if (!ctx) return; const t = ctx.currentTime; [1568, 2093, 2637].forEach((f, i) => tone(f, t + i * 0.05, 0.5, 0.05, 'sine')); tone(3136, t + 0.18, 0.7, 0.025, 'sine'); },
  kiss() { if (!ctx) return; const t = ctx.currentTime; tone(784, t, 0.18, 0.06, 'sine', 1.5); [1175, 1568].forEach((f, i) => tone(f, t + 0.12 + i * 0.08, 0.6, 0.05, 'triangle')); },
  golden() { if (!ctx) return; const t = ctx.currentTime; [523, 659, 784, 1046, 1318, 1568, 2093].forEach((f, i) => tone(f, t + i * 0.08, 1.1, 0.06, 'triangle')); tone(2637, t + 0.6, 1.4, 0.03, 'sine'); },
  blip() { if (!ctx) return; tone(620 + Math.random() * 120, ctx.currentTime, 0.05, 0.02, 'triangle'); },
};

export const isMuted = () => muted;
export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('werka3d_muted', muted ? '1' : '0'); } catch { /* ignore */ }
  if (ctx) master.gain.setTargetAtTime(muted ? 0 : 0.8, ctx.currentTime, 0.05);
  return muted;
}
