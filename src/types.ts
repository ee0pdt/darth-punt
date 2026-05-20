export type TrackColor = "cyan" | "orange" | "purple";

export type TrackType =
  | "kick"
  | "snare"
  | "hihat"
  | "bass"
  | "lead"
  | "arp"
  | "pad";

export interface Track {
  label: string;
  color: TrackColor;
  type: TrackType;
  notes?: readonly number[];
}

export type PatternName = "tron" | "daft" | "derezzed" | "random";

export type StepGrid = number[][];

export interface AudioRefs {
  actx: AudioContext;
  masterGain: GainNode;
  filterNode: BiquadFilterNode;
  reverbNode: ConvolverNode;
  reverbGain: GainNode;
  dryGain: GainNode;
  pumpGain: GainNode;
  delayNode: DelayNode;
  delayFeedback: GainNode;
  delayWet: GainNode;
  analyser: AnalyserNode;
  analyserData: Uint8Array<ArrayBuffer>;
}
