# The masthead orbital — findings

**Date:** 2026-08-06
**Branch:** `redesign/micrographics`
**Status:** built, uncommitted at time of writing
**Component:** `src/components/home/Masthead.astro`
**Follows:** `2026-08-05-home-plates-design.md`

Read this before touching FIG. 00. Most of what is below was arrived at by
trying the obvious thing first and watching it fail, and several of the failures
look correct in code review.

The reference sheets live in `docs/inspo/`, which is **gitignored** — they are
someone else's images and do not belong in the repo. If they are not on your
disk, ask for them before redesigning anything; the earlier specs cite them as
evidence and their absence is not a licence to guess. The one that matters for
this component is `macro.webp`, top-centre lockup, "ORBITAL SYNTHESIS / NODE
MAP".

## What the figure is

Six paths around one body, in three planes. Each path that is stroked is drawn
as the arc its traveller has just swept — not a closed ring — and the arc ends
exactly on its traveller. Two travellers carry no arc at all. A margin index
lists each path's identifier, plane, and period; a callout leader rides one
traveller and names it.

The authoritative numbers are the table in the component's own header comment.
Do not duplicate them here — they drifted once already this session, and a table
in two places is a table that is wrong in one of them.

## Design findings

### Concentric rings read as a logo

The original figure was three circles squashed to ellipses about a shared
centre, each with a node at uniform angular speed. Nothing about it said
"instrument". The fix is offset: every path's centre is displaced from the body,
so no two paths share a centre and the whole field is lopsided.

### The true focus is a trap

Placing the body on each ellipse's real focus is the geometrically honest
construction and it draws badly. The focal distance is `c = sqrt(rx² - ry²)`, so
the offset is a function of the flattening: at a plausible 1.45:1 the
eccentricity is forced to 0.73. At that eccentricity every path is an egg, and —
worse — every path's perihelion lands at the same small distance, so all six
dive to within ~24 units of the body at once and tangle in the one place the eye
goes.

Decoupling is what works: draw each path as a flattened ellipse and place the
body at an independent offset `k` from its centre. This costs the focus and buys
back both roundness and a clearing. The nearest path now clears the body by 14
units, and the clearing is visible in the axis ticks — none falls between 141
and 210.

### Three planes, not one

Uniform flattening across all paths reads as a single ring system seen from
directly above, however the paths are placed. Inclination has to vary, and
visibly: plane A is open at 1.45:1, B nearly edge-on at 2.94:1, C almost face-on
at 1.16:1, with tilts 36° and 66° apart.

The plane structure also solves crossings for free. Paths in the same plane
share a tilt and a side and nest strictly by **both** semi-axes, so they never
cross each other. Every crossing in the figure is therefore between planes,
which is what makes a crossing read as a crossing rather than as clutter.

Corollary: strict nesting by index is impossible once flattening varies, because
a round path and a flat path of similar `rx` must cross. Group by plane instead
of trying to nest all six.

### Arcs, not rings, and not all of them

Six closed rings is most of what makes the field look like a tangle; trailing
arcs put roughly half as much ink on it. The reference does not draw an arc per
node either — its called-out node is a lone dot with only its leader attached.
Two travellers here ride bare for the same reason, and the callout is on one of
them.

Four combinations were rendered before choosing which two go bare. Leaving the
called-out node attached loses the reference's isolated-marker effect; making
both large nodes bare goes too sparse.

### Ornament that encodes something

Two things in the figure are computed rather than drawn by eye, and both should
stay that way:

- **Periods follow Kepler's third law** against `rx` (`T ∝ rx^1.5`, normalised
  so the outermost runs 52s), and they are the animation's real durations. The
  index is therefore a true table rather than plausible-looking noise.
- **The axis ticks are the true crossings** — each tilted path solved
  numerically for where it meets `y = 118`.

Both are cheap to keep true and both are what stop the figure being decoration
pretending to be data. `scripts/` has no helper for this; the solver was a
throwaway script. Recreating it is ten lines of bisection over the parametrised
tilted ellipse.

### Motion

Travellers sweep rather than crawl: fast at perihelion, slow at aphelion, about
5:1 measured (2.4px to 11.4px per 250ms step on N-06). Two mirrored
cubic-beziers in the keyframes, deliberately chosen so the velocity at 100%
matches the velocity at 0% — otherwise the loop jerks once per revolution.

Linear motion along the path is what gave the first version its screensaver
quality. This is the single highest-value detail in the animation.

## Technical findings

### `--sweep` is the one clock

A registered custom property (`@property --sweep`, `syntax: "<number>"`) drives
both the traveller's `offset-distance` and the arc's `stroke-dashoffset`:

```css
.trail {
  stroke-dashoffset: calc(var(--tail) - var(--sweep));
}
.rides {
  offset-distance: calc(var(--sweep) * 1%);
}
```

Registration is what makes it interpolate smoothly instead of jumping at each
keyframe. Because both come off one value, the arc cannot drift from its node —
there is nothing to keep in sync by hand. This replaced two separate animations.

