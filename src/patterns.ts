import type { PatternName, Track } from "./types.ts";

export const STEP_COUNT = 16;

export const TRACKS: readonly Track[] = [
  { label: "KICK", color: "orange", type: "kick" },
  { label: "SNARE", color: "cyan", type: "snare" },
  { label: "HH", color: "cyan", type: "hihat" },
  {
    label: "BASS",
    color: "orange",
    type: "bass",
    notes: [36, 36, 43, 36, 36, 43, 36, 48, 36, 36, 43, 36, 36, 43, 48, 43],
  },
  {
    label: "LEAD",
    color: "cyan",
    type: "lead",
    notes: [60, 63, 65, 67, 65, 63, 60, 58, 60, 63, 65, 67, 72, 70, 67, 65],
  },
  {
    label: "ARP",
    color: "cyan",
    type: "arp",
    notes: [72, 75, 77, 79, 77, 75, 72, 70, 72, 75, 79, 82, 79, 75, 72, 70],
  },
  {
    label: "PAD",
    color: "purple",
    type: "pad",
    notes: [48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48],
  },
] as const;

export const PATTERNS: Record<Exclude<PatternName, "random">, Record<string, number[]>> = {
  tron: {
    KICK: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    SNARE: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    HH: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
    BASS: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0],
    LEAD: [1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
    ARP: [1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 0, 1],
    PAD: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  },
  daft: {
    KICK: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0],
    SNARE: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    HH: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    BASS: [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0],
    LEAD: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0],
    ARP: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0],
    PAD: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  derezzed: {
    KICK: [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0],
    SNARE: [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0],
    HH: [1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1],
    BASS: [1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 0],
    LEAD: [1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    ARP: [1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 0, 0],
    PAD: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  },
};

// Per-step weight used by `mutateGrid`. Beats with higher sticky values are
// less likely to flip, so the kick on 1/5/9/13 and snare on 5/13 stay stable
// while off-beats churn freely.
export const STICKY: readonly number[] = [
  0.85,
  0.35,
  0.45,
  0.35,
  0.75,
  0.35,
  0.45,
  0.35,
  0.75,
  0.35,
  0.45,
  0.35,
  0.75,
  0.35,
  0.45,
  0.45,
];
