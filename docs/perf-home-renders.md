# Performance of the home page renders

Measured 2026-08-06 against `pnpm build && pnpm preview`, Chromium via
Playwright/CDP on the dev workstation. Numbers are `Performance.getMetrics`
deltas over 8-second windows, normalised to milliseconds per wall-second, so
they read directly as percent of one core: 100 ms/s is 10%.

The page has three animated figures: the masthead orbital (Fig. 00, pure CSS),
the Game of Life board (Fig. 01, canvas on rAF), and the studies band (Fig. 05,
SVG on rAF).

## Headline

Everything holds 60fps with no dropped frames, on desktop and on a 4x-slowed
phone. The one real finding was that **the masthead orbital cost ~70 ms/s of
main thread permanently, including while off screen** — more than the studies
band costs while visible.

Worth keeping in proportion: 70 ms/s is about 1.3 ms of a 16.7 ms frame, and no
frame was ever dropped. As an absolute number it is ordinary for a site with a
deliberate animated centrepiece. What made it worth fixing was not its size but
that it was unconditional — paid at the bottom of the page, with the masthead a
full screen away, forever.

**Fixed** by pausing the figure off screen: `src/scripts/orbit.ts` toggles
`data-still` on `.orb` from an IntersectionObserver, and the CSS sets
`animation-play-state: paused`. Measured after: **0.5 ms/s off screen against
70.2 on**, saving 69.6 ms/s whenever you are anywhere else on the page. No
visual change, and the figure still runs with JavaScript off.

## Steady state, life board settled

| state                             | script | style | layout | main thread |
| --------------------------------- | -----: | ----: | -----: | ----------: |
| everything off screen (before)    |    0.0 |  16.0 |    3.2 |        64.8 |
| everything off screen (after)     |    0.0 |   0.0 |    0.0 |         0.5 |
| studies band on screen            |   32.2 |  16.9 |   12.3 |       122.4 |
| masthead on screen                |    0.0 |  18.0 |    3.7 |        70.2 |

Read down the first column: **both JavaScript loops stop dead when their figure
leaves the viewport.** The IntersectionObservers in `surface.ts` and the board's
own script do exactly what they claim — script time is 0.0 ms/s with nothing in
view.

Rows two against one: the entire off-screen baseline was the orbital, and it is
now gone.

Derived costs:

- studies band, while visible: **57.6 ms/s** (~5.8% of a core)
- masthead orbital, while visible: **~70 ms/s** (~7% of a core)
- either one, off screen: **~0 ms/s**

### Why the orbital costs what it does

It animates `--sweep`, a registered custom property, on 11 elements, and that
value feeds `offset-distance` and `stroke-dashoffset`. Custom-property
animations cannot be handed to the compositor: every frame the main thread has
to recalculate style for those elements and re-resolve both derived properties.
That shows up above as 16 ms/s of style recalc with nothing else running.

CSS animations also do not pause when their element scrolls out of view. The
board and the studies band both stop; the orbital does not, because nothing
tells it to.

### What the cheaper mechanics would have cost

The obvious next question is whether the animation itself can be made cheap.
Measured on this figure, at identical motion:

| change                                         | cost      |
| ---------------------------------------------- | --------- |
| today: `--sweep` custom property               | 76.7 ms/s |
| `offset-distance` + `stroke-dashoffset` direct | 60.7 ms/s |
| travellers on `transform` keyframes as well    | 51.4 ms/s |
| nothing animating                              | 0.4 ms/s  |

Broken down, with the arcs frozen so only the travellers move:

| travellers only                           | cost      |
| ----------------------------------------- | --------- |
| `offset-distance` via the custom property | 56.2 ms/s |
| `offset-distance` animated directly       | 49.7 ms/s |
| `transform: translate()` keyframes        | 1.8 ms/s  |

Three things came out of that:

- **The custom property is worth about 6 ms/s**, not the bulk of it. The bulk is
  that `offset-path` is resolved on the main thread every frame while a plain
  transform is not.
- **The trailing arcs are a floor.** `stroke-dashoffset` is a paint property and
  no CSS formulation hands it to the compositor. They cost ~45 ms/s however they
  are written. Only removing the sweep removes the cost.
- **The N-01 callout alone was 20 of the 28 ms/s** left after that, because it
  carries text and text repaints on every frame it moves. Six dots together were
  1.8.

So a figure with closed ellipses, transform-keyframe travellers and a parked
callout would run at about 1.8 ms/s. It was built and then reverted: it costs
the trailing arcs, the single-clock coupling that guarantees each arc ends
exactly on its traveller, and about 12 KiB of generated keyframes — a real
design trade for something only paid while the masthead is actually on screen.
Pausing gets the same saving everywhere else for none of it.

Layer promotion is not an option worth trying: `will-change` on `.orb` moved
26.8 against 26.5, i.e. nothing. SVG children are painted into the parent layer,
so there is no compositing to be had inside the figure.

## The studies band

| measure                                   | value    |
| ----------------------------------------- | -------- |
| polylines rewritten per frame             | 52       |
| points per frame                          | 1932     |
| `points` attribute text written per frame | 25.7 KiB |
| DOM-write half of one frame               | 0.12 ms  |
| script per frame at 60fps                 | ~0.54 ms |

The caching in `quantum.ts` is doing its job: screen x never moves for a mesh
point, so it is precomputed along with each mode's Bessel amplitude, and a frame
is five multiplications per point plus the string build. The string build, not
the physics and not the DOM, is the bulk of the 0.54 ms.

## The Game of Life board

Settling to generation 276 takes **11.9 s of wall time and 1370 ms of main
thread** — roughly 11% of a core while it runs, then it stops: 0.6 ms/s script
once settled. That is the intended behaviour, but it is the single largest
lump of work the page does.

## Under load

| condition                          |  fps | script | main thread |
| ---------------------------------- | ---: | -----: | ----------: |
| studies band, 4x CPU slowdown      | 60.0 |  129.8 |       470.5 |
| studies band, 6x CPU slowdown      | 59.9 |  182.9 |       692.3 |
| studies band, Pixel 7 viewport, 4x | 60.2 |  118.3 |       511.6 |

Still 60fps at 6x, with one frame over 20 ms across 8 seconds. At 6x the page is
using about 69% of the throttled core, which is where it would start to cost
battery on a genuinely slow phone — and most of that is the orbital, not the
band.

## Load

`TTFB 5 ms, DCL 34 ms, FCP 64–92 ms, CLS 0.0000`. HTML 28.7 KiB, CSS 15.3 KiB,
JS 4.5 KiB across 4 modules, fonts 54.5 KiB.

One caveat, recorded because it looked alarming and turned out not to be: the
very first page load after a cold browser process sometimes shows a ~1.4 s task
and FCP ~1.5 s, profiled to the life module. It reproduced on 1 of 3 fresh
browser launches and 1 of 5 fresh contexts, and never on a second navigation in
the same process. Nothing in the code runs only on a first load, so this reads
as V8 interpreting the simulation before the JIT warms up, plus first-run
renderer setup. Worth re-checking on real hardware, but it is not a code path.

## What is not worth changing

- The mesh density. 52 polylines at 0.54 ms/frame is not where the time goes.
- The board's settling cost. It is bounded, it stops, and it is the point of
  the figure.
- Anything about layout or paint. Layout is 3.2 ms/s at rest and CLS is zero.
- The orbital's animation mechanics. The measurements above are kept so nobody
  has to take them again, but 70 ms/s while you are looking at the figure is an
  ordinary price for it, and pausing it off screen removes the part that was
  not.
