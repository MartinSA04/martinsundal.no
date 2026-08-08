# Cipherbound in a Game Boy Advance

**Date:** 2026-08-09
**Branch:** `redesign/micrographics`
**Status:** specified
**Surface:** `/projects/cipherbound/` — `src/pages/projects/cipherbound.astro`,
`src/worlds/cipherbound.css`, `src/worlds/cipherbound.ts`,
`src/content/projects/cipherbound.md`, plus a new console component and
re-cut video assets

## The idea

The trailer plays inside a real Game Boy Advance, and the page around it is
built out of Pokémon's own interface parts rather than dressed to resemble
them. Cipherbound is a Pokémon-like written in C++; the page should be the
thing it is about.

The page already gestured at this — pixel type, scanlines, a dialogue box, a
sprite walking the margin. What it lacked was the hardware and a real UI
grammar, and it was wearing the wrong decade's colours.

## What was wrong with the old palette

`#88c070` on `#101820` is the Game Boy DMG's green. Cipherbound is styled on
the GBA-era games, two hardware generations later, and the GBA screen is not
green. The page was quoting the wrong machine.

New tokens, Ruby/Sapphire/Emerald:

| Token | Value | What it is |
| --- | --- | --- |
| `sub` | `#d8ecc0` | overworld grass |
| `ink` | `#384058` | the games' navy text |
| `hair` | `#4868a8` | the text box's blue bevel |
| `sig` | `#c8302a` | the red accent |

`sig` is `#c8302a` and not the flatter `#d84038` because `--sig` is the link
colour in `project.css`. `#d84038` measures 4.46:1 on white, which misses AA
for body text; `#c8302a` gives 4.26:1 on the grass and 5.37:1 on a white
panel. `scripts/check-contrast.mjs` covers the token pairs, and its `sig`
threshold of 3.0 is the weaker constraint here — the binding one is the link
on a white box, which the script does not model because no other world puts
text on anything but `sub`.

Changing the tokens touches exactly three other places, all enumerated:
`src/content/projects/cipherbound.md` frontmatter, the swatch at
`src/pages/kitchen-sink.astro:179`, and the pinned `#88c070` in
`e2e/worlds.spec.ts:6`. The OG image regenerates from the tokens on its own.

## The console

### Asset

`Nintendo-Game-Boy-Advance-Purple-FL.png` from Wikimedia Commons — the
original AGB-001 in Indigo, photographed by Evan Amos for the Vanamo Online
Game Museum. 4200 × 2900, and the PNG carries a real alpha channel (measured
alpha mean 0.50), so it is a clean cutout rather than a white-matted photo.

Released **public domain** by the copyright holder: "I grant anyone the right
to use this work for any purpose, without any conditions." No attribution is
required. Provenance goes in a source comment regardless, because a fetched
asset with no recorded origin is a liability later.

Nintendo's trademarks on the hardware design are a separate matter from the
photograph's copyright. Showing the console on a page about a Pokémon-like
student project is ordinary editorial use; the page makes no claim of
affiliation and sells nothing.

Ships as AVIF and WebP at 1280w and 2560w. Generated with `convert` only —
no new tooling.

### Seating the video in the screen

The photograph is a three-quarter view, so the screen is a quadrilateral. Every
GBA shot Evan Amos took uses this same pose, and Commons has no straight-on
purple one, so a perspective fit is not a stylistic choice — it is the only
way to put a video in that screen.

Measured on a 1280 × 884 render by isolating the LCD's grey as a connected
component, the screen's corners are:

```
TL 505,215    TR 913,351    BR 786,599    BL 368,447
```

Edge lengths 430 × 279 = 1.54, which is the real 3:2 GBA panel. That the
measurement recovers the hardware's true aspect ratio is the check that it
found the screen and not a reflection.

The composite lives in a **fixed 1280 × 884 stage**. Everything inside it —
the photo, the screen element, the transform — is in those coordinates and
therefore exact. The stage is then scaled to the page by a single uniform
`transform: scale()` driven by container width, with `aspect-ratio` reserving
the height. Uniform scale composes cleanly with the perspective transform;
per-axis scaling would not.

