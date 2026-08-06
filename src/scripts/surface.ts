/**
 * Drives Fig. 05 — the wavefunction surface and the Bloch sphere.
 *
 * The band is already correct when this runs: Studies.astro rendered the τ = 0
 * frame on the server from the same functions in src/lib/quantum.ts. So there
 * is nothing to build here and nothing to tear down — this only advances the
 * frame, and every early return below leaves a figure that is still true, just
 * still.
 *
 * Two things keep it cheap. The mesh geometry is cached in quantum.ts, so a
 * frame is a few thousand multiplications rather than fourteen thousand calls
 * to sin. And an IntersectionObserver stops the loop whenever the band is off
 * screen, which for a figure this far down the page is most of the time.
 */
import { blochFrame, meshPoints, tauAt } from "../lib/quantum.ts";

const band = document.querySelector<HTMLElement>("[data-surface]");
if (band) {
  const lines = [
    ...band.querySelectorAll<SVGPolylineElement>(".mesh polyline"),
  ];
  const vec = band.querySelector<SVGLineElement>("[data-vec]");
  const drop = band.querySelector<SVGLineElement>("[data-drop]");
  const tip = band.querySelector<SVGCircleElement>("[data-tip]");

  const still = window.matchMedia("(prefers-reduced-motion: reduce)");

  let frame = 0;
  let origin = 0;
  let visible = false;

  const draw = (seconds: number) => {
    const points = meshPoints(tauAt(seconds));
    for (let i = 0; i < lines.length && i < points.length; i++) {
      lines[i].setAttribute("points", points[i]);
    }

    const b = blochFrame(seconds);
    vec?.setAttribute("x2", String(b.tip[0]));
    vec?.setAttribute("y2", String(b.tip[1]));
    drop?.setAttribute("x1", String(b.tip[0]));
    drop?.setAttribute("y1", String(b.tip[1]));
    drop?.setAttribute("x2", String(b.foot[0]));
    drop?.setAttribute("y2", String(b.foot[1]));
    tip?.setAttribute("cx", String(b.tip[0]));
    tip?.setAttribute("cy", String(b.tip[1]));

    for (const el of [vec, tip]) {
      if (!el) continue;
      if (b.behind) el.setAttribute("data-behind", "");
      else el.removeAttribute("data-behind");
    }
  };

  const tick = (now: number) => {
    /* The clock starts when the band first comes into view rather than at load,
       so it is always seen from τ = 0 — the frame the server drew and the one
       the composition was set on. */
    if (!origin) origin = now;
    draw((now - origin) / 1000);
    frame = requestAnimationFrame(tick);
  };

  const start = () => {
    if (frame || still.matches) return;
    frame = requestAnimationFrame(tick);
  };

  const stop = () => {
    if (!frame) return;
    cancelAnimationFrame(frame);
    frame = 0;
    /* Drop the clock rather than banking it. The state is periodic and nobody
       is timing it, so resuming from τ = 0 costs nothing and buys the same
       opening frame every time the band is scrolled back to. */
    origin = 0;
  };

  new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      if (visible) start();
      else stop();
    },
    { rootMargin: "120px" },
  ).observe(band);

  /* A change of preference mid-session settles the figure without a reload —
     and settles it on a real frame, not a blank one. */
  still.addEventListener("change", () => {
    if (still.matches) stop();
    else if (visible) start();
  });
}
