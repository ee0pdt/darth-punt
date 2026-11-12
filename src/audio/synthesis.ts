/**
 * Per-voice synthesis. Each `trigger*` function reads from `state` and
 * connects fresh oscillators / noise buffers to `audio.filterNode` (the head
 * of the post-FX chain in graph.ts). The functions never schedule via
 * setTimeout — all timing uses absolute AudioContext timestamps.
 */

import { state } from "../state.ts";
import { flashChord, showEvent } from "../ui/events.ts";
import { getAudio, midiToHz } from "./graph.ts";
import { ARP_RUMBLES, CHORDS, PAD_CHORDS } from "./rumbles.ts";

export function triggerKick(t: number): void {
  const audio = getAudio();
  if (!audio) return;
  const { actx, filterNode, pumpGain } = audio;
  const osc = actx.createOscillator();
  const g = actx.createGain();
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.09);
  g.gain.setValueAtTime(1.4, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
  osc.connect(g);
  g.connect(filterNode);
  osc.start(t);
  osc.stop(t + 0.42);

  // Side-chain pump: dip the mix at the kick, recover over ~220ms.
  // With PUMP automation on, the per-bar target from onBarStart drives depth.
  const pump = state.pumpAutoEnabled ? state.pumpTarget : state.pumpAmount;
  if (pump > 0) schedulePump(pumpGain.gain, t, 1 - pump * 0.8);
}

const PUMP_ATTACK = 0.006;
const PUMP_RECOVER = 0.22;
let lastPump: { t0: number; v0: number; dip: number } | null = null;

/** Value the pump envelope will have at time t, given the last dip scheduled. */
function pumpValueAt(t: number): number {
  if (!lastPump) return 1;
  const { t0, v0, dip } = lastPump;
  const dt = t - t0;
  if (dt < 0) return 1;
  if (dt < PUMP_ATTACK) return v0 + (dip - v0) * (dt / PUMP_ATTACK);
  if (dt < PUMP_ATTACK + PUMP_RECOVER) return dip + (1 - dip) * ((dt - PUMP_ATTACK) / PUMP_RECOVER);
  return 1;
}

// Kicks are scheduled ahead of time, so the gain's live `.value` is no guide
// to where the envelope will be at `t`. Track the envelope analytically and
// start each dip from that value: a short ramp down instead of an instant
// step, which clicked on everything sustaining underneath the kick.
function schedulePump(gain: AudioParam, t: number, dip: number): void {
  const v0 = pumpValueAt(t);
  gain.cancelScheduledValues(t);
  gain.setValueAtTime(v0, t);
  gain.linearRampToValueAtTime(dip, t + PUMP_ATTACK);
  gain.linearRampToValueAtTime(1, t + PUMP_ATTACK + PUMP_RECOVER);
  lastPump = { t0: t, v0, dip };
}

// Start each drum hit at a random point in the shared noise buffer so
// consecutive hits don't sound identical.
function randomNoiseOffset(len: number): number {
  const total = getAudio()?.noiseBuffer.duration ?? 1;
  return Math.random() * Math.max(0, total - len);
}

