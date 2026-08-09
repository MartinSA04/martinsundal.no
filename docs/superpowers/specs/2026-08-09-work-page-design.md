# /work — hazard placard

Design record for the 2026-08-09 rework. Supersedes the `/work` section of
`2026-08-05-site-rewrite-design.md`; the confidentiality constraint there still
applies and is tightened below.

## Why the old page was replaced

It was assembled almost entirely from Aker Solutions' published facts — a
stations-and-flow schematic, a capacity figure, a list of what the line
automates. Aker was therefore the grammatical subject of nearly every sentence
on a page that is supposed to be about Martin, which is what made it read as an
advert for the Verdal Production Line rather than as a description of his work.

## The constraint, restated

Martin cannot show anything from the job. The highlights video is the single
exception, and only because Aker published it themselves.

The site-rewrite spec listed excluded directories, which reads as "do not open
these files". The real rule is broader: **a clean figure of what the planner
does is still a figure of what the planner does.** Redrawing the pipeline —
seam detection, waypoint generation, planner stages — with no real numbers and
nothing copied does not launder it. That ruled out the obvious centrepiece.

What is left, and what the page is built from:

- Martin's own account of his role, which is his to write. Source:
  `docs/source-material.md`.
- Aker's published video, credited, linked to their own page.
- Hardware drawn as generic objects: an articulated arm, a teach pendant, a
  cable. None of it depicts anything the software does.

## World

Graphite substrate, safety yellow signal — the four tokens the page already
declared, spent rather than hinted at. The old page put yellow on a top border
over three facts and left it there.

The vocabulary is machine guarding, not draughtsmanship: chevron bands where the
rest of the site rules a hairline, a stencil-cut index, and hardware in solid
fills like the pictograms silkscreened on a cell fence. The home page is a
plotter sheet, so this one has to be unmistakably not that.

| | |
| --- | --- |
| Substrate | `#16181b` |
| Ink | `#eceef0` |
| Signal | `#f2c200` |
| Hairline | `#3c4046` |
| Placard face | Big Shoulders Display, 400–800, variable |
| Body / data | Archivo, IBM Plex Mono — already shipped |

Big Shoulders is the only new asset (35 kB). It is declared in `kernel.css` but
deliberately **not** preloaded in `Base.astro`: no other page paints it, and a
preload would cost every page a round trip for a face it never uses.

## Components

`src/components/work/`

- **`Pendant.astro`** — front elevation in a 610×296 viewBox. Seen flat the
  screen is an axis-aligned rectangle, which is the same reason `GbaConsole`
  uses an elevation: a three-quarter view would need a homography. Drawn from
  two figures in ABB's operating manual for OmniCore (3HAC065036) — "Main
  parts" on page 20 and "Hard buttons" on page 22 — so the layout is the
  device's rather than a plausible one:
  - One moulded lug halfway down the left edge carries both the connector and
    the emergency stop. The cable leaves it **sideways**, straight out through
    a ribbed strain relief, and only hangs downward once it is clear of the
    casing. The stop sits on the face beside it, straddling the edge.
  - Twelve hard buttons, two clusters of six in 3×2, above and below the
    joystick; joystick between them with a guard wing top and bottom; thumb
    button on the top shoulder; RFID mark on the left bezel.
  - The manual's own numbering says four of the twelve are programmable keys,
    which is why four carry nothing but a bar: on a pendant nobody has
    configured, they are blank.

  Casing and lug are one path. Laying the lug behind a plain rounded rectangle
  puts a seam down its middle where the casing's own edge stroke crosses it.
  **No maker's badge**, on the same reasoning the spec applies to Aker's mark,
  and the glyphs are generic marks — ABB's pictograms are ABB's drawings, so
  the keys with a function get a plain triangle or square.
- **`Arm.astro`** — base, three driven joints, torch. Three nested rotations
  about the joints they belong to. Each joint runs its own period and none
  divides another, so a row of arms never falls into step.
- **`Cable.astro`** + **`src/scripts/cable.ts`** — the run, described below.

`LineSchematic.astro` is deleted. `SpecBlock` and `Rule` stay; they are used by
the project pages.

### Why OmniCore and not IRC5

The first drawing was the IRC5 FlexPendant, and it is the wrong pendant for a
page whose picture is a video. That shell spends nearly half its width on a
keypad and a joystick bowl standing side by side, so the panel cannot get past
about 45% of the drawing however large the drawing is — and its 6.5" display is
4:3, so a 16:9 clip letterboxes inside what is left. Drawn honestly it made the
video *smaller* than the earlier, less accurate version had.

The OmniCore pendant is the current one and it is a widescreen slab: joystick
and hard buttons share one narrow spine down the right, and the display takes
58% of the drawing even with the wide left margin the cable needs. Same
manufacturer, same room, and the video comes out about half again as wide with
the block around it a fifth shorter. The panel is drawn
16:9 rather than its real 16:10, which is the one place the video wins over the
manual — at this size a 16:10 box would letterbox the clip for about four
pixels of accuracy.

## The cable

It leaves the gland on the pendant, jogs to the left rail, then serpentines:
down one side, across the gap between sections, down the other. Every section
ends up bracketed on two sides, so the run is the page's structure rather than
an ornament drawn beside it. It terminates plugged into the port on the
terminus, which is why `Base` is given `terminus` and the site footer is
suppressed.

