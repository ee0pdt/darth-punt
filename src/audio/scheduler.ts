/**
 * Step scheduler: pumps 16th-note events into the audio graph by walking
 * `audioCtx.currentTime` forward inside a 50ms setInterval, with a 100ms
 * look-ahead. Per-bar automation lives in `onBarStart` — never duplicate
 * those mutations elsewhere or the bar-grid evolution will desynchronise.
 */

import { state } from "../state.ts";
import { PAD_CHORDS } from "./rumbles.ts";
import { STEP_COUNT, STICKY, TRACKS } from "../patterns.ts";
import { getAudio } from "./graph.ts";
import {
  triggerArp,
  triggerArpRumble,
  triggerBass,
  triggerChordBlast,
  triggerHihat,
  triggerKick,
  triggerLead,
  triggerPad,
  triggerSnare,
} from "./synthesis.ts";
import { renderGrid, setActiveStep } from "../ui/sequencer.ts";
import {
  setBarReadout,
  setBpmReadout,
  setCutoffReadout,
  setDetuneReadout,
  updateAutoBar,
} from "../ui/readouts.ts";

const LOOK_AHEAD = 0.1;
const SCHEDULE_INTERVAL = 50;

let nextNoteTime = 0;
let schedulerTimer: number | null = null;
let barTracker = 0;

export function isSchedulerRunning(): boolean {
  return schedulerTimer !== null;
}

export function startScheduler(): void {
  const audio = getAudio();
  if (!audio) return;
  state.currentStep = 0;
  barTracker = 0;
  state.sweepBarCount = 0;
  nextNoteTime = audio.actx.currentTime + 0.05;
  audio.delayNode.delayTime.value = (60 / state.bpm) * 0.75;
  schedulerTimer = setInterval(tick, SCHEDULE_INTERVAL);
}

export function stopScheduler(): void {
  if (schedulerTimer !== null) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}

function tick(): void {
  const audio = getAudio();
  if (!audio) return;
  const stepDur = 60 / state.bpm / 4;

  while (nextNoteTime < audio.actx.currentTime + LOOK_AHEAD) {
    if (state.currentStep === 0) {
      // Defer onBarStart to the next macrotask so UI work stays off the audio
      // thread. Snapshot bar number + start time first because state.barNumber
      // will be reused by the next bar before the deferred callback fires.
      const bn = barTracker;
      const bst = nextNoteTime;
      barTracker++;
      setTimeout(() => {
        if (state.isPlaying) onBarStart(bn, bst);
      }, 0);
    }

    TRACKS.forEach((track, ti) => {
      if (state.mutes[ti]) return;
      const val = state.grid[ti][state.currentStep];
      if (!val) return;
      const t = nextNoteTime;
      switch (track.type) {
        case "kick":
          triggerKick(t);
          break;
        case "snare":
          triggerSnare(t);
          break;
        case "hihat":
          triggerHihat(t);
          break;
        case "bass":
          if (track.notes) triggerBass(t, track.notes[state.currentStep]);
          break;
        case "lead":
          if (track.notes) triggerLead(t, track.notes[state.currentStep]);
          break;
        case "arp":
          if (track.notes) triggerArp(t, track.notes[state.currentStep]);
          break;
        case "pad":
          triggerPad(t, state.currentPadChord);
          break;
      }
    });

    // Highlight the current step at audio-time using the same wall-clock offset
    const s = state.currentStep;
    const t = nextNoteTime;
    setTimeout(() => {
      if (!state.isPlaying) return;
      setActiveStep(s);
      renderGrid();
    }, Math.max(0, (t - audio.actx.currentTime) * 1000));

    nextNoteTime += stepDur;
    state.currentStep = (state.currentStep + 1) % STEP_COUNT;
  }
}