### `vector-effect: non-scaling-stroke` breaks `pathLength` dashing

**The bug that cost the most time.** With `non-scaling-stroke` the browser
strokes in device space while `pathLength` normalises the dash pattern in user
space. The two disagree by the render scale — 1.21× at 520px wide — which walks
every arc about a fifth of an orbit clear of its traveller and makes the dash
cycle repeat within one revolution.

Mapped, with `#` for inked and the traveller at the right edge:

```text
none                .....................#############################|
non-scaling-stroke  ............######...########################.....|
```

So `.trail` carries no `vector-effect`, which makes it the one rule in the file
inconsistent with the rest of the plate's hairline convention. `stroke-width:
0.85` lands near a 1px hairline at the desktop size and thins gracefully below.

### `offset-anchor` on a `<g>`

`offset-anchor` defaults to the element's `transform-origin`, which for a `<g>`
resolves against its own bounding box. The callout's box sits up and right of
where its leader starts, so it landed a leader's length off its traveller.
Pinning `transform-box: view-box; transform-origin: 0 0; offset-anchor: 0 0`
makes the offset a plain translate to the path point for every rider whatever
its shape.

`offset-rotate: 0deg` is also required, or the label tumbles round the orbit.

### Bake the tilt into the arc command

Each path's rotation lives in the arc command's `x-axis-rotation` parameter
(`A rx ry θ 1 1 …`), not in a wrapping `<g transform>`. That keeps every element
in one coordinate frame, which is what lets the callout ride the same
`offset-path` as its traveller and still hold its label upright. A `<g>` wrapper
would rotate the text with the orbit.

Reversing this is the sort of "tidy-up" that silently breaks the callout.

### Reduced motion is free if the base values are right

`kernel.css` collapses every animation to 0.001ms under
`prefers-reduced-motion`, which drops each rider back to its **declared**
`--sweep`. So the static arrangement is whatever the base declarations say.

Each `--sweep` is spread as widely as the paths allow — chosen by sampling every
path at 2% steps and maximising the minimum pairwise separation — and each
`animation-delay` is that value run back through the _inverse_ of the sweep
easing. The figure therefore loads in exactly the arrangement it falls back to.
N-01's is the one not chosen purely for spread: it is parked where its callout
has clear air, because that is the frame everyone sees first.

If you retime an orbit, the delay has to be re-derived or the load frame and the
reduced-motion frame diverge.

## Process findings

These cost real time and are not specific to this component.

### A test can pass on a broken render

The first version of the arc test computed where the arc _ought_ to end and
compared that to the node — pure geometry, never touching the rendered stroke.
It passed with a green tick while the trails were visibly detached on screen.

The replacement probes painted pixels with `elementFromPoint`. Getting it to
bite took two attempts: sampling 2–16% behind the node still passed on the
broken state, because the displacement only blanks the last ~10% and the wider
samples found ink either way. The band from 2–6% behind the node is the whole
signal — nearer than 2% is inside the traveller's own disc, which paints over
the arc.

**Verify a regression test against the broken state**, not just the fixed one.
Forcing `vector-effect` back on and re-running the predicate is what proved it.

`elementFromPoint` returns only the topmost element, so where two paths cross
the later sibling wins and the probed one reads as bare. Sample several points
and require one hit; for the negative case occlusion can only mask a hit, never
invent one, so requiring every sample to miss stays sound.

### `reuseExistingServer` bites both ways

`playwright.config.ts` sets `reuseExistingServer: !process.env.CI`. A local run
binds to whatever is already on 4321. This caused two distinct failures in one
session:

- A stale `astro preview` served an **old `dist`**, so a new test found zero
  elements and "failed" for the wrong reason.
- A leftover server **died mid-run**, giving four `ERR_CONNECTION_REFUSED`
  failures that looked like real breakage.

Before trusting a full-suite result, check nothing else holds 4321
(`ss -ltnp | grep 4321`). `CI=1 pnpm test:e2e --workers=2` makes Playwright own
the server's lifecycle; cap the workers, because `CI=1` otherwise uncorks one
per core on the machine the user is sitting at.

### Iterate by rendering candidates, not by reasoning

Every composition decision that mattered — which node goes bare, where the
callout parks, the trail lengths — was settled by rendering 4–6 variants into a
montage and looking. Reasoning about SVG geometry in the abstract was reliably
wrong. `convert`/`montage` are available; a Playwright script that mutates the
live DOM and screenshots is faster than editing, building, and looking.

## Constraints still in force

- Micrographics is an established contemporary style — the aesthetics of
  technical information. Not book or manuscript typography.
- The accent (`--sig`) is spent exactly twice on the whole page: the board's
  settle tick and the black hole's photon ring. The orbital uses none of it.
- `/work/` is built only from material Aker Solutions has published.
- Cap parallelism on anything that fans out. The user is on the same machine.
