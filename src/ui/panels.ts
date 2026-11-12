/**
 * Renders `SECTIONS` into the controls panel. One card per section; each
 * parameter row is: label · automation pill · value, with the slider beneath.
 * Switch inputs keep `data-toggle="<stateKey>"` so tests and devtools can
 * find them by state key.
 */

import { state } from "../state.ts";
import { type FlagDef, type ParamDef, SECTIONS, type SwitchDef } from "./params.ts";
import { createSlider } from "./slider.ts";
import { registerLive } from "./readouts.ts";

const flagInputs = new Map<string, HTMLInputElement>();

/** Flip a flag from code (e.g. dragging cutoff takes over from the sweep). */
export function setFlag(flag: FlagDef, on: boolean): void {
  if (state[flag.key] === on) return;
  state[flag.key] = on;
  const input = flagInputs.get(flag.key);
  if (input) input.checked = on;
  flag.onChange?.(on);
  document.dispatchEvent(new CustomEvent("flagchange", { detail: flag.key }));
}

export function createFlagInput(flag: FlagDef, cls: string): HTMLLabelElement {
  const label = document.createElement("label");
  label.className = cls;
  if (flag.hint) label.title = flag.hint;
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("role", "switch");
  input.dataset.toggle = flag.key;
  input.checked = state[flag.key];
  input.addEventListener("change", () => {
    state[flag.key] = input.checked;
    flag.onChange?.(input.checked);
    document.dispatchEvent(new CustomEvent("flagchange", { detail: flag.key }));
  });
  flagInputs.set(flag.key, input);
  const text = document.createElement("span");
  text.className = "flag-text";
  text.textContent = flag.label;
  label.append(input, text);
  return label;
}

function renderParam(p: ParamDef): HTMLElement {
  const row = document.createElement("div");
  row.className = "param";
  row.dataset.param = p.id;

  const head = document.createElement("div");
  head.className = "param-head";
  const name = document.createElement("span");
  name.className = "param-name";
  name.id = `p-${p.id}-lbl`;
  name.textContent = p.label;
  if (p.hint) name.title = p.hint;
  const val = document.createElement("output");
  val.className = "param-val";
  val.id = `${p.id}Val`;
  val.textContent = p.format(p.get());
  head.append(name);

  const slider = createSlider({
    min: p.min,
    max: p.max,
    step: p.step,
    scale: p.scale,
    value: p.get(),
    label: p.label,
    format: p.format,
    onInput: (v) => {
      p.set(v);
      val.textContent = p.format(v);
      // Grabbing the cutoff means "I want this value" — stop the sweep fighting it
      if (p.flag?.key === "sweepEnabled" && state.sweepEnabled) setFlag(p.flag, false);
    },
  });
  slider.el.id = `${p.id}Slider`;

  if (p.flag) {
    head.append(createFlagInput(p.flag, "pill"));
    const sync = () => {
      const on = state[p.flag!.key];
      row.classList.toggle("is-off", !on && p.flag!.label === "On");
      row.classList.toggle("is-auto", on && p.flag!.label !== "On");
      if (!on) slider.setLive(null);
    };
    document.addEventListener("flagchange", sync);
    sync();
  }
  head.append(val);

  registerLive(p.id, (v) => {
    const automated = p.flag ? state[p.flag.key] : true;
    slider.setLive(v === null || !automated ? null : v);
  });

  row.append(head, slider.el);
  return row;
}

function renderSwitch(s: SwitchDef): HTMLElement {
  const row = createFlagInput(s.flag, "switch-row");
  if (s.flag.hint) {
    const hint = document.createElement("span");
    hint.className = "switch-hint";
    hint.textContent = s.flag.hint;
    row.querySelector(".flag-text")?.append(hint);
  }
  return row;
}

export function mountPanels(container: HTMLElement): void {
  container.innerHTML = "";
  for (const section of SECTIONS) {
    const card = document.createElement("section");
    card.className = "card";
    card.dataset.section = section.id;
    const h = document.createElement("h2");
    h.textContent = section.title;
    card.append(h);
    for (const item of section.items) {
      card.append(item.kind === "param" ? renderParam(item) : renderSwitch(item));
    }
    container.append(card);
  }
}