The video sits in a 480 × 320 element (3:2, the panel's own ratio):

```css
transform-origin: 0 0;
transform: matrix3d(
   0.77006080,  0.25260090, 0, -0.000087557,
  -0.47032130,  0.67374520, 0, -0.000114664,
   0,           0,          1,  0,
   505,         215,        0,  1
);
```

This is the homography from the element's rect onto the measured quad. It
reproduces all four corners to the pixel; that verification is the acceptance
test for the transform.

**Considered and rejected:** de-skewing the photo to a straight-on view with
`convert -distort perspective`, which would make the screen a plain rectangle
and the CSS trivial. Rejected because the shell's shading, the button
highlights and the foreshortened sides all encode the original camera angle;
flattening only the outline leaves a photo that reads as wrong without the
viewer being able to say why.

### Size

The console scales with the page. It is not pinned to a size that would make
the video play near its native resolution — at typical widths the screen lands
around 350–450 px and the pixel art softens, which is what a small handheld
screen looks like. No lightbox, no expand-on-click. This drops a whole
interaction and its state.

## The video is re-cut

The shipped `trailer.mp4` is 1280 × 720. The source is **1024 × 770**, and the
16:9 crop that produced the current file clips the bottom of the game's own
dialogue box — a visible defect on the existing page, not only a problem for
this redesign.

Re-encode from `~/Videos/cipherbound_trailer.mp4` at native 1024 × 770, to
WebM/AV1 and MP4/H.264, matching the current pair's roles. Regenerate
`poster.avif` from the same source. `ffmpeg` capped at 2 threads.

1024 × 770 is 1.33, and the screen is 1.5, so the video letterboxes with bars
at left and right. The game already renders its overworld with black side bars
inside a full-width UI, and the LCD's surround is black, so the pillarbox is
not visible as a defect — it reads as a game not filling the screen, which is
what it is.

`e2e/work.spec.ts` asserts the facade shows `0:33` and that no video bytes
transfer before click. Duration is unchanged at 33.17 s, so the label stands,
and the facade stays a facade.

## The page

Reading order:

1. **Console** — hero, replacing the title block, in a wider container than
   the prose so the screen is worth looking at.
2. **Title and lede** — under the console.
3. **Dialogue box** — the existing five-line script, in a real Gen 3 text box.
4. **Prose.**
5. **Summary screen and links** — the two-up status row.

### The UI grammar

- **Text box.** The Gen 3 box is a white fill, a blue bevel, and a darker
  outline, with a bobbing cursor at the corner. This replaces `.cb-frame`'s
  stepped border as the page's box, and the dialogue box is its fullest use.
- **Summary screen.** `SpecBlock`'s `dl` becomes a stats panel — labels in
  the navy, values right-aligned, rules in the bevel blue.
- **Type badges.** The project's tags render as the rounded, uppercase pills
  the games use for types.
- **Menu cursor.** `ProjectLinks` gets a `▶` that sits in the left gutter of
  the focused or hovered row, the way a Pokémon menu marks selection.
- **Grass field.** The page substrate is a tiled grass pattern drawn in CSS
  gradients, not an image. Content sits on opaque panels above it, so the
  pattern never sits behind body text.
- **The sprite stays.** It is drawn from the game, and it now has grass to
  walk on.

### Fonts

Departure Mono stays. The actual Gen 3 fonts exist online only as ripped
game assets, which is not a licence, and Departure Mono is already shipped,
already licensed, and already the page's pixel face.

## Constraints this must not break

From `e2e/worlds.spec.ts`, which runs against every world:

- **No running animations under `prefers-reduced-motion: reduce`.** The
  cursor bob and any grass motion must stop, not merely shorten.
- **No horizontal overflow at 390 px.** The stage scales down; it does not
  clip.
- **Full content with JavaScript disabled.** The console is CSS over a
  server-rendered `<img>`, the first dialogue line is server-rendered, and the
  facade's poster and button are markup.

From `e2e/work.spec.ts`: the `0:33` label, and zero video bytes until click.

`e2e/a11y.spec.ts`, `e2e/kernel.spec.ts` and `e2e/seo.spec.ts` also cover this
route. `e2e/shots.spec.ts` regenerates `shots/{desktop,mobile}/cipherbound-*`.

## Acceptance

- The transform lands the screen element's four corners on the measured quad.
- `node scripts/check-contrast.mjs` passes with the new tokens.
- The re-cut trailer shows the game's dialogue box uncropped.
- The full Playwright suite passes, with `worlds.spec.ts` updated to the new
  `sig`.
- No horizontal overflow at 390 px; nothing animating under reduced motion.
