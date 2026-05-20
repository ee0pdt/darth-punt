/**
 * Audio graph: builds the AudioContext + node chain once, then exposes it as
 * a singleton `audio` reference that every other audio module reads from.
 *
 *   source -> filter -> pump -> dry + reverb + delayWet -> master -> analyser -> out
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
  masterGain.gain.value = state.masterVolume;

  const filterNode = actx.createBiquadFilter();
  filterNode.type = "lowpass";
  filterNode.frequency.value = state.sweepMin;
  filterNode.Q.value = 5;

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
  masterGain.connect(analyser);
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
    analyser,
    analyserData,
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

export function midiToHz(n: number): number {
  return 440 * Math.pow(2, (n - 69) / 12);
}
