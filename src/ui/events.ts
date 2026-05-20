/**
 * Event-log toast (lower-right of the status row), chord flash overlay above
 * the visualiser, and the radial purple tension overlay. All are pure DOM
 * side effects with no audio coupling.
 */

const EVENT_LOG_MS = 2500;
let eventTimer: number | undefined;

export function showEvent(msg: string): void {
  const el = document.getElementById("eventLog");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(eventTimer);
  eventTimer = setTimeout(() => el.classList.remove("show"), EVENT_LOG_MS);
}

export function flashChord(): void {
  const el = document.getElementById("chordFlash");
  if (!el) return;
  el.classList.remove("fade");
  el.classList.add("active");
  // Fade out shortly after the visual hit — 100ms attack, 600ms decay
  setTimeout(() => {
    el.classList.remove("active");
    el.classList.add("fade");
  }, 100);
  setTimeout(() => el.classList.remove("fade"), 700);
}

export function setTensionOverlay(active: boolean): void {
  const overlay = document.getElementById("tensionOverlay");
  overlay?.classList.toggle("active", active);
}

export function setTensionButton(releasing: boolean): void {
  const btn = document.getElementById("tensionBtn");
  btn?.classList.toggle("releasing", releasing);
}