export function triggerSnare(t: number): void {
  const audio = getAudio();
  if (!audio) return;
  const { actx, filterNode, noiseBuffer } = audio;
  const n = actx.createBufferSource();
  n.buffer = noiseBuffer;
  const hp = actx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 1500;
  const g = actx.createGain();
  g.gain.setValueAtTime(0.6, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  n.connect(hp);
  hp.connect(g);
  g.connect(filterNode);
  n.start(t, randomNoiseOffset(0.25));
  n.stop(t + 0.25);
}

export function triggerHihat(t: number): void {
  const audio = getAudio();
  if (!audio) return;
  const { actx, filterNode, noiseBuffer } = audio;
  const n = actx.createBufferSource();
  n.buffer = noiseBuffer;
  const hp = actx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 7000;
  const g = actx.createGain();
  g.gain.setValueAtTime(0.22, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  n.connect(hp);
  hp.connect(g);
  g.connect(filterNode);
  n.start(t, randomNoiseOffset(0.09));
  n.stop(t + 0.09);
}

export function triggerBass(t: number, note: number): void {
  const audio = getAudio();
  if (!audio) return;
  const { actx, filterNode } = audio;
  const hz = midiToHz(note);
  const o1 = actx.createOscillator();
  const o2 = actx.createOscillator();
  o1.type = "sawtooth";
  o2.type = "sawtooth";
  o1.frequency.value = hz;
  o2.frequency.value = hz;
  o2.detune.value = state.detune;
  const f = actx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 500;
  f.Q.value = 3;
  const g = actx.createGain();
  g.gain.setValueAtTime(0.6, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  o1.connect(f);
  o2.connect(f);
  f.connect(g);
  g.connect(filterNode);
  o1.start(t);
  o2.start(t);
  o1.stop(t + 0.34);
  o2.stop(t + 0.34);
}

export function triggerLead(t: number, note: number, vol = 0.28, dur = 0.22): void {
  const audio = getAudio();
  if (!audio) return;
  const { actx, filterNode } = audio;
  const hz = midiToHz(note);
  const o1 = actx.createOscillator();
  const o2 = actx.createOscillator();
  o1.type = "sawtooth";
  o2.type = "square";
  o1.frequency.value = hz;
  o2.frequency.value = hz;
  o2.detune.value = state.detune * 1.5;
  const g = actx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o1.connect(g);
  o2.connect(g);
  g.connect(filterNode);
  o1.start(t);
  o2.start(t);
  o1.stop(t + dur + 0.05);
  o2.stop(t + dur + 0.05);
}

export function triggerArp(t: number, note: number, vol = 0.15): void {
  const audio = getAudio();
  if (!audio) return;
  const { actx, filterNode } = audio;
  const hz = midiToHz(note);
  const osc = actx.createOscillator();
  osc.type = "square";
  osc.frequency.value = hz;
  osc.detune.value = -state.detune;
  const g = actx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(g);
  g.connect(filterNode);
  osc.start(t);
  osc.stop(t + 0.12);
}

export function triggerChordBlast(t: number): void {
  const audio = getAudio();
  if (!audio) return;
  const { actx, filterNode } = audio;
  const chord = CHORDS[Math.floor(Math.random() * CHORDS.length)];
  const attackTime = 0.04;
  chord.forEach((note) => {
    const hz = midiToHz(note);
    // Three detuned oscillators per note for thickness
    [-state.detune, 0, state.detune].forEach((dt, i) => {
      const osc = actx.createOscillator();
      osc.type = i === 1 ? "sawtooth" : "square";
      osc.frequency.value = hz;
      osc.detune.value = dt * 2;
      const g = actx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(state.chordVol / chord.length / 3, t + attackTime);
      g.gain.setValueAtTime(state.chordVol / chord.length / 3, t + state.chordSustain * 0.6);
      g.gain.exponentialRampToValueAtTime(0.001, t + state.chordSustain);
      osc.connect(g);
      g.connect(filterNode);
      osc.start(t);
      osc.stop(t + state.chordSustain + 0.1);
    });
  });
  // UI side effects — flash + event log — scheduled in wall-clock to land at audio time
  const delayMs = Math.max(0, (t - actx.currentTime) * 1000);
  setTimeout(() => flashChord(), delayMs);
  showEvent("⚡ CHORD BLAST");
}

// The pad currently sounding. A new pad chokes it, so grid PAD steps and
// 4-bar swells never stack up into dozens of overlapping 6s voices.
let activePad: { bus: GainNode; oscs: OscillatorNode[] } | null = null;

export function triggerPad(t: number, chordIdx: number, announce = false): void {
  if (!state.padsEnabled) return;
  const audio = getAudio();
  if (!audio) return;
  const { actx, filterNode } = audio;
  const notes = PAD_CHORDS[chordIdx % PAD_CHORDS.length];

  if (activePad) {
    const prev = activePad;
    prev.bus.gain.cancelScheduledValues(t);
    prev.bus.gain.setTargetAtTime(0, t, 0.15);
    for (const o of prev.oscs) {
      try {
        o.stop(t + 1);
      } catch {
        // already stopped
      }
    }
  }
  const bus = actx.createGain();
  bus.connect(filterNode);
  const oscs: OscillatorNode[] = [];
  activePad = { bus, oscs };

  notes.forEach((note) => {
    const hz = midiToHz(note);
    const o1 = actx.createOscillator();
    const o2 = actx.createOscillator();
    o1.type = "sine";
    o2.type = "triangle";
    o1.frequency.value = hz;
    o2.frequency.value = hz;
    o1.detune.value = -state.detune * 0.5;
    o2.detune.value = state.detune * 0.5;
    const g = actx.createGain();
    // Very slow attack -> hold -> long release
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(state.padVol / notes.length, t + 1.2);
    g.gain.setValueAtTime(state.padVol / notes.length, t + 3.0);
    g.gain.exponentialRampToValueAtTime(0.001, t + 6.0);
    o1.connect(g);
    o2.connect(g);
    g.connect(bus);
    o1.start(t);
    o2.start(t);
    o1.stop(t + 6.5);
    o2.stop(t + 6.5);
    oscs.push(o1, o2);
  });
  if (announce) showEvent("◈ PAD SWELL");
}

export function triggerArpRumble(t: number): void {
  const pattern = ARP_RUMBLES[state.currentRumble % ARP_RUMBLES.length];
  state.currentRumble++;
  const stepDur = (60 / state.bpm) / 2;
  pattern.forEach((semi, i) => triggerArp(t + i * stepDur, 36 + semi, 0.18));
  showEvent("▸ ARP RUMBLE");
}
