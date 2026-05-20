/**
 * Build the 7x16 step grid from TRACKS, wire click handlers, and expose
 * `renderGrid` for the scheduler to call on each step + mutation.
 */

import { state } from "../state.ts";
import { STEP_COUNT, TRACKS } from "../patterns.ts";

export function mountSequencer(): void {
  const seq = document.getElementById("sequencer");
  if (!seq) return;
  seq.innerHTML = "";
  TRACKS.forEach((track, ti) => {
    const row = document.createElement("div");
    row.className = "track";

    const left = document.createElement("div");
    left.className = "track-left";

    const mute = document.createElement("button");
    mute.type = "button";
    mute.className = "mute-btn";
    mute.title = "Mute";
    mute.addEventListener("click", () => {
      state.mutes[ti] = !state.mutes[ti];
      mute.classList.toggle("muted", state.mutes[ti]);
    });

    const lbl = document.createElement("div");
    lbl.className = "track-label";
    lbl.textContent = track.label;

    left.appendChild(mute);
    left.appendChild(lbl);
    row.appendChild(left);

    const steps = document.createElement("div");
    steps.className = "steps";
    for (let s = 0; s < STEP_COUNT; s++) {
      const step = document.createElement("div");
      step.className = "step";
      step.dataset.track = String(ti);
      step.dataset.step = String(s);
      step.addEventListener("click", () => {
        state.grid[ti][s] = state.grid[ti][s] ? 0 : 1;
        renderGrid();
      });
      steps.appendChild(step);
    }
    row.appendChild(steps);
    seq.appendChild(row);
  });
}

export function renderGrid(): void {
  document.querySelectorAll<HTMLElement>(".step").forEach((el) => {
    const ti = Number(el.dataset.track);
    const s = Number(el.dataset.step);
    el.classList.toggle("on", !!state.grid[ti][s]);
    el.classList.toggle("active", s === state.activeStep && state.isPlaying);
  });
}

export function setActiveStep(step: number): void {
  state.activeStep = step;
}
