/**
 * The black hole plate: a photon aimed just inside b_crit, drawn in along the
 * path it actually takes when its specimen is hovered, and retracted the same
 * way on the way out.
 *
 * This integrates nothing. Every point on the ray is computed at build time in
 * ProjectFigure.astro by the same lib/lensing.ts the project page runs on, and
 * all that happens here is choosing how much of the polyline is on screen.
 *
 * Why point prefixes rather than a dash offset, which is the usual way to draw
 * a line on:
 *
 * The sheet draws every stroke with `vector-effect: non-scaling-stroke`, so a
 * plate can be printed at any size without its line work getting heavier. That
 * moves dash arithmetic into screen space — the browser measures the dashes on
 * the *rendered* path — while `getTotalLength()` and `pathLength` both report
 * the path in viewBox units. At the size this plate ships, the two disagree by
 * about ten percent, which shows up twice: the reveal stops short of the
 * horizon, and the tail it never reached lands inside the next dash period and
 * is painted in the resting figure. Prefixes have no length arithmetic in
 * them, so they are simply immune to it.
 *
 * The ray ships whole, so the still is a correct and complete drawing with the
 * script blocked. It is retracted here before it is ever offered again.
 */

/**
 * Milliseconds per point. The ray is a few hundred points, which puts the
 * plunge at a little over half a second — longer than the other plates,
 * because a spiral that arrives too fast reads as a scribble rather than as a
 * ray running out of room.
 */
const MS_PER_POINT = 1.6;

function initCapture(): void {
  const path = document.querySelector<SVGPathElement>("[data-capture-ray]");
  if (!path) return;

  const points = (path.dataset.points ?? "")
    .split(" ")
    .filter(Boolean)
    .map((p) => p.split(","));
  if (points.length < 2) return;

  // The whole specimen is the target, so the ray answers to the same hover as
  // the heading and the index numeral beside it.
  const host = path.closest<HTMLElement>(".spec") ?? path;
  const last = points.length - 1;
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");

  const paint = (upto: number) => {
    let d = "";
    for (let i = 0; i <= upto; i++) {
      const p = points[i]!;
      d += `${i ? "L" : "M"}${p[0]} ${p[1]}`;
    }
    // One point is not a line, and an empty `d` is not a parse error.
    path.setAttribute("d", upto > 0 ? d : "");
  };

  let current = 0;
  let target = 0;
  let raf = 0;
  let previous = 0;

  const tick = (now: number) => {
    const dt = previous ? now - previous : MS_PER_POINT;
    previous = now;

    const distance = target - current;
    const stride = (dt / MS_PER_POINT) * Math.sign(distance);
    if (Math.abs(stride) >= Math.abs(distance)) {
      current = target;
      raf = 0;
      previous = 0;
      paint(current);
      return;
    }
    current += stride;
    paint(Math.round(current));
    raf = requestAnimationFrame(tick);
  };

  const play = (to: number) => {
    target = to;
    if (still.matches) {
      // No drawing in: land on the state asked for and stay there.
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      current = to;
      paint(to);
      return;
    }
    if (current === target) return;
    if (!raf) {
      previous = 0;
      raf = requestAnimationFrame(tick);
    }
  };

  /* A pointer that cannot hover can never ask for the ray back, and the
     specimen is a link, so a tap goes to the project rather than playing
     anything. On those devices the shipped still is the whole plate and this
     script has nothing to add — so it takes nothing away.

     The plate says which of the two it is either way. The sheet reads it to
     decide whether the "captured" label is the ray's to take with it: without
     that, a visitor who never gets the ray would be left with a plate that
     names something it does not draw. */
  const live = window.matchMedia("(hover: hover)").matches;
  path.ownerSVGElement?.setAttribute("data-capture", live ? "live" : "still");
  if (!live) return;

  // Demote the shipped still, which is the whole ray, down to nothing.
  paint(0);

  host.addEventListener("pointerenter", () => play(last));
  host.addEventListener("pointerleave", () => play(0));
  host.addEventListener("focusin", () => play(last));
  host.addEventListener("focusout", () => play(0));
}

initCapture();
