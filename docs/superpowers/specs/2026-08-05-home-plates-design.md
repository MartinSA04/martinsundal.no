# Home page — the plate redesign

**Date:** 2026-08-05
**Branch:** `redesign/micrographics`
**Status:** approved design, ready for implementation planning
**Supersedes:** the "Home page" section of `2026-08-05-site-rewrite-design.md`

## Problem

The home page does not read as micrographics. It reads as a clean Swiss
editorial layout with monospace labels applied as garnish.

Measured against the references in `docs/inspo/`:

| Reference vocabulary | Present on the home page |
| --- | --- |
| Circles, arcs, concentric rings, dotted arrays | None. Two glyphs inside `Icon`; nothing else |
| Radial fans, spoke diagrams | None |
| Composite marks — label plus ring plus arrow plus track | None. Every label is letter-spaced text |
| Display numerals as objects (`0079`, `007`) | `01`–`05` set in Archivo, as a list |
| Bracket syntax — `[ACTIVATED]`, `( ANALOG )`, `< 16:9 >` | None |
| Paired telemetry readouts | One: the `GEN 276 · STILL LIFE` line |
| Stacked multi-line rules | None. Single hairlines only |
| Rotated edge labels, corner registration, plate framing | `Marginalia` exists, unused on this page |

The root cause is not that the language was applied badly. The kit cannot
draw the language. It has seven primitives — `Rule`, `Crosshair`, `Index`,
`Marginalia`, `Barcode`, `SpecBlock`, `Icon` — and all seven are orthogonal
and flat. Every item in the left column above needs geometry the kit does not
have.

A second, smaller problem: the page is 3,336px tall at 1280px for roughly 500
words. The references are dense to the edges. Whitespace at this scale reads
as an unfinished layout, not as restraint.

## Goal

Rebuild the home page so that its composition is the graphic, not its
decoration. Extend the micrographics kit far enough to speak the reference
language, then redraw all five sections in it.

The framing device: the page is **a plate sheet from a technical manual
documenting one engineer**, its five sections numbered as plates 01 through
05. This is not costume. The subject is a robotics and simulation engineer,
and the hero is a real cellular automaton carrying real state, so the
instrumentation measures things that exist.

## Kit expansion

Eleven new primitives in `src/components/micro/`. Each draws only in
`--sub`, `--ink`, `--hair` and `--sig`, so every existing world keeps working
without change.

| Component | Draws | Props |
| --- | --- | --- |
| `Dial` | SVG arc gauge: ring, arc filling 0→1, centred numeral, caption | `value`, `max`, `label`, `size` |
| `Trace` | SVG polyline sparkline over a rolling series | `points`, `label`, `value`, `width`, `height` |
| `Fan` | radial ray fan across an arc | `rays`, `spread`, `radius` |
| `Node` | labelled circle, optional leader line | `label`, `leader`, `size` |
| `Tag` | bracket syntax | `variant: square \| round \| angle`, slot |
| `Readout` | paired `LABEL: VALUE` telemetry line, optionally live | `pairs`, `live?` |
| `Numeral` | display numeral as an object, optionally ringed | `n`, `variant`, `ring?` |
| `Stripe` | stacked hairline rule; `tapered` variant | `lines`, `variant` |
| `Ruler` | tick scale with labelled major ticks | `from`, `to`, `majors`, `axis` |
| `Plate` | frame, corner registration, edge labels, plate ID | `id`, `title`, `edges`, slot |
| `Mark` | composite section header: index, ring, rule, tick row | `n`, `label` |

`Readout` was named in the original site-rewrite spec's kit listing and never
built. The rest are new.

All eleven render as static markup. Only `Dial` and `Trace` accept live
updates, and both are complete and correct without JavaScript (see
Degradation).

## The five plates

### Plate 01 — Subject (hero)

```text
 ┌ MARTIN SUNDAL ASPÅS ─────────────── PLATE 01 · SUBJECT ┐
 ⌐                                                        ¬
   Martin Sundal Aspås                              (M|26)

   ┌─────────────────────────────┐   ╭───────╮
 r │                             │   │  ◜276 │  GEN
 o │      ░░░  M A R T I N  ░░░  │   ╰───────╯
 w │                             │   POP ▁▂▄█▆▃▂▁▁▁  412
 s └─────────────────────────────┘   [ SETTLED ]
   ┊0┊────┊89┊────┊178┊────┊267┊┊356┊
                                     RULE B3/S23 · 356×192
   I write software for things       ┌ ROLE ····· Software eng
   that move or compute…             ┊ AT ······· Aker, Verdal
 ⌊                                                        ⌋
 └────────────────────── 63.43°N 10.40°E ─ TRONDHEIM · NO ┘
```

