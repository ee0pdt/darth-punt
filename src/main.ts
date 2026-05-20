/**
 * Entry point. Mounts the sequencer, controls, and visualiser on DOM ready,
 * loads the default TRON pattern, and exposes togglePlay / triggerTension as
 * the only user-driven side effects. All audio nodes are built lazily on
 * first play to satisfy autoplay policies.
 */

import { state } from "./state.ts";
import { getAudio, initAudio } from "./audio/graph.ts";
import { isSchedulerRunning, startScheduler, stopScheduler } from "./audio/scheduler.ts";
import { triggerChordBlast } from "./audio/synthesis.ts";
import { mountSequencer, renderGrid } from "./ui/sequencer.ts";
import { loadPattern, mountControls } from "./ui/controls.ts";
import { setTensionButton, setTensionOverlay, showEvent } from "./ui/events.ts";
import { mountVisualiser, startVisualiser } from "./visual/visualiser.ts";
import { registerServiceWorker } from "./pwa.ts";
import { VERSION } from "./version.ts";

let tensionReleaseTimer: number | undefined;

function setPlayUI(playing: boolean): void {
  const btn = document.getElementById("playBtn");
  const status = document.getElementById("status");
  if (btn) {
    btn.classList.toggle("active", playing);
    btn.textContent = playing ? "STOP" : "PLAY";
  }
  if (status) {
    status.textContent = playing ? "● RUNNING" : "— STOPPED —";
    status.classList.toggle("playing", playing);
  }
}

function togglePlay(): void {
  const audio = initAudio();
  if (audio.actx.state === "suspended") audio.actx.resume();

  state.isPlaying = !state.isPlaying;

  if (state.isPlaying) {
    startScheduler();
    setPlayUI(true);
    startVisualiser();
  } else {
    stopScheduler();
    if (tensionReleaseTimer !== undefined) clearTimeout(tensionReleaseTimer);
    state.tensionActive = false;
    setTensionButton(false);
    setTensionOverlay(false);
    state.activeStep = -1;
    renderGrid();
    setPlayUI(false);
  }
}

function triggerTension(): void {
  const audio = initAudio();
  if (state.tensionActive) return;
  state.tensionActive = true;
  setTensionButton(true);
  setTensionOverlay(true);
  showEvent("▲ TENSION BUILDING");

  // Close filter, swell reverb, slow BPM slightly over 2s
  audio.filterNode.frequency.cancelScheduledValues(audio.actx.currentTime);
  audio.filterNode.frequency.linearRampToValueAtTime(150, audio.actx.currentTime + 2);
  audio.filterNode.Q.linearRampToValueAtTime(15, audio.actx.currentTime + 2);
  audio.reverbGain.gain.linearRampToValueAtTime(0.9, audio.actx.currentTime + 2);

  // Release after 4 bars worth
  const barDur = (60 / state.bpm) * 4;
  tensionReleaseTimer = setTimeout(() => releaseTension(), barDur * 4 * 1000);
}

function releaseTension(): void {
  state.tensionActive = false;
  setTensionButton(false);
  setTensionOverlay(false);
  showEvent("▼ RELEASE");

  const audio = getAudio();
  if (!audio) return;

  // Blast filter open + drop Q + restore reverb + fire a big chord
  audio.filterNode.frequency.cancelScheduledValues(audio.actx.currentTime);
  audio.filterNode.frequency.linearRampToValueAtTime(state.sweepMax, audio.actx.currentTime + 0.3);
  audio.filterNode.Q.linearRampToValueAtTime(5, audio.actx.currentTime + 1);
  audio.reverbGain.gain.linearRampToValueAtTime(state.reverbMix, audio.actx.currentTime + 2);
  triggerChordBlast(audio.actx.currentTime + 0.1);

  // Reset sweep cursor so the next sweep cycle starts near the top
  state.sweepBarCount = state.sweepBars - 2;
}

registerServiceWorker();

mountSequencer();
mountVisualiser();
mountControls({ onPlay: togglePlay, onTension: triggerTension });

loadPattern("tron");

// Expose a tiny debug surface so playwright / devtools can probe state.
(globalThis as unknown as { __darth?: Record<string, unknown> }).__darth = {
  version: VERSION,
  state: () => state,
  isSchedulerRunning: () => isSchedulerRunning(),
};