**Measured, not authored.** `cable.ts` reads the box of every `[data-bay]` plus
the gland and the port, builds the polyline, and fillets the corners. Add a
paragraph and the run lengthens; add a section and it grows another bracket.
There is no second copy of the layout to keep in sync.

Layering, outermost first: a dark jacket, a lighter core inside it for a rim,
clamps, then three dashes for the pulse. All five share one `d`, so the signal
turns every corner the cable turns.

**One continuous run.** The connector is on the pendant's left edge, where the
manual puts it, and the drawing carries the first few inches of cable itself —
out of the boot and down to the bottom of its own box, where the gland sits. So
the run starts on the left and the rails alternate left-first. The stub is
stroked `vector-effect: non-scaling-stroke` at the run's own 11px and 6px:
without it the drawn cable would only match the routed one at a single viewport
width, since the pendant scales and the run does not.

**Degradation.** Without JavaScript the sections lay out and read normally and
the SVG stays empty — the page loses its cable, not its content.

## Two bugs worth not repeating

**`calc(var(--x) - 100)` in a keyframe parses but will not interpolate.** The
dash offsets sat at their 0% value forever and the pulse never left the pendant,
while `opacity` in the same keyframes animated fine, so it looked like a
styling problem rather than a dead animation. The offsets are literals now.

**The comet has to be built so all three dashes *end* together.** Offset the
other way and the white tip trails the glow, which reads as a pulse travelling
backwards up its own cable.

## The poster and `decoding="sync"`

`VideoFacade` now decodes its poster synchronously. Inside the pendant the play
badge carries a `backdrop-filter`, making a composited layer whose backdrop is
the poster; decoded asynchronously the image landed after that layer was painted
and nothing invalidated it, so the screen stayed on the facade's black
background until an unrelated style change forced a repaint. Every probe that
touched any style fixed it, which is the signature of a stale paint rather than
a layout fault. Both pages using the facade put it above the fold, so there was
nothing to defer.

## Copy

Written from `docs/source-material.md`.

**The planner is not his to own.** A first draft headlined the page "I write the
welding planner", which claims sole authorship of something a team builds. It
reads now as "I work on the welding planner", and the lede puts the team first:
they own the line's software and he is one of them. `source-material.md` says
both things — the planner is the main thing he works on, *and* he is part of a
small tech team responsible for the whole line — and only the second half
survived the first draft's phrasing. The meta description and the JSON-LD
`WebPage` description carried the same claim and were corrected with it.

**No confidentiality note on the page.** A draft closed with a section
explaining that the drawings are generic and nothing comes off the floor in
Verdal. A visitor has no reason to care which assets are Aker's, and saying it
out loud was a note-to-self printed on the page. The constraint still governs
what is on the page; it just is not narrated there. The closing band is now the
arms alone, with no heading and no caption.

## Scale

The pendant is the page's picture, and it breaks the sheet to be it.
`Pendant.astro` imposes no `max-width` of its own — how big it is drawn is the
page's decision — and `.rig` makes that decision at
`min(100vw - 3rem, 112rem)`, which is wider than the 78rem sheet. The article
carries `overflow-x: clip` so the viewport is what stops it. The margin is
tighter than the page's own gutter and the ceiling higher than it would
otherwise need to be, because the drawing spends a wide margin of its own on
the left for the cable and has to run further to put the same number of pixels
in the screen. On a 1600px window the video comes out about 896px across,
against 634px when the drawing was held to the sheet.

Two layout rules follow from that:

- The `.kit` grid is `minmax(0, 1fr)`, not the implicit `auto` track. An auto
  track sizes to its widest item, which is the pendant, which dragged the
  credit line out to the drawing's width and off the side of a phone.
- `.rig` centres on symmetric negative margins rather than
  `justify-self: center`. A grid item wider than its own track resolves `center`
  to `start` instead of overflowing both edges, which parks the drawing against
  the left rail and hangs the rest off the right of the viewport. The masthead
  bay takes even padding for the same reason: the track has to be centred for
  the margins to be equal.

Below 38rem the drawing anchors left and runs off the right edge instead, the
trick Cipherbound plays with the console. Its width there is
`calc(100% / 0.784)`, where 0.784 is where the display's right edge falls
across the drawing: that scales the pendant until that edge lands exactly on
the column's, which is the largest the video can be with none of it cropped.
Only the spine goes off the side. Cipherbound can use a fixed width because its
screen is centred in the console; here a fixed width cannot do the job, since
the one that fits a 320px phone would waste half of a 500px one.

The masthead bay keeps a rail's worth of padding on its left at narrow widths.
The run leaves the gland at the drawing's left edge, and with the base padding
it came down straight through the credit line under the pendant.

Aker burned captions into the bottom left of the video, which is the corner
`VideoFacade` parks its play control in, so the two sat on top of each other.
`work.css` centres the control, which is the same fix Cipherbound needs where
the game draws its text box.

Checked against the AI-writing tells in `docs/source-material.md` — no
paragraph-ending zingers, no manufactured origin story, no not-X-but-Y, no
rule-of-three lists, varied sentence length, and the prose does not restate the
readouts next to it.

## What e2e pins

`e2e/work.spec.ts` is unchanged and still passes. It holds the video to zero
transferred bytes before a click, the facade to one labelled keyboard-reachable
button, the page to exactly one link to Aker's Verdal page, the JSON-LD
`VideoObject` to Aker as copyright holder, and the body to no "10x faster" or
"opened 2024" claim.
