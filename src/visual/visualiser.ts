/**
 * Frequency-bar visualiser. Reads from `audio.analyser` (256 bins) and paints
 * a cyan -> purple gradient across the bar strip on each rAF tick. Stops when
 * `state.isPlaying` flips off so the canvas freezes on the last frame.
 */

import { state } from "../state.ts";
import { getAudio } from "../audio/graph.ts";

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

export function mountVisualiser(): void {
  canvas = document.getElementById("viz") as HTMLCanvasElement | null;
  if (!canvas) return;
  ctx = canvas.getContext("2d");
  resize();
  globalThis.addEventListener("resize", resize);
}

function resize(): void {
  if (!canvas) return;
  canvas.width = canvas.offsetWidth * devicePixelRatio;
  canvas.height = canvas.offsetHeight * devicePixelRatio;
}

export function startVisualiser(): void {
  requestAnimationFrame(draw);
}

function draw(): void {
  if (!state.isPlaying) return;
  requestAnimationFrame(draw);
  const audio = getAudio();
  if (!audio || !canvas || !ctx) return;
  audio.analyser.getByteFrequencyData(audio.analyserData);
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = "rgba(1,6,8,0.5)";
  ctx.fillRect(0, 0, w, h);
  const bars = audio.analyserData.length;
  const bw = w / bars;
  for (let i = 0; i < bars; i++) {
    const val = audio.analyserData[i];
    const bh = (val / 255) * h;
    const f = i / bars;
    const a = (val / 255) * 0.9;
    let col: string;
    if (f < 0.33) {
      col = `rgba(0,245,255,${a})`;
    } else if (f < 0.66) {
      // Cyan -> purple lerp across the mid third
      const r = Math.round(155 * ((f - 0.33) / 0.33));
      const g = Math.round(245 * (1 - (f - 0.33) / 0.33));
      col = `rgba(${r},${g},255,${a})`;
    } else {
      col = `rgba(155,89,255,${a})`;
    }
    ctx.fillStyle = col;
    ctx.fillRect(i * bw, h - bh, bw - 1, bh);
  }
}
