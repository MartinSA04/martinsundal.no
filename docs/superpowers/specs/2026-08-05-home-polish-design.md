# Home page polish, icon set, RPG removal

Three pieces of work that happen to touch the same files: a proper icon
primitive replacing the text characters currently doing an icon's job, a
polish pass on the home page, and the removal of the Konami RPG.

## 1. The icon primitive

Ten places on the site draw an icon by typing a character. That has three
costs: the glyph's weight and baseline come from whichever font resolves, so
nothing lines up with the site's 1px hairlines; the metrics differ across
platforms; and `□`, `◐` and `▼` are all in ranges a fallback font may not
carry at all.

### `src/components/micro/Icon.astro`

A new member of the micrographics kit, subject to the same rule as every other
one: it draws only in terms of the four world tokens, by inheriting
`currentColor`.

```
interface Props {
  name: "arrow-right" | "caret-down" | "theme-light" | "theme-dark" | "theme-deep-space";
  size?: number;   // px, default 16
  class?: string;
}
```

Paths are authored on a 24-unit grid. `stroke-width` is set so a stroke lands
on exactly 1px at the default size — 1.5 units at 16px — matching `--rule`.
`aria-hidden="true"` and `focusable="false"` are unconditional; every current
call site already wraps the glyph in an `aria-hidden` span, and the accessible
name always comes from adjacent text or the parent's `aria-label`.

The kit's proof page, `src/pages/kitchen-sink.astro`, gains a row rendering
every icon at every size in use, the same way it already proves the barcode,
crosshair and rule.

### Call sites

| File                                       | Now                           | After                                                                                                                  |
| ------------------------------------------ | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `components/home/Contact.astro:42`         | `&rarr;`                      | `<Icon name="arrow-right" />`                                                                                          |
| `components/home/WorkBand.astro:28`        | `&rarr;`                      | `<Icon name="arrow-right" />`                                                                                          |
| `components/home/ProjectIndex.astro:70`    | `&rarr;`                      | `<Icon name="arrow-right" />`                                                                                          |
| `components/project/ProjectLinks.astro:26` | `&rarr;`                      | `<Icon name="arrow-right" />`                                                                                          |
| `pages/work.astro:82`                      | `&rarr;` inside the link text | `<Icon name="arrow-right" />` after it                                                                                 |
| `layouts/Base.astro:148`                   | `◐`                           | three theme icons, see below                                                                                           |
| `worlds/cipherbound.css:169`               | `content: "\25bc"`            | rule dropped; `<Icon name="caret-down" />` added to the `data-cb-next` button in `pages/projects/cipherbound.astro:52` |
| `worlds/study-companion.css:242`           | `content: "□"`                | a drawn hairline box, see below                                                                                        |
| `worlds/black-hole.ts:132`                 | `fillText("light in →")`      | `fillText("light in")` plus an arrowhead drawn with `lineTo`                                                           |

Two of these are deliberately not icons.

**The study companion checkbox.** `content: "□"` becomes an empty
`::before` with a real border:

```css
.sc-goals li::before {
  content: "";
  width: 0.62em;
  height: 0.62em;
  border: var(--rule) solid var(--sig);
  flex: none;
  translate: 0 0.1em;
}
```

A hairline box drawn by the same mechanism as every other hairline on the site
is more correct here than an SVG of a box would be, and it inherits `--rule`.

**The black hole annotation** is canvas text on a diagram made of lines. The
arrowhead belongs in the diagram's own drawing code, not in an `<svg>`.

### The theme toggle

`◐` is the worst of the ten: a 2rem control whose entire content is one
half-shaded circle, rendered at whatever weight the mono fallback gives it, and
it says nothing about which of the three themes is active. `theme.ts` already
tracks that state and writes it into the toggle's `aria-label`; the icon should
say the same thing visually.

Base.astro inlines all three icons inside the button. CSS shows exactly one:

```css
#theme-toggle svg {
  display: none;
}
[data-theme="light"] #theme-toggle [data-icon="theme-light"],
[data-theme="dark"] #theme-toggle [data-icon="theme-dark"],
[data-theme="deep-space"] #theme-toggle [data-icon="theme-deep-space"] {
  display: block;
}
```

No JavaScript changes: the blocking inline script in `<head>` already sets
`data-theme` before first paint, so the right icon is correct on the first
frame. `theme.ts` keeps sole responsibility for the `aria-label`.

The three marks, all on the 24-grid in hairline stroke:

- **light** — a circle with eight radiating ticks.
- **dark** — a crescent, drawn as one closed path rather than as a masked disc,
  so it holds up at 16px.
- **deep-space** — a small circle with an elliptical ring around it, echoing
  the black hole world the theme is named after.

## 2. Home page polish

### The hero band

Measured in the browser at the settled generation, at 1280px and at 390px,
rather than reasoned about. Two faults, and two things that turned out to be
fine.

**Fault 1 — the word is clipped flush against both edges.** The settled word
is 206 cells wide on a 356-cell board, so it occupies 57.87% of the canvas.
The canvas is overscaled to `173%`, which puts the word at
`1.73 × 0.5787 = 100.1%` of the frame — deliberately, so it lines up with the
`h1`'s measure. It overshoots by 0.6px on each side, so the outermost column
of the M's left stem and the N's right stem is cut. Measured: word 1153.2px
against a 1152px frame at desktop, 350.4px against 350px at mobile.

Fix: drop the overscale to `166%`, which puts the word at 96% of the measure —
a 2% inset on each side. Verified against a three-way prototype: the letters
clear the edge and the alignment with the heading still reads.

**Fault 2 — eleven seconds of noise.** Before generation 276 the band is
undifferentiated static below the name, with nothing saying it is computing
anything.

