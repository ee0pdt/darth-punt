# DARTH PUNT

Cinematic generative sequencer in the browser. 16-step grid, seven tracks, automated filter sweeps,
chord blasts, pad swells, arp rumbles, and a TENSION button that closes the filter, swells reverb,
then blows the doors off.

&rarr; **[Try it](https://ee0pdt.github.io/darth-punt/)**

## What it is

A single tab that plays forever. No accounts, no ads. Pick a pattern (TRON, DAFT, DEREZZED, or
RANDOM), hit PLAY, and the engine mutates the grid every two bars while drama-aware automation
drives the filter, pump, reverb and detune.

## For developers

Vanilla TypeScript on top of the Web Audio API &mdash; no frameworks, no runtime dependencies.
[Deno](https://deno.com) is the only tool you need.

```bash
git clone git@github.com:ee0pdt/darth-punt.git
cd darth-punt
deno task dev          # http://localhost:8000
```

Other tasks:

- `deno task check` &mdash; fmt, lint, type-check
- `deno task build` &mdash; bundle to `dist/main.js` (what Pages serves)
- `deno task icons` &mdash; regenerate PWA icons

## Licence

MIT &mdash; see [`LICENSE`](./LICENSE).
