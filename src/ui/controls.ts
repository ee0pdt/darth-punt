/**
 * Transport (PLAY / TENSION), the grid toolbar (pattern picker, EVOLVE,
 * CLEAR), and mounting the sound panels. Buttons call through to the
 * handlers passed in at mount time.
 */

import { state } from "../state.ts";
import { PATTERNS, STEP_COUNT, TRACKS } from "../patterns.ts";
import type { PatternName } from "../types.ts";
import { renderGrid } from "./sequencer.ts";
import { createFlagInput, mountPanels } from "./panels.ts";
import { MUTATE_FLAG } from "./params.ts";

export interface ControlHandlers {
  onPlay(): void;
  onTension(): void;
}

export function mountControls(handlers: ControlHandlers): void {
  document.getElementById("playBtn")?.addEventListener("click", handlers.onPlay);
  document.getElementById("tensionBtn")?.addEventListener("click", () => {
    if (!state.isPlaying) {
      // Explain instead of silently ignoring the press
      document.getElementById("tensionBtn")?.animate(
        [{ transform: "translateX(0)" }, { transform: "translateX(-4px)" }, {
          transform: "translateX(4px)",
        }, { transform: "translateX(0)" }],
        { duration: 220 },
      );
      return;
    }
    handlers.onTension();
  });
  document.getElementById("clearBtn")?.addEventListener("click", clearAll);

  document.querySelectorAll<HTMLElement>("[data-pattern]").forEach((btn) => {
    btn.addEventListener("click", () => loadPattern(btn.dataset.pattern as PatternName));
  });

  document.getElementById("mutateSlot")?.append(createFlagInput(MUTATE_FLAG, "pill pill-lg"));

  const panels = document.getElementById("panels");
  if (panels) mountPanels(panels);
}

function markPattern(name: PatternName | null): void {
  document.querySelectorAll<HTMLElement>("[data-pattern]").forEach((b) =>
    b.setAttribute("aria-pressed", b.dataset.pattern === name ? "true" : "false")
  );
}

export function loadPattern(name: PatternName): void {
  if (name === "random") {
    TRACKS.forEach((_track, ti) => {
      // Drums denser, pad sparser, others mid
      const threshold = ti < 3 ? 0.65 : ti === 6 ? 0.88 : 0.72;
      for (let s = 0; s < STEP_COUNT; s++) {
        state.grid[ti][s] = Math.random() > threshold ? 1 : 0;
      }
    });
  } else {
    const p = PATTERNS[name];
    TRACKS.forEach((track, ti) => {
      const data = p[track.label] ?? Array(STEP_COUNT).fill(0);
      for (let s = 0; s < STEP_COUNT; s++) state.grid[ti][s] = data[s];
    });
  }
  markPattern(name);
  renderGrid();
}

export function clearAll(): void {
  TRACKS.forEach((_track, ti) => {
    for (let s = 0; s < STEP_COUNT; s++) state.grid[ti][s] = 0;
  });
  markPattern(null);
  renderGrid();
}
