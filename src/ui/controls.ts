/**
 * Wires the knob/slider/button DOM to `state`. Mood-style param setters
 * here update state plus the matching `knob-val` label. Buttons (PLAY,
 * TENSION, CLEAR, pattern tags, evolution toggles) call through to the
 * handler argument passed in at mount time.
 */

import { state } from "../state.ts";
import { STEP_COUNT, TRACKS } from "../patterns.ts";
import { renderGrid } from "./sequencer.ts";
import { PATTERNS } from "../patterns.ts";
import type { PatternName } from "../types.ts";
import { setDramaReadout } from "./readouts.ts";
import { getAudio } from "../audio/graph.ts";

const PATTERN_LABELS: Record<string, string> = {
  tron: "TRON",
  daft: "DAFT",
  derezzed: "DEREZZED",
  random: "RANDOM",
};

export interface ControlHandlers {
  onPlay(): void;
  onTension(): void;
}

interface KnobBinding {
  id: string;
  valId: string;
  format: (v: number) => string;
  onChange: (v: number) => void;
}

function updateSliderFill(slider: HTMLInputElement): void {
  const min = parseFloat(slider.min || "0");
  const max = parseFloat(slider.max || "100");
  const v = parseFloat(slider.value);
  const pct = max > min ? ((v - min) / (max - min)) * 100 : 0;
  slider.style.setProperty("--pct", `${pct}%`);
}

export function mountControls(handlers: ControlHandlers): void {
  document.getElementById("playBtn")?.addEventListener("click", handlers.onPlay);
  document.getElementById("tensionBtn")?.addEventListener("click", handlers.onTension);
  document.getElementById("clearBtn")?.addEventListener("click", clearAll);

  // Pattern trigger — opens drawer on PATTERNS tab
  const patternTrigger = document.getElementById("patternTrigger");
  const patternTriggerVal = document.getElementById("patternTriggerVal");
  patternTrigger?.addEventListener("click", () => {
    const drawer = document.getElementById("drawer");
    const handle = document.getElementById("drawerHandle");
    if (drawer && handle && !drawer.classList.contains("open")) {
      drawer.classList.add("open");
      drawer.setAttribute("aria-hidden", "false");
      handle.setAttribute("aria-expanded", "true");
    }
    document.querySelectorAll<HTMLElement>(".drawer-tab").forEach((t) => {
      const match = t.dataset.tab === "patterns";
      t.classList.toggle("active", match);
      t.setAttribute("aria-selected", match ? "true" : "false");
    });
    document.querySelectorAll<HTMLElement>(".drawer-pane").forEach((p) => {
      p.classList.toggle("active", p.dataset.pane === "patterns");
    });
  });

  // Pattern selection buttons (live inside PATTERNS tab)
  document.querySelectorAll<HTMLElement>("[data-pattern]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.pattern as PatternName;
      loadPattern(name);
      if (patternTriggerVal) {
        patternTriggerVal.textContent = PATTERN_LABELS[name] ?? name.toUpperCase();
      }
    });
  });

  // Evolution toggle switches
  document.querySelectorAll<HTMLInputElement>("input[data-toggle]").forEach((input) => {
    input.addEventListener("change", () => {
      const key = input.dataset.toggle;
      if (!key) return;
      const bag = state as unknown as Record<string, boolean>;
      bag[key] = input.checked;
    });
  });

  const knobs: KnobBinding[] = [
    {
      id: "bpmSlider",
      valId: "bpmVal",
      format: (v) => String(v),
      onChange: (v) => {
        state.bpm = v;
        state.baseBpm = v;
        const ro = document.getElementById("bpmReadout");
        if (ro) ro.textContent = String(v);
      },
    },
    {
      id: "pumpSlider",
      valId: "pumpVal",
      format: (v) => v.toFixed(2),
      onChange: (v) => {
        state.pumpAmount = v;
      },
    },
    {
      id: "driftSlider",
      valId: "driftVal",
      format: (v) => String(v),
      onChange: (v) => {
        state.bpmDriftAmount = v;
      },
    },
    {
      id: "cutoffSlider",
      valId: "cutoffVal",
      format: (v) => String(v),
      onChange: (v) => {
        state.manualCutoff = v;
        const audio = getAudio();
        if (audio && !state.sweepEnabled) audio.filterNode.frequency.value = v;
      },
    },
    {
      id: "resSlider",
      valId: "resVal",
      format: (v) => v.toFixed(1),
      onChange: (v) => {
        const audio = getAudio();
        if (audio) audio.filterNode.Q.value = v;
      },
    },
    {
      id: "reverbSlider",
      valId: "reverbVal",
      format: (v) => v.toFixed(2),
      onChange: (v) => {
        state.reverbMix = v;
        const audio = getAudio();
        if (audio) {
          audio.reverbGain.gain.value = v;
          audio.dryGain.gain.value = 1 - v * 0.4;
        }
      },
    },
    {
      id: "detuneSlider",
      valId: "detuneVal",
      format: (v) => String(v),
      onChange: (v) => {
        state.detune = v;
        state.baseDetune = v;
      },
    },
    {
      id: "dramaSlider",
      valId: "dramaVal",
      format: (v) => String(v),
      onChange: (v) => {
        state.dramaLevel = v;
        setDramaReadout(v);
      },
    },
    {
      id: "chordVolSlider",
      valId: "chordVolVal",
      format: (v) => v.toFixed(2),
      onChange: (v) => {
        state.chordVol = v;
      },
    },
    {
      id: "chordSusSlider",
      valId: "chordSusVal",
      format: (v) => v.toFixed(1),
      onChange: (v) => {
        state.chordSustain = v;
      },
    },
    {
      id: "padVolSlider",
      valId: "padVolVal",
      format: (v) => v.toFixed(2),
      onChange: (v) => {
        state.padVol = v;
      },
    },
  ];

  for (const k of knobs) {
    const slider = document.getElementById(k.id);
    if (!(slider instanceof HTMLInputElement)) continue;
    const valEl = document.getElementById(k.valId);
    updateSliderFill(slider);
    slider.addEventListener("input", () => {
      const v = parseFloat(slider.value);
      k.onChange(v);
      if (valEl) valEl.textContent = k.format(v);
      updateSliderFill(slider);
    });
  }
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
  renderGrid();
}

export function clearAll(): void {
  TRACKS.forEach((_track, ti) => {
    for (let s = 0; s < STEP_COUNT; s++) state.grid[ti][s] = 0;
  });
  renderGrid();
}
