/**
 * Routes the pendant cable down the work page.
 *
 * The DOM owns the geometry. Every measurement comes from a real element —
 * [data-cable-page] for the sheet, [data-bay] for each section, and the gland
 * and port for the two ends — so moving anything in the markup moves the run
 * with it and there is no second copy of the layout to keep in step.
 *
 * See Cable.astro for what the five paths are and why the dashes are offset
 * the way they are.
 */

/** Corner fillet, in px. */
const R = 28;
/** How far the run drops out of the gland before it turns for its rail. */
const DROP = 44;
/** Spacing between clamps, in px along the path. */
const TIE = 108;
/**
 * How far the rails sit inside the section edges. Run flush and the outer half
 * of an 11px jacket hangs past the sheet, where the page's own clip takes it
 * off and the cable looks sawn down its length.
 */
const INSET = 16;

type Pt = [number, number];

/**
 * Polyline to path data, with every interior corner filleted by a quadratic.
 * Each cut-back is capped at half its own leg, so two fillets meeting on a
 * short segment can never overrun each other and fold the run back on itself.
 */
function fillet(pts: Pt[], r: number): string {
  let d = `M${pts[0]![0]} ${pts[0]![1]}`;

  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i]!;
    const [px, py] = pts[i - 1]!;
    const [nx, ny] = pts[i + 1]!;
    const d1 = Math.hypot(x - px, y - py);
    const d2 = Math.hypot(nx - x, ny - y);
    if (d1 < 0.5 || d2 < 0.5) continue;

    const r1 = Math.min(r, d1 / 2);
    const r2 = Math.min(r, d2 / 2);
    d +=
      `L${x - ((x - px) / d1) * r1} ${y - ((y - py) / d1) * r1}` +
      `Q${x} ${y} ${x + ((nx - x) / d2) * r2} ${y + ((ny - y) / d2) * r2}`;
  }

  const last = pts[pts.length - 1]!;
  return `${d}L${last[0]} ${last[1]}`;
}

export function routeCable(): void {
  const page = document.querySelector<HTMLElement>("[data-cable-page]");
  const svg = page?.querySelector<SVGSVGElement>(".cable");
  const start = page?.querySelector<HTMLElement>("[data-cable-start]");
  const end = page?.querySelector<HTMLElement>("[data-cable-end]");
  if (!page || !svg || !start || !end) return;

  const bays = [...page.querySelectorAll<HTMLElement>("[data-bay]")];
  if (!bays.length) return;

  const jacket = svg.querySelector<SVGPathElement>(".cab-jacket")!;
  const strokes = [
    ...svg.querySelectorAll<SVGPathElement>(
      ".cab-jacket,.cab-core,.cab-glow,.cab-sig,.cab-tip",
    ),
  ];
  const ties = svg.querySelector<SVGGElement>(".cab-ties")!;

  const rel = (el: Element) => {
    const p = page.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    return {
      l: b.left - p.left,
      t: b.top - p.top,
      r: b.right - p.left,
      b: b.bottom - p.top,
      cx: b.left - p.left + b.width / 2,
    };
  };

  function build() {
    const box = page!.getBoundingClientRect();
    if (!box.width) return;
    svg!.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);

    const s = rel(start!);
    const e = rel(end!);
    const rects = bays.map(rel);

    const XL = Math.min(...rects.map((b) => b.l)) + INSET;
    const XR = Math.max(...rects.map((b) => b.r)) - INSET;

    /* The left rail first, because the connector is on the pendant's left edge
       and its stub already comes down on that side: the run reaches its rail in
       a short jog instead of crossing back under the drawing. */
    const side = rects.map((_, i) => (i % 2 === 0 ? XL : XR));

    const pts: Pt[] = [
      [s.cx, s.b],
      [s.cx, s.b + DROP],
      [side[0]!, s.b + DROP],
    ];
    rects.forEach((b, i) => {
      pts.push([side[i]!, b.b]);
      pts.push([i + 1 < side.length ? side[i + 1]! : e.cx, b.b]);
    });
    pts.push([e.cx, e.t]);

    const d = fillet(pts, R);
    strokes.forEach((p) => p.setAttribute("d", d));

    /* Clamps, kept off the bends: samples either side of a candidate have to
       agree on the tangent, otherwise the run is turning there and a clamp
       would sit on the curve instead of across a straight. */
    const total = jacket.getTotalLength();
    const marks: string[] = [];
    for (let l = TIE; l < total - TIE * 0.4; l += TIE) {
      const a = jacket.getPointAtLength(l - 8);
      const b = jacket.getPointAtLength(l + 8);
      const a2 = jacket.getPointAtLength(l - 20);
      const b2 = jacket.getPointAtLength(l + 20);
      const t1 = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
      const t2 = (Math.atan2(b2.y - a2.y, b2.x - a2.x) * 180) / Math.PI;
      if (Math.abs(t1 - t2) > 5) continue;

      const m = jacket.getPointAtLength(l);
      marks.push(
        `<rect x="${m.x - 4.5}" y="${m.y - 10}" width="9" height="20" rx="2" ` +
          `transform="rotate(${t1} ${m.x} ${m.y})"></rect>`,
      );
    }
    ties.innerHTML = marks.join("");
  }

  build();

  /* Reflow moves every box the run is measured from, so the run is rebuilt
     from the same observer the layout answers to rather than from a timer. */
  /* `typeof`, not `"ResizeObserver" in window`: the `in` check narrows the type
     of `window` itself, and in the else branch it lands on `never`. */
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => build());
    ro.observe(page);
    bays.forEach((b) => ro.observe(b));
  } else {
    window.addEventListener("resize", build);
  }

  /* The placard face is loaded with font-display:swap, so the headline reflows
     when it lands and every bay below it shifts. */
  document.fonts?.ready.then(build);
}
