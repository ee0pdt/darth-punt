# UI Tidy-Up — Design

**Date:** 2026-05-20 **Status:** Approved, ready for implementation plan

## Goals

Refactor the DARTH PUNT UI to fix five concrete pains identified by the user:

1. Inconsistent button family (`.btn`, `.tag-btn`, `.tension-btn`) — no clear hierarchy.
2. Cheap-looking sliders (2px line, 8px square thumb, no fill, hard to use precisely).
3. Cramped & dense layout — tiny 0.46–0.5rem labels, weak visual grouping.
4. Aesthetic feels dated — too much cyberpunk maximalism on top of the Daft Punk/Tron intent.
5. Mobile toggle state is unclear — buttons don't read as "toggled" on small touch screens.

The audio artefacts the user separately mentioned are out of scope here; tracked as issue
[#1](https://github.com/ee0pdt/darth-punt/issues/1).

## Direction

- **Layout strategy:** performance-first. Stage (always visible) holds the visualiser, sequencer
  grid, transport, and a slim auto-meter strip. All other controls (mixer sliders, evolution
  toggles, pattern picker) move into a tabbed drawer behind a single handle.
- **Aesthetic:** Tron Legacy — monochrome cyan accent on near-black, thin precise line-work, sharp
  90° corners, restrained glow used only for active state. Drop purple entirely. Orange becomes a
  "warning/tension" accent reserved for the TENSION button and tension overlay.
- **Components:** consolidate to two button tiers (primary / secondary) plus a dedicated
  toggle-switch component. Slider has a real track, a fill, and a tall thin vertical-bar thumb.

## Section 1 — Aesthetic foundations

### Palette

| Token         | Value                    | Use                                             |
| ------------- | ------------------------ | ----------------------------------------------- |
| `--bg`        | `#05090d`                | Page background                                 |
| `--surface`   | `#0a1219`                | Stage panels, drawer body                       |
| `--surface-2` | `#0e1822`                | Raised surfaces inside drawer (slider track bg) |
| `--line`      | `rgba(120,180,200,0.10)` | Thin separators (used sparingly)                |
| `--cyan`      | `#5cd3ff`                | Primary accent                                  |
| `--cyan-dim`  | `rgba(92,211,255,0.45)`  | Secondary/idle states                           |
| `--cyan-low`  | `rgba(92,211,255,0.18)`  | Borders at rest, fill tints                     |
| `--warn`      | `#ff8a3d`                | TENSION button, tension overlay only            |
| `--text`      | `#cfe6f0`                | Default text (not cyan)                         |
| `--text-dim`  | `rgba(207,230,240,0.55)` | Labels, secondary text                          |

**Removed entirely:** the purple variable, the bright orange-as-default, the scanline animation, the
48px grid background, and per-character `text-shadow` glows on every readout. Glow becomes a
_signal_: applied only to the active step, the active toggle, and visualiser bars.

### Typography

- Keep Orbitron (wordmark + big readouts only) and Share Tech Mono (everywhere else).
- Baseline label size: `0.6875rem` (11px), up from `0.46–0.5rem`.
- Letter-spacing: `0.08em` default (down from `0.2em`). Reserve wider tracking (`0.18em`) for the
  wordmark and primary button labels only.

### Geometry

- Sharp 90° corners throughout. No `border-radius`.
- Stage container width: `min(1020px, 96vw)` desktop, `100vw` mobile.

## Section 2 — Layout structure

Two-zone model: **stage** (always visible) and **drawer** (tap/click to reveal).

```
┌─────────────────────────────────────────────────────────────┐
│  DARTH PUNT                       BAR 012   BPM 120   D 5   │   header (slim, fixed)
├─────────────────────────────────────────────────────────────┤
│                    [ visualiser canvas ]                    │   stage, ~70px tall
│  ─── FILTER ████████░░░░  ─── PUMP  ██████░░░░░░            │   2 inline auto strips
│  ┌────────────────────────────────────────────────────┐     │
│  │ KICK   ▣ □ □ □ ▣ □ □ □ ▣ □ □ □ ▣ □ □ □            │     │
│  │ ... 7 more rows                                    │     │   sequencer (8 rows)
│  └────────────────────────────────────────────────────┘     │
│      ┌─────────┐   ┌──────────────┐   ┌─ pattern ─┐         │
│      │ ▶ PLAY  │   │  ⚡ TENSION   │   │ TRON ▾    │         │   transport row
│      └─────────┘   └──────────────┘   └───────────┘         │
├──── ≡  CONTROLS ────────────────────────────────────────────┤   drawer handle
└─────────────────────────────────────────────────────────────┘
                  ↓ tap to open ↓
┌─────────────────────────────────────────────────────────────┐
│  [ MIX ] [ AUTO ] [ PATTERNS ]                          ✕   │   drawer tabs
├─────────────────────────────────────────────────────────────┤
│  (tab body — see Section 3 for component details)           │
└─────────────────────────────────────────────────────────────┘
```

### Stage contents (always visible)

- **Header (slim).** Wordmark left; `BAR 012  BPM 120  D 5` as a single inline status row right.
  Cyan accent on values, `--text-dim` on labels. No column-with-stacked-label widgets.
- **Visualiser.** Same canvas, ~70px tall. No `--orange` peaks (recolour to a brighter cyan tint).
- **Auto strips (2, not 4).** FILTER and PUMP only — the most "felt" of the four. REVERB and DETUNE
  move into the MIX tab as live read-only meters next to their sliders.
- **Sequencer grid.** All 8 tracks remain visible. Cell size: 32px square desktop, 28px square
  mobile. Beat-1 separator (`nth-child(4n+1)`) becomes a 2px brighter left border on desktop, 1px on
  mobile.
- **Mute controls.** Stay left of each track label, restyled as 24px square cyan cells matching the
  step grid (filled when muted, hollow when active).
- **Transport row.** PLAY + TENSION as primary buttons. Pattern picker collapses from 4 inline
  buttons (TRON/DAFT/DEREZZED/RANDOM) to a single dropdown button labelled with current selection.
  CLEAR moves into the PATTERNS tab.

### Drawer

- **Handle:** a 32px bar with `≡  CONTROLS` label, full-width across the bottom of the stage.
  Tap/click toggles open.
- **Tabs:** MIX, AUTO, PATTERNS. `✕` in the tab row closes the drawer.
- **MIX tab:** all sliders (BPM, PUMP, BPM DRIFT, CUTOFF, RESONANCE, REVERB, DETUNE, DRAMA, CHORD
  VOL, CHORD SUSTAIN, PAD VOL), each in a labelled row. REVERB and DETUNE sliders show a small
  live-value meter beside them (the auto-bar data we pulled off stage).
- **AUTO tab:** the 9 evolution toggles as labelled toggle-switch rows. On mobile, packs into a
  2-column grid.
- **PATTERNS tab:** the 4 pattern buttons (TRON/DAFT/DEREZZED/RANDOM) as large tap targets, plus
  CLEAR as a destructive action at the bottom (offset visually, e.g. extra top margin and `--warn`
  border).

### Drawer behaviour

- **Mobile (`<=720px`):** slides up from the bottom as a sheet, ~65vh tall, overlaying the lower
  portion of the stage. The stage above stays visible and scrollable behind the sheet (no scroll
  lock). A drag handle at the top of the sheet supports a swipe-to-close gesture; the `✕` in the tab
  row also closes it. Same DOM as desktop, different CSS.
- **Desktop (`>720px`):** opens inline, pushing the page taller. Drawer height animates 0 → ~360px.
  No overlay, no scroll lock.

## Section 3 — Component design

### Button family

Two tiers only. No third "tag" tier.

**Primary** (PLAY, TENSION):

- Height: 44px. Border: 1px solid `--cyan` (or `--warn` for TENSION).
- Background: transparent at rest; `rgba(92,211,255,0.08)` on hover with a subtle glow.
- Active state (e.g. PLAY while playing): solid cyan fill, dark text, no animation.
- Font: Orbitron 0.7rem, letter-spacing 0.18em.

**Secondary** (pattern dropdown trigger, drawer tab triggers, PATTERNS tab buttons):

- Height: 32px. Border: 1px `--cyan-dim` at rest, full `--cyan` on hover/active.
- Background: transparent at rest; `rgba(92,211,255,0.06)` on hover.
- Font: Share Tech Mono 0.6rem, letter-spacing 0.08em.

### Toggle switch (new component)

Replaces the 9 evolution buttons in the AUTO drawer tab.

- **Dimensions:** 44px wide × 22px tall track; 16px square knob.
- **OFF state:** 1px `--cyan-low` border, transparent fill, hollow knob at 35% opacity on the left.
  Label in `--text-dim` to the right.
- **ON state:** 1px solid `--cyan` border, `rgba(92,211,255,0.06)` fill, solid cyan knob with faint
  glow on the right. Label in `--text`.
- **Motion:** knob slides via `transform: translateX(22px)` in 120ms `cubic-bezier(0.4, 0, 0.2, 1)`.
- **Accessibility:** `role="switch"` + `aria-checked`. Label is a sibling `<label>` element,
  clickable.
- **Mobile:** in the AUTO tab's 2-column grid, label sits below the switch instead of beside.

### Slider

Replaces all current `input[type=range]` instances.

- **Track:** 6px tall, `--surface-2` background.
- **Fill:** rendered via
  `background: linear-gradient(to right, var(--cyan-low) 0 var(--pct), transparent var(--pct))`
  where `--pct` is a CSS custom property the input handler updates. Zero extra DOM.
- **Thumb:** 4px wide × 16px tall solid cyan vertical bar, sharp corners, faint glow.
- **Hit area:** the entire 44px-tall row is draggable (label + value + track), not just the 6px
  track itself.
- **Label layout:** label above-left, live value above-right of the track. Replaces the existing
  sub-track 0.46rem `.knob-val`.
- **Implementation note:** the `--pct` CSS variable must be updated in the existing
  `slider.addEventListener("input", ...)` handler in `src/ui/controls.ts` so the fill tracks the
  value live.

### Step cells (sequencer)

Minor tweaks only — the grid is already the strongest part of the UI.

- Cell size: 32px desktop / 28px mobile, up from current ~24px.
- Beat-1 separator: 2px brighter left border desktop, 1px mobile.
- Active step glow stays as `--glow-cyan`. Off-state cells lose the row-tinted variants
  (`.beat-orange`, `.beat-purple`) — all rows render in cyan now that purple/orange are reserved.
  Track-type colour cues move to the track _label_ (e.g. PAD label in slightly different shade), not
  the step cells.

## Section 4 — Mobile behaviour & motion

### Mobile breakpoint

Single breakpoint at `720px`.

### Mobile adjustments

- Header readouts compact to `012 · 120bpm · D5` (drop the column-with-label treatment, drop the
  word labels).
- Stage padding: 12px (was 20px). Container goes full-bleed `100vw`.
- Step cells: 28px square.
- Transport row stacks if needed: PLAY+TENSION on row 1 (50% width each), pattern dropdown on row 2.
- Drawer is a bottom sheet (see Section 2).
- Toggle switches in AUTO tab pack into a 2-column grid with label below the switch.

### Motion budget

- Toggle knob slide: 120ms `cubic-bezier(0.4, 0, 0.2, 1)`.
- Drawer open/close: 240ms ease-out. Mobile slides up; desktop animates `max-height` 0 → ~360px.
- Button hover: 100ms colour fade. No transforms.
- Step cell active glow: instantaneous on, 200ms ease-out fade after the step advances.
- Pulse animations retained only on the TENSION button at rest and the `.status.playing` text. Drop
  `keyframes scan` (scanline is gone).

### Tension overlay recolour

The `.tension-overlay` radial wash currently uses `rgba(155,89,255,0.15)` (purple). Purple is
removed from the palette, so recolour to `rgba(255,138,61,0.12)` (`--warn` at low alpha). Slightly
lower opacity than before to keep the effect subtle on top of the now-darker, less-noisy background.

### Accessibility

- All controls keyboard-reachable via Tab.
- Focus state: 2px `--cyan` outline offset by 2px. Sharp, no blur.
- Toggle switches: `role="switch"` + `aria-checked`. Sliders: leave as native `<input type="range">`
  for free a11y semantics.
- `prefers-reduced-motion: reduce` cuts drawer slide to 0ms, removes TENSION pulse, makes
  active-step glow instant on/off.
- Minimum 44×44 hit area on all interactive elements on mobile.

## Out of scope (explicit non-goals)

- Audio artefacts investigation — see issue #1.
- Adding new features (presets/save state, master limiter, etc.) — they came up in adjacent
  conversation but are not part of this redesign.
- Refactoring `src/audio/*` — pure UI work. The `controls.ts` `onChange` callbacks stay; only the
  DOM and CSS change.
- New patterns or evolution toggles.

## Files expected to change

- `index.html` — markup restructure (stage / drawer split, dropdown for patterns, toggle-switch
  markup in AUTO tab), and the entire `<style>` block.
- `src/ui/controls.ts` — slider handler updates the `--pct` CSS variable; pattern button selector
  changes from `[data-pattern]` button list to a dropdown; toggle-switch event delegation replaces
  the `[data-toggle]` button toggling (markup change, same state mutation).
- `src/ui/sequencer.ts` — mute button restyle (still toggles `state.mutes[ti]`, just new class
  names).
- `src/ui/readouts.ts` — header readout collapses to inline format on mobile (mostly CSS, possibly a
  small text update).
- `src/ui/events.ts` — tension overlay class toggle unchanged; only colour changes (CSS).
- New file: `src/ui/drawer.ts` — handles drawer open/close, tab switching, mobile-sheet vs
  desktop-inline behaviour.

No changes to `src/audio/*`, `src/state.ts`, `src/patterns.ts`, `src/main.ts` (beyond a single
`mountDrawer()` call).
