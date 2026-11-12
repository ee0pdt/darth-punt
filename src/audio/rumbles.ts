// Music data: harmony (scale + progression), chord stabs, arp rumble patterns.

/** C natural minor, as pitch classes. Every note in TRACKS and ARP_RUMBLES sits in it. */
export const SCALE: readonly number[] = [0, 2, 3, 5, 7, 8, 10];

/** Bars each chord of the progression lasts. */
export const BARS_PER_CHORD = 4;

export interface ProgressionChord {
  /** Display name for the event log. */
  name: string;
  /**
   * Diatonic shift (in scale steps) applied to bass/lead/arp lines written
   * over Cm. Moving along the scale rather than by semitones keeps every
   * note in key, so the Bb and Eb sections pick up their own major colour.
   * Chosen to keep the bass in a sensible register.
   */
  shift: number;
  /** Wide pad voicing: root, fifth, third (an octave up), fifth. */
  pad: readonly number[];
  /** Index into CHORDS for a chord blast landing on this chord. */
  blast: number;
}

export const PROGRESSION: readonly ProgressionChord[] = [
  { name: "Cm", shift: 0, pad: [36, 43, 51, 55], blast: 0 },
  { name: "B♭", shift: -1, pad: [34, 41, 50, 53], blast: 1 },
  { name: "Gm", shift: -3, pad: [31, 38, 46, 50], blast: 2 },
  { name: "E♭", shift: 2, pad: [39, 46, 55, 58], blast: 3 },
];

/** Which progression chord a bar belongs to. Pure, so audio-time callers agree. */
export function chordForBar(bar: number): number {
  return Math.floor(Math.max(0, bar) / BARS_PER_CHORD) % PROGRESSION.length;
}

/** Move a MIDI note `steps` scale degrees up/down within SCALE. */
export function shiftInScale(note: number, steps: number): number {
  if (steps === 0) return note;
  const idx = SCALE.indexOf(((note % 12) + 12) % 12);
  if (idx < 0) return note; // chromatic note: leave it alone
  const total = idx + steps;
  const octaves = Math.floor(total / SCALE.length);
  const degree = ((total % SCALE.length) + SCALE.length) % SCALE.length;
  return (Math.floor(note / 12) + octaves) * 12 + SCALE[degree];
}

export const CHORDS: readonly (readonly number[])[] = [
  [48, 51, 55, 58, 63], // Cm9
  [46, 50, 53, 57, 62], // Bbmaj9
  [43, 46, 50, 53, 58], // Gm9
  [51, 55, 58, 62, 67], // Ebmaj9
  [48, 51, 55, 60, 67], // Cm/G
  [43, 48, 51, 55, 60], // G7sus/C
];

export const ARP_RUMBLES: readonly (readonly number[])[] = [
  [0, 3, 7, 0, 3, 7, 10, 7],
  [0, 5, 7, 10, 7, 5, 3, 0],
  [0, 3, 5, 7, 5, 3, 0, 3],
  [0, 7, 3, 10, 0, 7, 3, 5],
];