The Game of Life band keeps its geometry exactly: the 166% overscale, the
`3.45` aspect crop, the top-and-bottom mask feather, and the settle at
generation 276. Nothing about the simulation's appearance changes.

What is added around it:

- A `Plate` frame with corner registration marks and rotated edge labels.
- `Ruler` along the bottom edge and the left edge of the life band. The tick
  labels are real board coordinates — columns 0, 89, 178, 267, 356 of the
  356×192 board defined by `martin_plan.txt`.
- An instrument column to the right of the band:
  - `Dial` — generation, arc filling 0→276.
  - `Trace` — live population over a rolling 120-generation window.
  - `Tag` — `[ SETTLED ]`, appearing when the board reproduces itself.
  - `Readout` — `RULE B3/S23 · BOARD 356×192 · SEED martin_plan.txt`.
- A composite `(M|26)` mark beside the name, echoing `modu-graph`'s `M₂₆`.

The lead sentence and the role spec block stay, with leader dots on the spec
rows.

**Telemetry is real.** `countLive()` and `isStillLife()` are already exported
from `src/lib/life.ts`. The only library change needed is widening the
`onGeneration` callback signature to pass population alongside generation and
settled state. No value displayed anywhere on this page is fabricated.

### Plate 02 — Engagement (work band)

The Verdal Production Line still frame gets a registered frame and a
`[ AKER SOLUTIONS · VERDAL ]` tag. The process becomes a `Node`-and-`Fan`
schematic across the five published stages: cutting, welding, surface
treatment, coating, mechanical completion.

The four published Aker facts currently appear only on `/work`. They move
into a `Readout` column here, so the band carries more information while
occupying less height.

The confidentiality constraint in `2026-08-05-site-rewrite-design.md` applies
unchanged. Every claim traces to Aker's own published page or the captions in
their own highlights video. No internal figures, no Aker mark.

### Plate 03 — Index (projects)

Stays five rows rather than becoming a card grid: the project names are long
and five cards scan worse than five rows.

Each row gains a left **instrument gutter** carrying the display `Numeral`,
a `Barcode` seeded on the project slug, and index dots. Read down the page,
the gutter forms one continuous column of marks, so the section reads as a
specimen sheet rather than five isolated blocks.

Stack pills become `Tag`s. Thumbnails gain corner registration and a `Node`
leader line. The cap-aligned numerals landed in commit `0fb41ab` are kept.

### Plate 04 — Notes (about)

The floating pull-quote is removed. A large sentence centred in whitespace is
the most generic element on the page.

The words are kept. They are rebuilt as a bounded note block with edge
marginalia at reading size. The second paragraph becomes three short
`Readout` lines rather than prose.

### Plate 05 — Contact

The 2×2 grid of large, mostly empty boxes becomes a single dense four-node
lattice: each channel is a `Node` with a leader line and a `Tag` carrying the
handle, under one set of corner registration marks.

## Theme system — two states

The three-state cycle is reduced to two. `deep-space` is removed.

The toggle becomes a true toggle rather than a cycle: `light ⇄ dark`.

Touched:

| File | Change |
| --- | --- |
| `src/scripts/theme.ts` | `THEMES` to `["light", "dark"]`; two labels; toggle instead of modulo cycle |
| `src/styles/kernel.css` | delete the `[data-theme="deep-space"]` block |
| `src/components/micro/Icon.astro` | delete the `theme-deep-space` glyph and its union member |
| `src/layouts/Base.astro` | delete the third toggle icon and its `:global` selector |
| `src/pages/kitchen-sink.astro` | themes array; two `Icon` usages |
| `e2e/theme.spec.ts` | cycle test becomes `light → dark → light`; icon assertions |
| `e2e/kernel.spec.ts` | icon name list |
| `e2e/shots.spec.ts`, `e2e/a11y.spec.ts` | `THEMES` constant |
| `shots/{desktop,mobile}/*-deep-space.png` | delete, 16 files (untracked — `shots/` is gitignored, so this is local cleanup only) |