Fix: a `micro-label` readout on the frame's bottom edge, ticking with the
simulation:

```
GEN 041 · B3/S23 · 356×192
```

settling to `GEN 276 · STILL LIFE` and stopping. The eleven seconds become
eleven seconds of instrument rather than eleven seconds of noise, and the
convergence the whole hero is built around finally announces itself.

`createLifeScene` in `src/lib/life.ts` gains an `onGeneration` callback for
this; the DOM writing stays in `Hero.astro`. The scene also gains a still-life
halt — once a step produces a board identical to the previous one, stepping
stops. That is what produces `STILL LIFE`, and it also stops the home page
running a 68,352-cell simulation forever for no visible change.

**Not faults, contrary to the first draft of this spec.** The `mask-image`
fade was measured and does not touch the word: the letters span 18.1-81.9% of
the frame at desktop and 22.3-77.7% at mobile, against a fade over 0-10% and
90-100%. The mobile crop does not cut the word either. Both stay as they are.
An anti-aliased rewrite of the cell rendering was prototyped and is worse —
sub-pixel rect edges leave a visible seam through every dot. The existing
`putImageData` plus `image-rendering: pixelated` path is correct and stays.

### Everything else

- **Project rows.** `.n` is pushed onto the name's line with
  `align-self: start; padding-top: 0.35rem`, one constant against an offset
  that is not constant. Measured from font metrics, the numeral's cap top sits
  5.9px below the name's at 760px and 9.6px below at 1920px. Bounding boxes
  cannot see this — the two boxes start on the same line by construction — so
  the correction and its test both work in cap tops. The trailing arrow column
  is `auto`, so its width follows the glyph; with an `Icon` it becomes a fixed
  column and all five rows agree.
- **Contact.** The 2×2 grid is already a real hairline lattice — `gap: var(--rule)`
  over a `--hair` background. Mark its centre intersection with the existing
  `Crosshair` primitive, which is currently unused outside the kitchen sink.
- **About.** Left as it is. `Marginalia` in the gutter was specified here and
  then dropped during implementation: the only text it could carry is the
  section index, and the labelled rule two centimetres above it already reads
  `Idx_03 / About`.
- **Mobile.** A pass at 390px over all of the above, plus the project plate,
  which currently drops below the name at `max-width: 34rem` and takes a full
  block of vertical space per row.

Section order, section count and overall composition do not change. The page
reads well; the execution inside it is loose.

## 3. Removing the RPG

The Konami RPG comes out entirely: `src/scripts/rpg.js` (1280 lines), the
Matrix second world inside it, `src/scripts/konami.ts`, and everything that
exists only to feed them.

This is a net simplification well beyond the line count. The RPG reached into
the home page's markup for its collision model, which is why `Hero.astro`
carries an `id="home"` that means nothing to the hero, `ProjectIndex.astro`
tags the Cipherbound row with `data-rpg-spawn`, `black-hole.astro` carries a
comment forbidding a file rename, and `theme.spec.ts` asserts the existence of
`.site-header` on the home page. Four files constrained by a feature none of
them mention.

### Deleted

- `src/scripts/rpg.js`
- `src/scripts/konami.ts`
- `e2e/rpg.spec.ts`
- `public/sprites/girl_sheet.png` — the girl exists only in the RPG.

`public/sprites/player_sheet.png` **stays**: `worlds/cipherbound.css` uses it
for `.cb-sprite`, the sprite that walks the Cipherbound page's left margin.
That is a separate feature with its own animator in `worlds/cipherbound.ts`
and it is unaffected.

### Edited

- `src/pages/index.astro` — remove the `<script>` block importing `rpg.js` and
  `initKonami`, and the comment above it.
- `src/components/home/Hero.astro` — remove `id="home"` and the comment
  explaining why the RPG needed it.
- `src/components/home/ProjectIndex.astro` — remove `data-rpg-spawn` and the
  paragraph of the plate comment describing the RPG's hooks. The rest of that
  comment, about why every row gets a plate, stays.
- `src/pages/projects/black-hole.astro:23` — remove the comment requiring the
  filename `render.png`. The file keeps its name; nothing depends on it now.
- `e2e/home.spec.ts` — delete the `keeps the RPG hook selectors` test.
- `e2e/theme.spec.ts` — delete the `keeps .site-header for the RPG` test. The
  header's existence is covered by the tests that use it.
- `README.md` — rewrite the "Things that look incidental but are not" section.
  Two of its three bullets are about the RPG. What remains: the hero Game of
  Life converging to MARTIN at generation 276, and `--life-cell` being read by
  `life.ts`. The Game of Life bullet gains the generation readout, the
  still-life halt, and the fact that the `166%` overscale is derived from the
  word's 206-cell width rather than chosen by eye.

### Not affected

`test/dialogue.test.ts` covers `src/lib/dialogue.ts`, which drives the
Cipherbound page's dialogue box, not the RPG's. `src/lib/life.ts` and its
tests are touched only by the readout work in section 2.

## Verification

- `pnpm test` — `life.test.ts` gains the generation-counter assertion.
- `pnpm test:e2e` — the full suite, at one worker locally.
- `pnpm typecheck`, `pnpm lint`.
- `node scripts/check-contrast.mjs` — icons inherit `currentColor` so they
  cannot introduce a new colour, but the study companion checkbox border and
  the hero readout are new painted elements.
- `node scripts/check-links.mjs`.
- `SHOTS=1 pnpm test:e2e e2e/shots.spec.ts` at desktop and mobile, reviewed
  against the current `shots/` for the home page in all three themes.
- A grep for the ten glyphs, confirming none survive outside prose.
