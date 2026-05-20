/**
 * Single mutable app-state object. UI writes; audio reads. Kept deliberately
 * flat so the modules that read it can do so without ceremony.
 */

import { STEP_COUNT, TRACKS } from "./patterns.ts";

export interface AppState {
  // Transport
  isPlaying: boolean;
  currentStep: number;
  barNumber: number;
  activeStep: number;

  // Tempo
  bpm: number;
  baseBpm: number;
  bpmDriftAmount: number;

  // Synth params
  detune: number;
  baseDetune: number;
  reverbMix: number;
  pumpAmount: number;
  chordVol: number;
  chordSustain: number;
  padVol: number;
  dramaLevel: number;

  // Filter sweep
  sweepBarCount: number;
  sweepBars: number;
  sweepMin: number;
  sweepMax: number;
  manualCutoff: number;

  // Automation targets
  pumpTarget: number;
  reverbTarget: number;
  detuneTarget: number;

  // Music cursors
  currentRumble: number;
  currentPadChord: number;

  // Tension
  tensionActive: boolean;

  // Evolution flags
  mutateEnabled: boolean;
  sweepEnabled: boolean;
  pumpAutoEnabled: boolean;
  detuneAutoEnabled: boolean;
  reverbAutoEnabled: boolean;
  chordsEnabled: boolean;
  padsEnabled: boolean;
  arpRumbleEnabled: boolean;
  bpmDriftEnabled: boolean;

  // Grid + mutes
  grid: number[][];
  mutes: boolean[];
}

export const state: AppState = {
  isPlaying: false,
  currentStep: 0,
  barNumber: 0,
  activeStep: -1,

  bpm: 120,
  baseBpm: 120,
  bpmDriftAmount: 2,

  detune: 8,
  baseDetune: 8,
  reverbMix: 0.45,
  pumpAmount: 0.65,
  chordVol: 0.3,
  chordSustain: 3.0,
  padVol: 0.18,
  dramaLevel: 5,

  sweepBarCount: 0,
  sweepBars: 32,
  sweepMin: 200,
  sweepMax: 10000,
  manualCutoff: 300,

  pumpTarget: 0.65,
  reverbTarget: 0.45,
  detuneTarget: 8,

  currentRumble: 0,
  currentPadChord: 0,

  tensionActive: false,

  mutateEnabled: true,
  sweepEnabled: true,
  pumpAutoEnabled: true,
  detuneAutoEnabled: true,
  reverbAutoEnabled: true,
  chordsEnabled: true,
  padsEnabled: true,
  arpRumbleEnabled: true,
  bpmDriftEnabled: true,

  grid: Array.from({ length: TRACKS.length }, () => Array(STEP_COUNT).fill(0)),
  mutes: Array(TRACKS.length).fill(false),
};
