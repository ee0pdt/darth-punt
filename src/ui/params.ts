/**
 * Declarative description of every user-facing sound control, grouped by what
 * it affects. Each parameter sits next to the automation that moves it, so the
 * panel reads "Reverb [SWELL]" instead of splitting the slider and its
 * automation switch across two tabs. `panels.ts` renders this list.
 */

import { state } from "../state.ts";
import { getAudio, rampTo } from "../audio/graph.ts";
import { setBpmReadout, setLive } from "./readouts.ts";

/** Boolean keys on `state` that a switch can drive. */
export type FlagKey =
  | "mutateEnabled"
  | "sweepEnabled"
  | "pumpAutoEnabled"
  | "detuneAutoEnabled"
  | "reverbAutoEnabled"
  | "chordsEnabled"
  | "padsEnabled"
  | "arpRumbleEnabled"
  | "bpmDriftEnabled"
  | "followChords";

export interface FlagDef {
  key: FlagKey;
  /** Short pill text shown beside a slider, or the switch label when standalone. */
  label: string;
  hint?: string;
  /** Side effect when flipped, beyond writing `state[key]`. */
  onChange?(on: boolean): void;
}

export interface ParamDef {
  kind: "param";
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  scale?: "linear" | "log";
  get(): number;
  set(v: number): void;
  format(v: number): string;
  hint?: string;
  /** Automation (or on/off) switch paired with this parameter. */
  flag?: FlagDef;
}

export interface SwitchDef {
  kind: "switch";
  flag: FlagDef;
}

export interface Section {
  id: string;
  title: string;
  items: (ParamDef | SwitchDef)[];
}

const hz = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `${v}`);

function applyReverb(v: number): void {
  const audio = getAudio();
  if (!audio) return;
  const now = audio.actx.currentTime;
  rampTo(audio.reverbGain.gain, v, now, 0.05);
  rampTo(audio.dryGain.gain, 1 - v * 0.4, now, 0.05);
}

