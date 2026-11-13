/**
 * Tension build + release. Building starts immediately on the button press;
 * the release is armed for a future bar and fired from `scheduler.onBarStart`
 * so the filter blast and chord land exactly on a downbeat.
 */

import { state } from "../state.ts";
import { getAudio, rampTo } from "./graph.ts";
import { triggerChordBlast } from "./synthesis.ts";
import { setTensionButton, setTensionOverlay, showEvent } from "../ui/events.ts";
import { setTensionCountdown } from "../ui/readouts.ts";

/** Bars of build before the release downbeat. */
const TENSION_BARS = 4;

export function triggerTension(): void {
  const audio = getAudio();
  if (!audio || !state.isPlaying || state.tensionActive) return;
  state.tensionActive = true;
  // Release on the downbeat after TENSION_BARS full bars from the next bar line
  state.tensionReleaseBar = state.barNumber + 1 + TENSION_BARS;
  setTensionButton(true);
  setTensionOverlay(true);
  setTensionCountdown(state.tensionReleaseBar - state.barNumber);
  showEvent("▲ TENSION BUILDING");

  // Close filter, push resonance, swell reverb over 2s
  const now = audio.actx.currentTime;
  rampTo(audio.filterNode.frequency, 150, now, 2);
  rampTo(audio.filterNode.Q, 15, now, 2);
  rampTo(audio.reverbGain.gain, 0.9, now, 2);
}

/**
 * Called from onBarStart with the bar's audio-clock start time. `chordIdx`
 * voices the release chord to match the harmony (random if omitted).
 */
export function releaseTension(t: number, chordIdx?: number): void {
  const audio = getAudio();
  if (!audio) return;
  state.tensionActive = false;
  state.tensionReleaseBar = -1;

  // Blast filter open, restore resonance + reverb, fire a big chord on the downbeat
  rampTo(audio.filterNode.frequency, state.sweepMax, t, 0.3);
  rampTo(audio.filterNode.Q, state.resonance, t, 1);
  rampTo(audio.reverbGain.gain, state.reverbMix, t, 2);
  triggerChordBlast(t, chordIdx);

  // Reset sweep cursor so the next sweep cycle starts near the top
  state.sweepBarCount = state.sweepBars - 2;

  // UI side effects land at audio time
  const delayMs = Math.max(0, (t - audio.actx.currentTime) * 1000);
  setTimeout(() => {
    if (!state.isPlaying) return;
    setTensionButton(false);
    setTensionOverlay(false);
    showEvent("▼ RELEASE");
  }, delayMs);
}

/** Abort a build (e.g. on STOP) and put the filter/reverb back where the user left them. */
export function cancelTension(): void {
  const wasActive = state.tensionActive;
  state.tensionActive = false;
  state.tensionReleaseBar = -1;
  setTensionButton(false);
  setTensionOverlay(false);
  const audio = getAudio();
  if (!audio || !wasActive) return;
  const now = audio.actx.currentTime;
  rampTo(audio.filterNode.Q, state.resonance, now, 0.1);
  rampTo(audio.reverbGain.gain, state.reverbMix, now, 0.1);
}
