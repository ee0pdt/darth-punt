/**
 * Header readouts (BAR / CHORD / BPM) and live automation markers. The
 * scheduler reports where automation has moved a parameter via `setLive`;
 * the slider shows that as a ghost marker instead of yanking its thumb away
 * from the value the user set. Pure DOM updaters; no audio state lives here.
 */

type LiveFn = (v: number | null) => void;
const liveFns = new Map<string, LiveFn>();

export function registerLive(id: string, fn: LiveFn): void {
  liveFns.set(id, fn);
}

/** Show where automation currently has parameter `id` (null hides the marker). */
export function setLive(id: string, v: number | null): void {
  liveFns.get(id)?.(v);
}

export function clearLive(): void {
  for (const fn of liveFns.values()) fn(null);
}

function text(id: string, value: string): void {
  const el = document.getElementById(id);
  if (el && el.textContent !== value) el.textContent = value;
}

export function setBarReadout(bar: number | null): void {
  text("barVal", bar === null ? "—" : String(bar));
}

export function setChordReadout(name: string | null): void {
  text("chordVal", name ?? "—");
}

/** Live tempo (including drift) in the header. */
export function setBpmReadout(bpm: number): void {
  text("bpmReadout", String(bpm));
}

/** Bars left until a tension build drops; null when idle. */
export function setTensionCountdown(bars: number | null): void {
  const el = document.getElementById("tensionSub");
  if (!el) return;
  el.textContent = bars === null ? "" : bars <= 1 ? "DROP!" : `DROP IN ${bars}`;
}
