/**
 * Turns Fig. 06's globe.
 *
 * The figure ships whole: Contact.astro renders it from src/lib/globe.ts at the
 * opening longitude, so with this script missing or blocked the plate carries a
 * correct globe that simply does not turn. Nothing below builds any DOM — it
 * takes over the meridians the server already drew and rewrites their `d`.
 *
 * Only the meridians move. A circle of latitude is symmetric about the polar
 * axis, so every parallel, the limb, the axis and both poles are drawn once and
 * never touched again; see the note in src/lib/globe.ts for why. That is 24
 * lines a frame instead of 35, and with the paths preallocated at
 * MERIDIAN_SLOTS apiece there is nothing to allocate or garbage-collect either.
 * Measured at about half a millisecond a frame.
 *
 * Like the node map, this stops when nobody is looking at it — the loop is not
 * started until the zone is on screen and is cancelled the moment it leaves.
 * Unlike the node map it cannot be paused by CSS, because it is not a CSS
 * animation, so the observer owns the loop itself.
 */
import {
  MERIDIANS,
  MERIDIAN_SLOTS,
  crosshair,
  leader,
  longitudeAt,
  meridianRuns,
  originAt,
} from "../lib/globe.ts";

const zone = document.querySelector<HTMLElement>("[data-globe]");

if (zone) {
  const meridians = zone.querySelectorAll<SVGPathElement>("[data-mer]");
  const cross = zone.querySelector<SVGPathElement>("[data-origin-cross]");
  const dot = zone.querySelector<SVGCircleElement>("[data-origin-dot]");
  const ring = zone.querySelector<SVGCircleElement>("[data-origin-ring]");
  const lead = zone.querySelector<SVGPathElement>("[data-lead]");
  const head = zone.querySelector<SVGPathElement>("[data-lead-head]");

  const ready =
    meridians.length === MERIDIANS * MERIDIAN_SLOTS &&
    cross &&
    dot &&
    ring &&
    lead &&
    head;

  /* A visitor who has asked for less motion gets the plate as rendered, which
     is already a correct drawing. kernel.css collapses CSS durations site-wide
     but has no say over a script, so this is the one place that has to ask. */
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (ready && !still) {
    const draw = (lon0: number) => {
      for (let k = 0; k < MERIDIANS; k++) {
        const runs = meridianRuns(k, lon0);
        for (let j = 0; j < MERIDIAN_SLOTS; j++) {
          const path = meridians[k * MERIDIAN_SLOTS + j]!;
          const run = runs[j];
          if (run) {
            path.setAttribute("d", run.d);
            path.setAttribute("class", run.front ? "h" : "d");
          } else if (path.getAttribute("d")) path.setAttribute("d", "");
        }
      }

      /* The origin spends part of every turn on the far side. It is not hidden
         when it gets there: the crosshair and the filled point give way to a
         hollow ring, the way Fig. 05b dashes the equator behind the sphere. */
      const p = originAt(lon0);
      if (p.front) {
        cross.setAttribute("d", crosshair(p));
        dot.setAttribute("cx", String(p.x));
        dot.setAttribute("cy", String(p.y));
        dot.setAttribute("r", "3.2");
        ring.setAttribute("r", "0");
      } else {
        cross.setAttribute("d", "");
        dot.setAttribute("r", "0");
        ring.setAttribute("cx", String(p.x));
        ring.setAttribute("cy", String(p.y));
        ring.setAttribute("r", "4.4");
      }

      const { line, head: tip } = leader(p);
      lead.setAttribute("d", line);
      head.setAttribute("d", tip);
    };

    let raf = 0;
    /* Seconds the figure has actually been watched, not seconds since load.
       Time spent off screen is never added, so scrolling back finds the globe
       where it was left rather than snapped round to the opening longitude —
       the same thing pausing a CSS animation does for the node map. */
    let watched = 0;
    let last = 0;

    const frame = (t: number) => {
      if (last) watched += (t - last) / 1000;
      last = t;
      draw(longitudeAt(watched));
      raf = requestAnimationFrame(frame);
    };

    new IntersectionObserver(
      (entries) => {
        const on = entries[0]!.isIntersecting;
        if (on && !raf) {
          /* Drop the stale timestamp so the gap is not billed to the clock. */
          last = 0;
          raf = requestAnimationFrame(frame);
        } else if (!on && raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { rootMargin: "150px" },
    ).observe(zone);
  }
}