export function onBarStart(barNum: number, barStartTime: number): void {
  const audio = getAudio();
  if (!audio) return;
  state.barNumber = barNum;
  setBarReadout(barNum + 1);

  const drama = state.dramaLevel / 10;

  // Filter sweep — exponential ramp from sweepMin to sweepMax across sweepBars
  if (state.sweepEnabled && !state.tensionActive) {
    state.sweepBarCount = (state.sweepBarCount + 1) % state.sweepBars;
    const t = state.sweepBarCount / state.sweepBars;
    const freq = state.sweepMin * Math.pow(state.sweepMax / state.sweepMin, t);
    audio.filterNode.frequency.linearRampToValueAtTime(freq, audio.actx.currentTime + 0.5);
    updateAutoBar("fillFilter", "valFilter", t * 100, Math.round(freq) + "Hz");
    setCutoffReadout(Math.round(freq));
    // Cycle wrap: snap back to the bottom of the sweep on bar 0
    if (state.sweepBarCount === 0) {
      audio.filterNode.frequency.cancelScheduledValues(audio.actx.currentTime + 0.51);
      audio.filterNode.frequency.setValueAtTime(state.sweepMin, audio.actx.currentTime + 0.55);
    }
  }

  // Pump automation — builds with filter, peaks before chord blasts
  if (state.pumpAutoEnabled) {
    const cycle = barNum % 8;
    const pumpNew = Math.min(0.9, state.pumpAmount + (cycle / 8) * drama * 0.3);
    state.pumpTarget = pumpNew;
    updateAutoBar("fillPump", "valPump", (pumpNew / 0.9) * 100, pumpNew.toFixed(2));
  }

  // Reverb swell — peaks at chord blast bars (6-7 of each 8)
  if (state.reverbAutoEnabled && !state.tensionActive) {
    const cycle = barNum % 8;
    const reverbNew = state.reverbMix + (cycle >= 6 ? drama * 0.35 : 0);
    state.reverbTarget = Math.min(0.95, reverbNew);
    audio.reverbGain.gain.linearRampToValueAtTime(
      state.reverbTarget,
      audio.actx.currentTime + 1.5,
    );
    updateAutoBar(
      "fillReverb",
      "valReverb",
      state.reverbTarget * 100,
      state.reverbTarget.toFixed(2),
    );
  }

  // Detune drift — slow sine wave around baseDetune scaled by drama
  if (state.detuneAutoEnabled) {
    const driftCycle = (barNum % 16) / 16;
    const detuneNew = state.baseDetune + Math.sin(driftCycle * Math.PI * 2) * drama * 8;
    state.detuneTarget = Math.max(0, detuneNew);
    state.detune = state.detuneTarget;
    updateAutoBar(
      "fillDetune",
      "valDetune",
      (state.detuneTarget / 35) * 100,
      Math.round(state.detuneTarget),
    );
    setDetuneReadout(Math.round(state.detuneTarget));
  }

  // BPM drift — gentle wobble around baseBpm; updates delay time to match
  if (state.bpmDriftEnabled) {
    const driftCycle = (barNum % 24) / 24;
    const newBpm = state.baseBpm + Math.sin(driftCycle * Math.PI * 2) * state.bpmDriftAmount;
    state.bpm = Math.round(newBpm);
    setBpmReadout(state.bpm);
    audio.delayNode.delayTime.value = (60 / state.bpm) * 0.75;
  }

  // Mutate every 2 bars (skip pad row)
  if (state.mutateEnabled && barNum > 0 && barNum % 2 === 0) mutateGrid();

  // Chord blast at the bar transition every 8 bars
  if (state.chordsEnabled && barNum % 8 === 7) {
    const nextBar = barStartTime + (60 / state.bpm) * 4;
    triggerChordBlast(nextBar);
  }

  // Pad swell every 4 bars (rotating through PAD_CHORDS)
  if (state.padsEnabled && barNum % 4 === 0 && barNum > 0) {
    triggerPad(barStartTime, state.currentPadChord);
    state.currentPadChord = (state.currentPadChord + 1) % PAD_CHORDS.length;
  }

  // Arp rumble lands on beat 4 of every 4th bar
  if (state.arpRumbleEnabled && barNum % 4 === 3) {
    const lastBeat = barStartTime + (60 / state.bpm) * 3;
    triggerArpRumble(lastBeat);
  }
}

function mutateGrid(): void {
  TRACKS.forEach((_track, ti) => {
    if (ti === 6) return; // pad row stays
    const flips = ti < 3 ? (Math.random() < 0.5 ? 2 : 1) : 1;
    for (let f = 0; f < flips; f++) {
      const s = Math.floor(Math.random() * STEP_COUNT);
      if (Math.random() > STICKY[s] * 0.5) state.grid[ti][s] = state.grid[ti][s] ? 0 : 1;
    }
  });
  renderGrid();
}
