/**
 * Spectrum visualiser. Groups the analyser's linear FFT bins into
 * log-spaced bands (so bass isn't squashed into the first few pixels), eases
 * each band for smooth motion, and paints rounded bars with a cyan -> violet
 * gradient. Draws a calm baseline while stopped. Stops its rAF loop when
 * playback stops and the bars have settled.
 */

import { state } from "../state.ts";
import { getAudio } from "../audio/graph.ts";

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let running = false;
let bands = new Float32Array(0);
let gradient: CanvasGradient | null = null;

export function mountVisualiser(): void {
  canvas = document.getElementById("viz") as HTMLCanvasElement | null;
  if (!canvas) return;
  ctx = canvas.getContext("2d");
  new ResizeObserver(resize).observe(canvas);
  resize();
}

function resize(): void {
  // Hidden (e.g. short landscape layout): nothing to size or draw
  if (!canvas || !ctx || canvas.clientWidth === 0) return;
  const dpr = Math.min(2, devicePixelRatio || 1);
  const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
  const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if (canvas.width === w && canvas.height === h) return;
  canvas.width = w;
  canvas.height = h;
  // ~1 band per 14 css px, clamped
  const n = Math.max(24, Math.min(72, Math.round(canvas.clientWidth / 14)));
  if (n !== bands.length) bands = new Float32Array(n);
  gradient = ctx.createLinearGradient(0, 0, w, 0);
  gradient.addColorStop(0, "#5cd3ff");
  gradient.addColorStop(0.55, "#7c8cff");
  gradient.addColorStop(1, "#b07bff");
  if (!running) draw();
}

export function startVisualiser(): void {
  if (running) return;
  running = true;
  requestAnimationFrame(loop);
}

function loop(): void {
  const settled = draw();
  if (!state.isPlaying && settled) {
    running = false;
    return;
  }
  requestAnimationFrame(loop);
}

/** Paint one frame. Returns true when every band has decayed to ~0. */
function draw(): boolean {
  if (!canvas || !ctx || !gradient) return true;
  const audio = getAudio();
  const data = audio?.analyserData;
  if (audio && state.isPlaying) audio.analyser.getByteFrequencyData(audio.analyserData);

  const w = canvas.width;
  const h = canvas.height;
  const n = bands.length;
  const bins = data?.length ?? 0;
  // Skip DC; top quarter of bins is mostly empty at 44.1/48k
  const lo = 1;
  const hi = Math.max(lo + n, Math.floor(bins * 0.75));
  let settled = true;

  for (let i = 0; i < n; i++) {
    let target = 0;
    if (data && state.isPlaying) {
      const a = Math.floor(lo * Math.pow(hi / lo, i / n));
      const b = Math.max(a + 1, Math.floor(lo * Math.pow(hi / lo, (i + 1) / n)));
      let peak = 0;
      for (let k = a; k < b && k < bins; k++) if (data[k] > peak) peak = data[k];
      target = peak / 255;
    }
    // Fast attack, slower release
    const cur = bands[i];
    bands[i] = target > cur ? cur + (target - cur) * 0.6 : cur + (target - cur) * 0.12;
    if (bands[i] > 0.004) settled = false;
  }

  ctx.clearRect(0, 0, w, h);
  const gap = Math.max(2, (w / n) * 0.28);
  const bw = w / n - gap;
  if (bw <= 0) return settled;
  const r = Math.min(bw / 2, 3 * (devicePixelRatio || 1));
  const floor = Math.max(2, h * 0.035);
  ctx.fillStyle = gradient;
  for (let i = 0; i < n; i++) {
    const v = bands[i];
    const bh = floor + v * v * (h - floor) * 0.98;
    const x = i * (bw + gap) + gap / 2;
    ctx.globalAlpha = 0.25 + v * 0.75;
    ctx.beginPath();
    ctx.roundRect(x, h - bh, bw, bh, [r, r, 0, 0]);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  return settled;
}
