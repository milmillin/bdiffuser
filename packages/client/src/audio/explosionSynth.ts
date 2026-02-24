/**
 * Synthesized explosion boom using Web Audio API.
 * Three layered sounds:
 *  - Transient crack (0–50ms): oscillator sweep 150Hz → 60Hz
 *  - Rumble body (0–600ms): low-pass filtered white noise, decaying
 *  - Sub-bass (0–400ms): 40Hz oscillator with fast decay
 */

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

export function playExplosionBoom(): void {
  const ctx = getContext();
  const now = ctx.currentTime;

  // Master gain
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.7, now);
  master.connect(ctx.destination);

  // 1. Transient crack — oscillator sweep 150Hz → 60Hz over 50ms
  const crack = ctx.createOscillator();
  crack.type = "sawtooth";
  crack.frequency.setValueAtTime(150, now);
  crack.frequency.exponentialRampToValueAtTime(60, now + 0.05);

  const crackGain = ctx.createGain();
  crackGain.gain.setValueAtTime(0.8, now);
  crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  crack.connect(crackGain);
  crackGain.connect(master);
  crack.start(now);
  crack.stop(now + 0.08);

  // 2. Rumble body — low-pass filtered white noise, decaying over 600ms
  const bufferSize = ctx.sampleRate;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const lpf = ctx.createBiquadFilter();
  lpf.type = "lowpass";
  lpf.frequency.setValueAtTime(400, now);
  lpf.frequency.exponentialRampToValueAtTime(80, now + 0.6);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.6, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

  noise.connect(lpf);
  lpf.connect(noiseGain);
  noiseGain.connect(master);
  noise.start(now);
  noise.stop(now + 0.6);

  // 3. Sub-bass — 40Hz oscillator with fast decay over 400ms
  const sub = ctx.createOscillator();
  sub.type = "sine";
  sub.frequency.setValueAtTime(40, now);

  const subGain = ctx.createGain();
  subGain.gain.setValueAtTime(0.5, now);
  subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

  sub.connect(subGain);
  subGain.connect(master);
  sub.start(now);
  sub.stop(now + 0.4);
}
