# CLAUDE.md

This file is read by Claude Code (and other AI assistants) when working on this repository.

## Project

`DARTH PUNT` &mdash; a single-page, zero-runtime-dependency cinematic generative sequencer
built on the Web Audio API. Vanilla TypeScript bundled with esbuild via Deno.

## Running

- `deno task dev` for local development, then open <http://localhost:8000>. Opening
  `index.html` directly from the filesystem does not work (native ES modules cannot load
  over `file://`).
- `deno task check` &mdash; fmt, lint, and type-check
- `deno task build` &mdash; produce `dist/main.js` (what Pages serves)

## Conventions

- Audio scheduling uses absolute `actx.currentTime` values, never `setTimeout`, except for
  UI side effects (chord flashes, event log) that piggy-back on the same future timestamp.
- All audio nodes live on the singleton `audio` object exported from `src/audio/graph.ts`
  and are populated lazily on first `togglePlay()`.
- App state (BPM, grid, automation flags, dramaLevel etc.) lives on the singleton `state`
  object in `src/state.ts`. UI writes; audio reads.
- Per-bar automation lives in `scheduler.onBarStart`; never duplicate that logic in
  the synthesis layer.
- Automation reports where it has moved a parameter via `readouts.setLive(id, v)`, which
  draws a ghost marker on that slider. Never write automated values back into a control:
  the thumb always shows what the user set.
- Sound controls are declared once in `src/ui/params.ts` (grouped by section, each paired
  with its automation flag); add a parameter there rather than hand-writing markup.
- Touch one module at a time when refactoring &mdash; small focused diffs review better.

## Layout

- `index.html` &mdash; markup + CSS shell, one `<script type="module" src="./dist/main.js">`
- `src/audio/` &mdash; graph (node chain), synthesis (voices), scheduler (step loop + automation), rumbles (chord/pad/arp data)
- `src/ui/` &mdash; sequencer (grid, drag-paint, mute chips, 8-step paging), controls (transport + grid toolbar), params (declarative sound-control sections), panels (renders params), slider (pointer/touch slider), sheet (bottom/side sheet on compact screens), readouts (header + live automation markers), events (event log + chord flash + tension overlay)
- Layout breakpoints (CSS in `index.html`): wide &ge;1100px = grid + sidebar; medium = single column with control cards; compact (&lt;700px wide or &le;520px tall) = viewport-fit app with controls in a sheet; portrait phones also get a bottom transport dock; &lt;560px shows 8 steps per page
- `src/visual/visualiser.ts` &mdash; frequency-bar canvas
- `src/patterns.ts` &mdash; TRACKS, PATTERNS, STICKY weights
- `src/state.ts` &mdash; mutable app state
- `src/main.ts` &mdash; wiring + boot
- `scripts/` &mdash; build, dev server, icon generator
