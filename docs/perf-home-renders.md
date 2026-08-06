# Performance of the home page renders

Measured 2026-08-06 against `pnpm build && pnpm preview`, Chromium via
Playwright/CDP on the dev workstation. Numbers are `Performance.getMetrics`
deltas over 8-second windows, normalised to milliseconds per wall-second, so
they read directly as percent of one core: 100 ms/s is 10%.

The page has three animated figures: the masthead orbital (Fig. 00, pure CSS),
the Game of Life board (Fig. 01, canvas on rAF), and the studies band (Fig. 05,
SVG on rAF).

## Headline

Everything holds 60fps with no dropped frames, on desktop and on a
4x-slowed phone. The one real finding is that **the masthead orbital costs
~64 ms/s of main thread permanently, including while it is off screen**, which
is more than the studies band costs while it is on screen.

## Steady state, life board settled

| state                            | script | style | layout | main thread |
| -------------------------------- | -----: | ----: | -----: | ----------: |
| everything off screen            |    0.0 |  16.0 |    3.2 |        64.8 |
| studies band on screen           |   32.2 |  16.9 |   12.3 |       122.4 |
| everything off, orbital stopped  |    0.0 |   0.0 |    0.0 |         0.4 |

Read down the first column: **both JavaScript loops stop dead when their figure
leaves the viewport.** The IntersectionObservers in `surface.ts` and the board's
own script do exactly what they claim — script time is 0.0 ms/s with nothing in
view.

Read the last row against the first: with the orbital's animations stopped the
page goes completely quiet, 0.4 ms/s. So the entire 64.8 ms/s baseline is the
orbital, and it is paid whether or not the masthead is anywhere near the screen.

Derived costs:

- studies band, while visible: **57.6 ms/s** (~5.8% of a core)
- masthead orbital: **64.4 ms/s** (~6.4% of a core), never pausing

### Why the orbital costs what it does

It animates `--sweep`, a registered custom property, on 11 elements, and that
value feeds `offset-distance` and `stroke-dashoffset`. Custom-property
animations cannot be handed to the compositor: every frame the main thread has
to recalculate style for those elements and re-resolve both derived properties.
That shows up above as 16 ms/s of style recalc with nothing else running.

CSS animations also do not pause when their element scrolls out of view. The
board and the studies band both stop; the orbital does not, because nothing
tells it to.

**The fix is small and invisible:** an IntersectionObserver on the masthead that
sets `animation-play-state: paused` on `.orb .trail, .orb .rides` when it leaves
the viewport. That would take the whole-page idle cost from 64.8 to ~0.4 ms/s.

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
