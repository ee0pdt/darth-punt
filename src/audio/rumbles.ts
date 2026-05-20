// Music data: chord stabs, pad voicings, arp rumble patterns.

export const CHORDS: readonly (readonly number[])[] = [
  [48, 51, 55, 58, 63], // Cm9
  [46, 50, 53, 57, 62], // Bbmaj9
  [43, 46, 50, 53, 58], // Gm9
  [51, 55, 58, 62, 67], // Ebmaj9
  [48, 51, 55, 60, 67], // Cm/G
  [43, 48, 51, 55, 60], // G7sus/C
];

export const PAD_CHORDS: readonly (readonly number[])[] = [
  [36, 43, 48, 55], // Cm wide
  [34, 41, 46, 53], // Bbm wide
  [31, 38, 43, 50], // Gm wide
  [39, 46, 51, 58], // Ebmaj wide
];

export const ARP_RUMBLES: readonly (readonly number[])[] = [
  [0, 3, 7, 0, 3, 7, 10, 7],
  [0, 5, 7, 10, 7, 5, 3, 0],
  [0, 3, 5, 7, 5, 3, 0, 3],
  [0, 7, 3, 10, 0, 7, 3, 5],
];
