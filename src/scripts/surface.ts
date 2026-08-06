/**
 * Drives Fig. 05 — the quantum corral and the Bloch sphere.
 *
 * The band is already correct when this runs: Studies.astro rendered the t = 0
 * frame on the server from the same functions in src/lib/quantum.ts. So there
 * is nothing to build here and nothing to tear down — this only advances the
 * frame, and every early return below leaves a figure that is still true, just
 * still.
 *
 * Two things keep it cheap. Screen x never moves for a mesh point — the pattern
 * rotates, the geometry does not — so quantum.ts caches it along with the mode
 * amplitude, and a frame is a couple of multiplications per point. And an
 * IntersectionObserver stops the loop whenever the band is off screen, which
 * for a figure this far down the page is most of the time.
 */
import { blochFrame, meshPoints, phaseAt } from "../lib/quantum.ts";

const band = document.querySelector<HTMLElement>("[data-surface]");
if (band) {
  const lines = [
    ...band.querySelectorAll<SVGPolylineElement>(".mesh polyline"),
  ];

  const pick = <T extends Element>(sel: string) => band.querySelector<T>(sel);
  const vec = pick<SVGLineElement>("[data-vec]");
  const drop = pick<SVGLineElement>("[data-drop]");
  const radius = pick<SVGLineElement>("[data-radius]");
  const tip = pick<SVGCircleElement>("[data-tip]");
  const arrow = pick<SVGPolylineElement>("[data-head]");
  const thetaArc = pick<SVGPolylineElement>("[data-theta-arc]");
  const phiArc = pick<SVGPolylineElement>("[data-phi-arc]");
  const thetaLabel = pick<SVGTextElement>("[data-theta-label]");
  const phiLabel = pick<SVGTextElement>("[data-phi-label]");
  const stateLabel = pick<SVGTextElement>("[data-state-label]");

  const still = window.matchMedia("(prefers-reduced-motion: reduce)");

  let frame = 0;
  let origin = 0;
  let visible = false;

  const at = (el: Element | null, name: string, value: number) =>
    el?.setAttribute(name, value.toFixed(2));

  const draw = (seconds: number) => {
    const points = meshPoints(phaseAt(seconds));
    for (let i = 0; i < lines.length && i < points.length; i++) {
      lines[i]!.setAttribute("points", points[i]!);
    }

    const b = blochFrame(seconds);
    at(vec, "x2", b.tip[0]);
    at(vec, "y2", b.tip[1]);
    at(drop, "x1", b.tip[0]);
    at(drop, "y1", b.tip[1]);
    at(drop, "x2", b.foot[0]);
    at(drop, "y2", b.foot[1]);
    at(radius, "x2", b.foot[0]);
    at(radius, "y2", b.foot[1]);
    at(tip, "cx", b.tip[0]);
    at(tip, "cy", b.tip[1]);
    arrow?.setAttribute("points", b.head);
    thetaArc?.setAttribute("points", b.thetaArc);
    phiArc?.setAttribute("points", b.phiArc);
    at(thetaLabel, "x", b.thetaLabel[0]);
    at(thetaLabel, "y", b.thetaLabel[1]);
    at(phiLabel, "x", b.phiLabel[0]);
    at(phiLabel, "y", b.phiLabel[1]);
    at(stateLabel, "x", b.stateLabel[0]);
    at(stateLabel, "y", b.stateLabel[1]);

    for (const el of [vec, tip, arrow]) {
      if (!el) continue;
      if (b.behind) el.setAttribute("data-behind", "");
      else el.removeAttribute("data-behind");
    }
  };

  const tick = (now: number) => {
    /* The clock starts when the band first comes into view rather than at load,
       so it is always seen from the frame the server drew and the composition
       was set on. */
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
       is timing it, so resuming from the opening frame costs nothing and buys
       the same first impression every time the band is scrolled back to. */
    origin = 0;
  };

  new IntersectionObserver(
    (entries) => {
      visible = entries[0]!.isIntersecting;
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
