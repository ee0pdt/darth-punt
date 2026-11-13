/**
 * Build the 7x16 step grid from TRACKS, wire painting + mute, and expose
 * `renderGrid` / `setActiveStep` for the scheduler.
 *
 * - Press a cell and drag to paint: the first cell decides on/off, every cell
 *   the pointer crosses gets the same value (works for mouse and touch).
 * - The track chip is the mute button.
 * - Steps are grouped in beats of four. On narrow screens CSS shows one page
 *   of eight steps at a time; `#pageBtns` switches pages.
 * - Cell refs are cached, so per-step rendering touches only what changed.
 */

import { state } from "../state.ts";
import { STEP_COUNT, TRACKS } from "../patterns.ts";

let cells: HTMLElement[][] = [];
let shownStep = -1;
let painting: { value: number; pointerId: number } | null = null;

export function mountSequencer(): void {
  const seq = document.getElementById("sequencer");
  if (!seq) return;
  seq.innerHTML = "";
  cells = [];

  TRACKS.forEach((track, ti) => {
    const row = document.createElement("div");
    row.className = "track";
    row.dataset.kind = track.type;

    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "track-chip";
    chip.innerHTML =
      `<span class="dot" aria-hidden="true"></span><span class="name">${track.label}</span>`;
    const syncMute = () => {
      const muted = state.mutes[ti];
      row.classList.toggle("muted", muted);
      chip.setAttribute("aria-pressed", muted ? "true" : "false");
      chip.setAttribute(
        "aria-label",
        `${track.label}: ${muted ? "muted" : "playing"}. Toggle mute`,
      );
      chip.title = muted ? "Unmute" : "Mute";
    };
    chip.addEventListener("click", () => {
      state.mutes[ti] = !state.mutes[ti];
      syncMute();
    });
    syncMute();
    row.appendChild(chip);

    const steps = document.createElement("div");
    steps.className = "steps";
    const rowCells: HTMLElement[] = [];
    for (let g = 0; g < STEP_COUNT / 4; g++) {
      const group = document.createElement("div");
      group.className = "beat";
      group.dataset.page = String(Math.floor(g / 2));
      for (let k = 0; k < 4; k++) {
        const s = g * 4 + k;
        const step = document.createElement("button");
        step.type = "button";
        step.className = "step";
        step.dataset.track = String(ti);
        step.dataset.step = String(s);
        step.setAttribute("aria-label", `${track.label} step ${s + 1}`);
        group.appendChild(step);
        rowCells.push(step);
      }
      steps.appendChild(group);
    }
    row.appendChild(steps);
    seq.appendChild(row);
    cells.push(rowCells);
  });

  wirePainting(seq);
  wirePaging(seq);
  renderGrid();
}

function cellAt(x: number, y: number): HTMLElement | null {
  const el = document.elementFromPoint(x, y);
  return el instanceof HTMLElement && el.classList.contains("step") ? el : null;
}

function paintCell(el: HTMLElement, value: number): void {
  const ti = Number(el.dataset.track);
  const s = Number(el.dataset.step);
  if (state.grid[ti][s] === value) return;
  state.grid[ti][s] = value;
  el.classList.toggle("on", !!value);
  el.setAttribute("aria-pressed", value ? "true" : "false");
}

function wirePainting(seq: HTMLElement): void {
  seq.addEventListener("pointerdown", (e) => {
    const el = e.target instanceof HTMLElement && e.target.closest<HTMLElement>(".step");
    if (!el || e.button !== 0) return;
    e.preventDefault();
    const ti = Number(el.dataset.track);
    const s = Number(el.dataset.step);
    painting = { value: state.grid[ti][s] ? 0 : 1, pointerId: e.pointerId };
    paintCell(el, painting.value);
  });
  seq.addEventListener("pointermove", (e) => {
    if (!painting || e.pointerId !== painting.pointerId) return;
    const el = cellAt(e.clientX, e.clientY);
    if (el) paintCell(el, painting.value);
  });
  const stop = (e: PointerEvent) => {
    if (painting && e.pointerId === painting.pointerId) painting = null;
  };
  globalThis.addEventListener("pointerup", stop);
  globalThis.addEventListener("pointercancel", stop);

  // Keyboard: the cell is a <button>, Enter/Space produce a click with detail 0
  seq.addEventListener("click", (e) => {
    const el = e.target instanceof HTMLElement && e.target.closest<HTMLElement>(".step");
    if (!el || (e as MouseEvent).detail !== 0) return;
    const ti = Number(el.dataset.track);
    const s = Number(el.dataset.step);
    paintCell(el, state.grid[ti][s] ? 0 : 1);
  });
}

function wirePaging(seq: HTMLElement): void {
  document.querySelectorAll<HTMLButtonElement>("#pageBtns [data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      seq.dataset.page = btn.dataset.page;
      document.querySelectorAll("#pageBtns [data-page]").forEach((b) =>
        b.setAttribute("aria-pressed", b === btn ? "true" : "false")
      );
    });
  });
  seq.dataset.page = "0";
}

export function renderGrid(): void {
  for (let ti = 0; ti < cells.length; ti++) {
    const row = cells[ti];
    for (let s = 0; s < row.length; s++) {
      const on = !!state.grid[ti][s];
      const el = row[s];
      if (el.classList.contains("on") !== on) {
        el.classList.toggle("on", on);
        el.setAttribute("aria-pressed", on ? "true" : "false");
      }
    }
  }
  paintPlayhead(state.isPlaying ? state.activeStep : -1);
}

function paintPlayhead(step: number): void {
  if (step === shownStep) return;
  for (const row of cells) {
    if (shownStep >= 0) row[shownStep]?.classList.remove("active");
    if (step >= 0) row[step]?.classList.add("active");
  }
  shownStep = step;
  const page = step < 0 ? -1 : Math.floor(step / 8);
  document.querySelectorAll<HTMLElement>("#pageBtns [data-page]").forEach((b) =>
    b.classList.toggle("playing", Number(b.dataset.page) === page)
  );
}

export function setActiveStep(step: number): void {
  state.activeStep = step;
}