export const SECTIONS: Section[] = [
  {
    id: "master",
    title: "Master",
    items: [
      {
        kind: "param",
        id: "masterVol",
        label: "Volume",
        min: 0,
        max: 1,
        step: 0.01,
        get: () => state.masterVolume,
        set: (v) => {
          state.masterVolume = v;
          const audio = getAudio();
          if (audio) rampTo(audio.masterGain.gain, v, audio.actx.currentTime, 0.03);
        },
        format: (v) => `${Math.round(v * 100)}%`,
      },
      {
        kind: "param",
        id: "drama",
        label: "Drama",
        min: 1,
        max: 10,
        step: 1,
        get: () => state.dramaLevel,
        set: (v) => {
          state.dramaLevel = v;
        },
        format: (v) => String(v),
        hint: "How hard the automation pushes",
      },
    ],
  },
  {
    id: "tempo",
    title: "Tempo",
    items: [
      {
        kind: "param",
        id: "bpm",
        label: "BPM",
        min: 60,
        max: 180,
        step: 1,
        get: () => state.baseBpm,
        set: (v) => {
          state.baseBpm = v;
          state.bpm = v;
          setBpmReadout(v);
        },
        format: (v) => String(v),
      },
      {
        kind: "param",
        id: "drift",
        label: "Drift",
        min: 0,
        max: 8,
        step: 0.5,
        get: () => state.bpmDriftAmount,
        set: (v) => {
          state.bpmDriftAmount = v;
        },
        format: (v) => `±${v}`,
        hint: "Slow tempo wobble",
        flag: {
          key: "bpmDriftEnabled",
          label: "Auto",
          onChange: (on) => {
            if (!on) {
              state.bpm = state.baseBpm;
              setBpmReadout(state.bpm);
              setLive("bpm", null);
            }
          },
        },
      },
    ],
  },
  {
    id: "filter",
    title: "Filter",
    items: [
      {
        kind: "param",
        id: "cutoff",
        label: "Cutoff",
        min: 100,
        max: 12000,
        step: 1,
        scale: "log",
        get: () => state.manualCutoff,
        set: (v) => {
          state.manualCutoff = v;
          const audio = getAudio();
          if (audio && !state.sweepEnabled && !state.tensionActive) {
            rampTo(audio.filterNode.frequency, v, audio.actx.currentTime, 0.03);
          }
        },
        format: (v) => `${hz(Math.round(v))} Hz`,
        hint: "Drag to take over from the sweep",
        flag: {
          key: "sweepEnabled",
          label: "Sweep",
          onChange: (on) => {
            const audio = getAudio();
            if (!on && audio && !state.tensionActive) {
              rampTo(audio.filterNode.frequency, state.manualCutoff, audio.actx.currentTime, 0.3);
            }
          },
        },
      },
      {
        kind: "param",
        id: "resonance",
        label: "Resonance",
        min: 0.5,
        max: 18,
        step: 0.1,
        get: () => state.resonance,
        set: (v) => {
          state.resonance = v;
          const audio = getAudio();
          if (audio && !state.tensionActive) {
            rampTo(audio.filterNode.Q, v, audio.actx.currentTime, 0.03);
          }
        },
        format: (v) => v.toFixed(1),
      },
    ],
  },
  {
    id: "tone",
    title: "Tone",
    items: [
      {
        kind: "param",
        id: "pump",
        label: "Pump",
        min: 0,
        max: 0.9,
        step: 0.01,
        get: () => state.pumpAmount,
        set: (v) => {
          state.pumpAmount = v;
        },
        format: (v) => `${Math.round((v / 0.9) * 100)}%`,
        hint: "Sidechain duck on the kick",
        flag: { key: "pumpAutoEnabled", label: "Auto" },
      },
      {
        kind: "param",
        id: "reverb",
        label: "Reverb",
        min: 0,
        max: 1,
        step: 0.01,
        get: () => state.reverbMix,
        set: (v) => {
          state.reverbMix = v;
          if (!state.tensionActive) applyReverb(v);
        },
        format: (v) => `${Math.round(v * 100)}%`,
        flag: {
          key: "reverbAutoEnabled",
          label: "Swell",
          onChange: (on) => {
            if (!on && !state.tensionActive) applyReverb(state.reverbMix);
          },
        },
      },
      {
        kind: "param",
        id: "detune",
        label: "Detune",
        min: 0,
        max: 35,
        step: 1,
        get: () => state.baseDetune,
        set: (v) => {
          state.baseDetune = v;
          state.detune = v;
        },
        format: (v) => `${Math.round(v)}¢`,
        flag: {
          key: "detuneAutoEnabled",
          label: "Drift",
          onChange: (on) => {
            if (!on) state.detune = state.baseDetune;
          },
        },
      },
    ],
  },
  {
    id: "harmony",
    title: "Harmony",
    items: [
      {
        kind: "switch",
        flag: {
          key: "followChords",
          label: "Follow chords",
          hint: "Bass, lead and arp move with the progression",
        },
      },
      {
        kind: "param",
        id: "chordVol",
        label: "Chord blasts",
        min: 0,
        max: 0.8,
        step: 0.01,
        get: () => state.chordVol,
        set: (v) => {
          state.chordVol = v;
        },
        format: (v) => `${Math.round((v / 0.8) * 100)}%`,
        flag: { key: "chordsEnabled", label: "On" },
      },
      {
        kind: "param",
        id: "chordSus",
        label: "Blast sustain",
        min: 0.5,
        max: 6,
        step: 0.1,
        get: () => state.chordSustain,
        set: (v) => {
          state.chordSustain = v;
        },
        format: (v) => `${v.toFixed(1)}s`,
      },
      {
        kind: "param",
        id: "padVol",
        label: "Pads",
        min: 0,
        max: 0.5,
        step: 0.01,
        get: () => state.padVol,
        set: (v) => {
          state.padVol = v;
        },
        format: (v) => `${Math.round((v / 0.5) * 100)}%`,
        flag: { key: "padsEnabled", label: "On" },
      },
      {
        kind: "switch",
        flag: {
          key: "arpRumbleEnabled",
          label: "Arp rumble",
          hint: "Fill on the last beat of every 4th bar",
        },
      },
    ],
  },
];

/** Grid-level flag rendered in the sequencer toolbar rather than a panel. */
export const MUTATE_FLAG: FlagDef = {
  key: "mutateEnabled",
  label: "Evolve",
  hint: "Mutate the grid every two bars",
};
