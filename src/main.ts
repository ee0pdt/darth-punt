/**
 * Entry point. Mounts the sequencer, controls, and visualiser on DOM ready,
 * loads the default TRON pattern, and wires togglePlay / triggerTension as
 * the only user-driven side effects. All audio nodes are built lazily on
 * first play to satisfy autoplay policies.
 */

import { state } from "./state.ts";
import { getAudio, initAudio } from "./audio/graph.ts";
import { isSchedulerRunning, startScheduler, stopScheduler } from "./audio/scheduler.ts";
import { cancelTension, triggerTension } from "./audio/tension.ts";
import { mountSequencer, renderGrid } from "./ui/sequencer.ts";
import { loadPattern, mountControls } from "./ui/controls.ts";
import { mountSheet } from "./ui/sheet.ts";
import { clearLive, setBarReadout, setBpmReadout, setChordReadout } from "./ui/readouts.ts";
import { mountVisualiser, startVisualiser } from "./visual/visualiser.ts";
import { registerServiceWorker } from "./pwa.ts";
import { VERSION } from "./version.ts";

function setPlayUI(playing: boolean): void {
  const btn = document.getElementById("playBtn");
  const label = document.getElementById("playLabel");
  const status = document.getElementById("status");
  btn?.classList.toggle("active", playing);
  btn?.setAttribute("aria-pressed", playing ? "true" : "false");
  if (label) label.textContent = playing ? "STOP" : "PLAY";
  if (status) status.textContent = playing ? "RUNNING" : "STOPPED";
  document.body.classList.toggle("is-playing", playing);
  document.getElementById("tensionBtn")?.setAttribute("aria-disabled", playing ? "false" : "true");
  if (!playing) {
    clearLive();
    setBarReadout(null);
    setChordReadout(null);
    setBpmReadout(state.baseBpm);
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
    cancelTension();
    state.activeStep = -1;
    renderGrid();
    setPlayUI(false);
  }
}

registerServiceWorker();

mountSequencer();
mountVisualiser();
mountControls({ onPlay: togglePlay, onTension: triggerTension });
mountSheet();

loadPattern("tron");

// Expose a tiny debug surface so playwright / devtools can probe state.
// `analyserPeak` returns the max byte across the FFT bins — a non-zero value
// is proof that audio is actually flowing through the graph (smoke test).
(globalThis as unknown as { __darth?: Record<string, unknown> }).__darth = {
  version: VERSION,
  state: () => state,
  isSchedulerRunning: () => isSchedulerRunning(),
  actxState: () => getAudio()?.actx.state ?? "not-created",
  analyserPeak: () => {
    const audio = getAudio();
    if (!audio) return 0;
    audio.analyser.getByteFrequencyData(audio.analyserData);
    let peak = 0;
    for (const v of audio.analyserData) if (v > peak) peak = v;
    return peak;
  },
};
