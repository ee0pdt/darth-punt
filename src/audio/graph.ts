/**
 * Audio graph: builds the AudioContext + node chain once, then exposes it as
 * a singleton `audio` reference that every other audio module reads from.
 *
 *   source -> filter -> pump -> dry + reverb + delayWet -> master -> limiter -> clipper -> analyser -> out
 */

import { state } from "../state.ts";
import type { AudioRefs } from "../types.ts";

let audio: AudioRefs | null = null;

export function getAudio(): AudioRefs | null {
  return audio;
}

export function initAudio(): AudioRefs {
  if (audio) return audio;

  const actx = new (globalThis.AudioContext ??
    (globalThis as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

  const masterGain = actx.createGain();
  masterGain.gain.value = 0.4;

  // Master limiter: catches low-frequency peaks when the sweep is at its bottom
  // and bass/kick/resonance pile up. Limiter-style settings (high ratio, low
  // threshold, fast attack) — not a musical compressor.
  const masterLimiter = actx.createDynamicsCompressor();
  masterLimiter.threshold.value = -3;
  masterLimiter.knee.value = 0;
  masterLimiter.ratio.value = 20;
  masterLimiter.attack.value = 0.002;
  masterLimiter.release.value = 0.12;

  // Sample-accurate soft-limiter after the limiter — catches the kick
  // transient that slips through the limiter's 2ms attack. Curve is purely
  // linear below 0.7, smooth tanh roll-off above, so normal program material
  // sees no distortion.
  const masterClipper = actx.createWaveShaper();
  masterClipper.curve = makeSoftLimitCurve(0.85);
  masterClipper.oversample = "4x";

  const filterNode = actx.createBiquadFilter();
  filterNode.type = "lowpass";
  filterNode.frequency.value = state.sweepMin;
  filterNode.Q.value = 2;

  const reverbNode = actx.createConvolver();
  reverbNode.buffer = makeImpulse(actx, 4, 3);
  const reverbGain = actx.createGain();
  reverbGain.gain.value = state.reverbMix;
  const dryGain = actx.createGain();
  dryGain.gain.value = 1 - state.reverbMix * 0.4;

  // Delay (tempo-synced dotted 8th — delayTime is set in togglePlay + onBarStart)
  const delayNode = actx.createDelay(2.0);
  const delayFeedback = actx.createGain();
  delayFeedback.gain.value = 0.4;
  const delayWet = actx.createGain();
  delayWet.gain.value = 0.3;
  delayNode.connect(delayFeedback);
  delayFeedback.connect(delayNode);
  delayNode.connect(delayWet);

  const pumpGain = actx.createGain();
  pumpGain.gain.value = 1;

  const analyser = actx.createAnalyser();
  analyser.fftSize = 512;
  const analyserData = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));

  filterNode.connect(pumpGain);
  pumpGain.connect(dryGain);
  pumpGain.connect(reverbNode);
  pumpGain.connect(delayNode);
  dryGain.connect(masterGain);
  reverbNode.connect(reverbGain);
  reverbGain.connect(masterGain);
  delayWet.connect(masterGain);
  masterGain.connect(masterLimiter);
  masterLimiter.connect(masterClipper);
  masterClipper.connect(analyser);
  analyser.connect(actx.destination);

  audio = {
    actx,
    masterGain,
    masterLimiter,
    masterClipper,
    filterNode,
    reverbNode,
    reverbGain,
    dryGain,
    pumpGain,
    delayNode,
    delayFeedback,
    delayWet,
    analyser,
    analyserData,
  };
  return audio;
}

function makeSoftLimitCurve(threshold: number): Float32Array<ArrayBuffer> {
  // Hard-knee soft limiter: linear pass-through below `threshold`, smooth
  // tanh roll-off above. Transparent for normal program material, only the
  // peaks see any nonlinearity. Output is bounded near ±1.
  const n = 1024;
  const curve = new Float32Array(new ArrayBuffer(n * 4));
  const range = 1 - threshold;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    const abs = Math.abs(x);
    if (abs <= threshold) {
      curve[i] = x;
    } else {
      const excess = abs - threshold;
      const softened = threshold + range * Math.tanh(excess / range);
      curve[i] = Math.sign(x) * softened;
    }
  }
  return curve;
}

function makeImpulse(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const len = rate * duration;
  const buf = ctx.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

export function midiToHz(n: number): number {
  return 440 * Math.pow(2, (n - 69) / 12);
}
