# Cipherbound in a Game Boy Advance

**Date:** 2026-08-09
**Branch:** `redesign/micrographics`
**Status:** **built 2026-08-09**
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

A front elevation of the Indigo AGB-001 by blueamnesiac, supplied for this
page. 1181 × 677, surround already transparent.

It arrived with a screenshot of somebody else's game drawn on the screen. The
shipped copy has that rectangle painted flat black, so none of that game
survives and any edge the video does not reach reads as screen rather than as
a seam. Ships as AVIF (22 KB) and WebP (38 KB), generated with `convert` only.

Nintendo's trademarks on the hardware design are a separate matter from the
artwork's copyright. Showing the console on a page about a Pokémon-like
student project is ordinary editorial use; the page makes no claim of
affiliation and sells nothing.

### Seating the video in the screen

A front elevation makes the screen an **axis-aligned rectangle**, so the slot
is a plain box at measured coordinates and the video is never skewed. That is
the whole reason to prefer this artwork.

Measured on the supplied file by taking the black window as a connected
component: **522 × 353 at (330, 127)**. Ratio 1.479 against the real panel's
1.5, so the drawing is honest about its proportions and the video needs no
correction to sit in it.

Everything lives in a fixed 1181 × 677 stage, where all of it is exact, and
the stage is scaled to the page by one uniform `transform: scale()` driven by
container width, with `aspect-ratio` reserving the height.

### Why not a photograph

The first build used Evan Amos's public-domain photograph of the same console.
It is a three-quarter view, so the screen was a quadrilateral and the video
had to be projected onto it with a homography — legible, but the trailer was
visibly slanted.

Searching for a front-elevation replacement came up empty: all 72 files in
Commons' Game Boy Advance category (enumerated via the API), Openverse by
licence, Flickr's CC pool and Unsplash. The near misses were a CC BY-SA photo
by gekkio whose grey backdrop cannot be keyed out — the lighting on the upper
shell matches the background — and which is 17% vertically compressed anyway
(circles render as 116 × 96 ellipses, a ~34° camera tilt); a Commons cutout
that is front-on but white and ragged; and a crude hand-drawn purple vector.

Rectifying the perspective photo with `convert -distort perspective` was tried
and rejected on sight: it smears the bottom edge into a band and squashes the
shell, because the shading and the foreshortened sides encode the original
camera angle and flattening only the outline leaves an image that reads as
wrong.

### Size

The console scales with the page. It is not pinned to a size that would make
the video play near its native resolution — at typical widths the pixel art
softens, which is what a small handheld screen looks like. No lightbox, no
expand-on-click. This drops a whole interaction and its state.

The artwork is 1181 px wide and the console is drawn at up to 1088 CSS px, so
it is never upscaled on a 1× display. On a 2× display there is no denser
source to draw from and it will be correspondingly soft.

### On a phone

The shell is more than twice as wide as its own screen, so fitting the whole
console to the viewport spends the display on plastic — the screen came out
149 px wide. Below 48rem the console holds a constant width and runs off both
edges instead, cropping the D-pad and the buttons: **304 px**, and constant
from 320 px up to the breakpoint. The hero clips, so nothing reaches the
document.

The constant is 43rem because that is the width the console already has at the
breakpoint, so it does not jump size as the viewport crosses it.

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

## Found while building

**The capture harness was racing the decode.** `e2e/shots.spec.ts` only called
`decode()` on images that were not yet `complete`, but `complete` means the
bytes arrived, not that a frame is ready to paint. The console is a large AVIF
and lost that race often enough to capture as an empty box — three consecutive
runs, two of them broken. It now decodes every image and waits two animation
frames. This was a pre-existing weakness in the harness, not something the
console introduced; the console is just the first asset heavy enough to expose
it.

**The play control cannot scale with the console.** Drawn at stage size it is
~17px across on a phone, where the console renders at roughly a quarter of its
authored width: legible on a desktop and invisible on the device most likely
to see it. It is divided by the stage's own scale factor so it holds a fixed
apparent size, growing relative to the screen as the console shrinks — which is
what a game's own UI does anyway. The facade also defaults to putting it in the
bottom-left corner, which is exactly where the game draws its text box, so
inside the console it is centred instead.

## The sprite

It walks the page on its own: pick a heading, hold it a while, stop and look
around, pick another. Headings that would walk into an edge are dropped rather
than clamped, so it turns before it arrives instead of scuffing along the
boundary. It is positioned in the page rather than the viewport and painted
under the text boxes, so it passes behind them and comes out the other side.

The first version was driven by scroll — it animated only while the wheel was
turning and otherwise sat at a fixed viewport position, which reads as a decal
being dragged down the page rather than as something walking, because nothing
about it was ever going anywhere.

The stylesheet hides it below 72rem, where the reading column fills the page
and it would spend its whole life behind a box, and the frame loop does not
run at those widths.

## Acceptance

- The video sits square in the screen with no transform on it.
- `node scripts/check-contrast.mjs` passes with the new tokens.
- The re-cut trailer shows the game's dialogue box uncropped.
- The full Playwright suite passes, with `worlds.spec.ts` updated to the new
  `sig`.
- No horizontal overflow at 390 px; nothing animating under reduced motion.
