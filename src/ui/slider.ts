/**
 * Pointer-driven slider. Replaces <input type="range"> because native ranges
 * on touch need a precise hit on a tiny thumb, can't do log scaling, and
 * steal vertical scroll gestures inside the controls sheet.
 *
 * - The whole 44px-tall row is the hit area; the thumb follows the finger.
 * - Touch: a gesture only commits once it moves sideways (or is a clean tap),
 *   so scrolling the sheet over a slider never nudges its value.
 * - Double-tap / double-click resets to the default.
 * - Full keyboard support via role="slider".
 * - `setLive()` shows a ghost marker where automation has moved the value.
 */

export interface SliderOptions {
  min: number;
  max: number;
  step: number;
  value: number;
  scale?: "linear" | "log";
  label: string;
  format(v: number): string;
  onInput(v: number): void;
}

export interface SliderHandle {
  el: HTMLElement;
  setValue(v: number, silent?: boolean): void;
  setLive(v: number | null): void;
  getValue(): number;
}

const TAP_SLOP = 6;
const DOUBLE_TAP_MS = 300;

export function createSlider(opts: SliderOptions): SliderHandle {
  const { min, max, step } = opts;
  const log = opts.scale === "log" && min > 0;
  const initial = opts.value;
  let value = initial;

  const el = document.createElement("div");
  el.className = "slider";
  el.tabIndex = 0;
  el.setAttribute("role", "slider");
  el.setAttribute("aria-label", opts.label);
  el.setAttribute("aria-valuemin", String(min));
  el.setAttribute("aria-valuemax", String(max));
  el.innerHTML = `<div class="slider-track"><div class="slider-fill"></div>` +
    `<div class="slider-live" hidden></div><div class="slider-thumb"></div></div>`;
  const track = el.querySelector<HTMLElement>(".slider-track")!;
  const live = el.querySelector<HTMLElement>(".slider-live")!;

  const toFrac = (v: number) =>
    log ? Math.log(v / min) / Math.log(max / min) : (v - min) / (max - min);
  const fromFrac = (f: number) => {
    const c = Math.min(1, Math.max(0, f));
    return log ? min * Math.pow(max / min, c) : min + c * (max - min);
  };
  const quantise = (v: number) => {
    const q = Math.round((v - min) / step) * step + min;
    // Trim float noise (0.1 + 0.2 etc.) to the step's precision
    const decimals = (String(step).split(".")[1] ?? "").length;
    return Math.min(max, Math.max(min, Number(q.toFixed(decimals))));
  };

  function paint(): void {
    el.style.setProperty("--f", String(toFrac(value)));
    el.setAttribute("aria-valuenow", String(value));
    el.setAttribute("aria-valuetext", opts.format(value));
  }

  function setValue(v: number, silent = false): void {
    const q = quantise(v);
    if (q === value) return;
    value = q;
    paint();
    if (!silent) opts.onInput(value);
  }

  function valueAt(clientX: number): number {
    const r = track.getBoundingClientRect();
    return fromFrac((clientX - r.left) / r.width);
  }

  // ---- Pointer --------------------------------------------------------------
  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let committed = false;
  let lastTap = 0;

  el.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || pointerId !== null) return;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    committed = e.pointerType === "mouse";
    el.setPointerCapture(e.pointerId);
    el.classList.add("dragging");
    if (committed) {
      e.preventDefault();
      el.focus({ preventScroll: true });
      setValue(valueAt(e.clientX));
    }
  });

  el.addEventListener("pointermove", (e) => {
    if (e.pointerId !== pointerId) return;
    if (!committed) {
      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);
      if (dx < TAP_SLOP || dx < dy) return;
      committed = true;
    }
    setValue(valueAt(e.clientX));
  });

  const end = (e: PointerEvent, cancelled: boolean) => {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    el.classList.remove("dragging");
    const moved = Math.hypot(e.clientX - startX, e.clientY - startY);
    if (!cancelled && moved < TAP_SLOP) {
      const now = performance.now();
      if (now - lastTap < DOUBLE_TAP_MS) {
        setValue(initial);
        lastTap = 0;
        return;
      }
      lastTap = now;
      // A clean tap on touch jumps to that point, matching the mouse
      if (!committed) setValue(valueAt(e.clientX));
    }
  };
  el.addEventListener("pointerup", (e) => end(e, false));
  el.addEventListener("pointercancel", (e) => end(e, true));

  // ---- Keyboard -------------------------------------------------------------
  el.addEventListener("keydown", (e) => {
    const big = Math.max(step, (max - min) / 10);
    const mult = e.shiftKey ? 10 : 1;
    let next: number | null = null;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        next = log ? fromFrac(toFrac(value) + 0.01 * mult) : value + step * mult;
        if (quantise(next) === value) next = value + step;
        break;
      case "ArrowLeft":
      case "ArrowDown":
        next = log ? fromFrac(toFrac(value) - 0.01 * mult) : value - step * mult;
        if (quantise(next) === value) next = value - step;
        break;
      case "PageUp":
        next = log ? fromFrac(toFrac(value) + 0.1) : value + big;
        break;
      case "PageDown":
        next = log ? fromFrac(toFrac(value) - 0.1) : value - big;
        break;
      case "Home":
        next = min;
        break;
      case "End":
        next = max;
        break;
      default:
        return;
    }
    e.preventDefault();
    setValue(next);
  });

  paint();

  return {
    el,
    setValue,
    getValue: () => value,
    setLive(v) {
      if (v === null) {
        live.hidden = true;
        return;
      }
      live.hidden = false;
      el.style.setProperty("--live", String(Math.min(1, Math.max(0, toFrac(v)))));
    },
  };
}