**No migration code is required.** The blocking boot script in `Base.astro`
validates a stored value against a `THEMES`-derived list, and `current()` in
`theme.ts` falls back to `"light"` for any unrecognised value. A returning
visitor holding `msa-theme=deep-space` silently lands on light and has the
key rewritten on first toggle.

The historical plan documents under `docs/superpowers/plans/` are a record of
work already executed and are not rewritten. The two stale claims in
`2026-08-05-site-rewrite-design.md` — the third cycled state at line 104 and
the preserved easter egg at line 294 — are corrected to point here.

## Density target

Original target: 3,336px → ≤2,600px at 1280px, while carrying strictly more
information.

**Measured outcome: 3,161px.** The target was missed by 561px and has been
revised, because it was set before the content existed.

What actually happened: the height came down 175px while the page gained the
four published Aker facts, a five-stage process chain, per-project barcodes
and index dots, the board's two coordinate axes, four channel tags, and the
generation/population/settle instruments. Information per pixel rose sharply;
total pixels barely moved.

Reaching 2,600px from here requires deleting content rather than reclaiming
space. The remaining height is load-bearing:

| Section | Height | Floor |
| --- | --- | --- |
| Hero | 872px | The life band alone is ~290px at the 4:1 crop, and the crop cannot tighten further without cutting the settled word |
| Work | 570px | Set by the 16:9 poster at its column width |
| Index | 915px | Five rows at ~170px; the row is name + tagline + four tags + a 16:10 plate |
| Notes | 263px | Already reduced from a display pull-quote to reading scale |
| Contact | 398px | Two rows of a four-cell lattice |

The cuts already applied: section padding from `--space-6`/`--space-7` down
to `--space-4`/`--space-5`, project row padding from `--space-3` to
`--space-2`, and the life band crop from 3.45:1 to 4:1 — verified against
`e2e/home.spec.ts`, which asserts the settled word keeps a real inset on both
sides.

## Degradation

- **JavaScript disabled.** Every plate renders complete. `Dial` and `Trace`
  ship their settled-state values in the markup — generation 276, the final
  population, `[ SETTLED ]` — and script only takes over to animate them from
  zero if it runs. The page is never seen with empty or zeroed instruments.
- **`prefers-reduced-motion`.** Every instrument holds at its settled frame.
  The Game of Life does not step, matching current behaviour.
- **390px.** The instrument column moves below the life band as one
  horizontal readout strip. `Ruler` keeps only its end labels. Project rows
  fold the instrument gutter into a single line above the name.

## Preserved

- Game of Life behaviour, geometry, and convergence to `MARTIN` at
  generation 276.
- Kernel tokens and the four-property world contract.
- All copy facts, and the Aker confidentiality constraint.
- SEO, JSON-LD, OG image generation.
- `localStorage` key `msa-theme`; GoatCounter; `CNAME`.

## Quality bar

Unchanged from the site-rewrite spec, and re-verified for this page:

- Lighthouse ≥98 performance, 100 accessibility, mobile.
- Zero cumulative layout shift. Every instrument reserves its box.
- WCAG AA contrast in both themes.
- No horizontal overflow at 390px, verified with CDP device metrics
  (`Emulation.setDeviceMetricsOverride`, not `--window-size`).
- Complete keyboard path with visible focus rings.

## Verification

1. `astro build` clean, no warnings.
2. Unit test: `onGeneration` reports population matching `countLive()` at a
   sampled set of generations.
3. Game of Life convergence re-asserted by stepping the simulation
   synchronously, as before — rAF does not advance under headless virtual
   time.
4. CDP screenshots at 390px and 1440px, both themes, home page.
5. Rendered page height at 1280px measured against the ≤2,600px target.
6. Home page rendered with JavaScript disabled; instruments confirmed to show
   settled values rather than zeros.
7. `prefers-reduced-motion` emulated; no instrument animates.
8. Full e2e suite green, including the rewritten theme specs.
9. Rich Results Test on the home page, confirming the graph is unchanged.

## Out of scope

- The five project pages and `/work`. Their worlds are unchanged; they gain
  the new kit primitives only if a later pass uses them.
- Any change to the Game of Life algorithm or its plan file.
- Norwegian translation, a blog, or any new route.
