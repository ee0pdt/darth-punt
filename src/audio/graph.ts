/**
 * Audio graph: builds the AudioContext + node chain once, then exposes it as
 * a singleton `audio` reference that every other audio module reads from.
 *
 *   source -> filter -> pump -> dry + reverb + delayWet -> headroom -> master -> limiter -> analyser -> out
 */

import { state } from "../state.ts";
import type { AudioRefs } from "../types.ts";

let audio: AudioRefs | null = null;

// Fixed trim on the summed mix. Voices are balanced against each other at
// fairly hot levels (kick alone peaks at 1.4), so without this the mix runs
// several dB over full scale and the limiter is crushing it constantly.
const HEADROOM = 0.5;

export function getAudio(): AudioRefs | null {
  return audio;
}

export function initAudio(): AudioRefs {
  if (audio) return audio;

  const actx = new (globalThis.AudioContext ??
    (globalThis as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

  const masterGain = actx.createGain();
  masterGain.gain.value = state.masterVolume;

  const filterNode = actx.createBiquadFilter();
  filterNode.type = "lowpass";
  filterNode.frequency.value = state.sweepMin;
  filterNode.Q.value = state.resonance;

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

  // Brick-wall-ish safety limiter so chord blasts + kick + pads can't clip the output
  const limiter = actx.createDynamicsCompressor();
  limiter.threshold.value = -3;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.2;

  const analyser = actx.createAnalyser();
  analyser.fftSize = 512;
  const analyserData = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));

  filterNode.connect(pumpGain);
  pumpGain.connect(dryGain);
  pumpGain.connect(reverbNode);
  pumpGain.connect(delayNode);
  const headroom = actx.createGain();
  headroom.gain.value = HEADROOM;
  dryGain.connect(headroom);
  reverbNode.connect(reverbGain);
  reverbGain.connect(headroom);
  delayWet.connect(headroom);
  headroom.connect(masterGain);
  masterGain.connect(limiter);
  limiter.connect(analyser);
  analyser.connect(actx.destination);

  audio = {
    actx,
    masterGain,
    filterNode,
    reverbNode,
    reverbGain,
    dryGain,
    pumpGain,
    delayNode,
    delayFeedback,
    delayWet,
    limiter,
    analyser,
    analyserData,
    noiseBuffer: makeNoise(actx, 1),
  };
  return audio;
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

// One shared second of white noise; drum voices play random slices of it
// instead of filling a fresh buffer on the main thread for every hit.
function makeNoise(ctx: AudioContext, duration: number): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

/**
 * Ramp an AudioParam from its *current* value. A bare linearRampToValueAtTime
 * starts from the previous scheduled event, which may be bars in the past,
 * so the value would jump instead of glide. Anchoring at `from` fixes that.
 */
export function rampTo(param: AudioParam, value: number, from: number, dur: number): void {
  param.cancelScheduledValues(from);
  param.setValueAtTime(param.value, from);
  param.linearRampToValueAtTime(value, from + dur);
}

export function midiToHz(n: number): number {
  return 440 * Math.pow(2, (n - 69) / 12);
}
