/**
 * Header readouts (BAR/BPM/DRAMA) and the four automation bars
 * (FILTER/REVERB/PUMP/DETUNE). Pure DOM updaters; no audio state lives here.
 */

export function setBarReadout(bar: number): void {
  const el = document.getElementById("barVal");
  if (el) el.textContent = String(bar);
}

export function setBpmReadout(bpm: number): void {
  const readout = document.getElementById("bpmReadout");
  const val = document.getElementById("bpmVal");
  const slider = document.getElementById("bpmSlider") as HTMLInputElement | null;
  if (readout) readout.textContent = String(bpm);
  if (val) val.textContent = String(bpm);
  if (slider) slider.value = String(bpm);
}

export function setDramaReadout(drama: number): void {
  const readout = document.getElementById("dramaReadout");
  const val = document.getElementById("dramaVal");
  if (readout) readout.textContent = String(drama);
  if (val) val.textContent = String(drama);
}

export function setCutoffReadout(freq: number): void {
  const val = document.getElementById("cutoffVal");
  const slider = document.getElementById("cutoffSlider") as HTMLInputElement | null;
  if (val) val.textContent = String(freq);
  if (slider) slider.value = String(freq);
}

export function setDetuneReadout(detune: number): void {
  const val = document.getElementById("detuneVal");
  const slider = document.getElementById("detuneSlider") as HTMLInputElement | null;
  if (val) val.textContent = String(detune);
  if (slider) slider.value = String(detune);
}

export function updateAutoBar(
  fillId: string,
  valId: string,
  pct: number,
  val: string | number,
): void {
  const fill = document.getElementById(fillId);
  const valEl = document.getElementById(valId);
  if (fill) fill.style.width = Math.min(100, Math.max(0, pct)) + "%";
  if (valEl) valEl.textContent = String(val);
}
