/**
 * The two figures in Fig. 05, as numbers.
 *
 * --- the surface -----------------------------------------------------------
 *
 * A particle in a circular infinite well — a quantum corral, the thing an STM
 * builds out of a ring of adatoms. Separating the Schrodinger equation in polar
 * coordinates gives
 *
 *     psi(r, th, t) = J_m(j_mn * r) * e^(i*m*th) * e^(-i*E*t)
 *
 * where J_m is the Bessel function of the first kind and j_mn is its n-th zero,
 * which is what forces psi to vanish on the wall at r = 1. The drawn height is
 * the real part of the (m = 2, n = 1) state:
 *
 *     Re psi = J_2(j_21 * r) * cos(2*th - w*t)
 *
 * Two up-lobes and two down-lobes on a disc, turning about the axis. That is
 * the figure on the reference sheet, and it is a real eigenstate rather than a
 * shape chosen to resemble one.
 *
 * Why this and not the square box it replaced: the box gave a square mesh whose
 * silhouette was a diamond, and the reference is unmistakably round. The corral
 * is the same physics on the domain the drawing actually has.
 *
 * The loop is exact for a reason worth stating, because it is the one thing a
 * multi-mode state cannot give here. A single mode carries a single energy, so
 * the time dependence is a rigid rotation of the pattern and Re psi is periodic
 * in w*t with period 2*pi, full stop. Mixing in a second mode would ripple the
 * surface, but the energies of a circular well go as j_mn^2 and those ratios are
 * irrational — 5.783 against 26.37 for the first two — so no combination of them
 * ever closes. Rigid rotation is not a compromise here, it is what a circular
 * well permits.
 *
 * The projection does the rest of the work: seen nearly edge-on, the lobes sweep
 * past each other and the silhouette changes continuously even though the
 * surface itself is rigid.
 *
 * --- the sphere ------------------------------------------------------------
 *
 * |psi> = cos(th/2)|0> + e^(i*ph)*sin(th/2)|1>, drawn the canonical way: three
 * labelled axes, the equator solid in front and dashed behind, the polar angle
 * th and the azimuth ph both marked with their arcs, and the state's drop onto
 * the equatorial plane. th is fixed and ph advances, which is free precession.
 *
 * No DOM in here. The component renders t = 0 from these functions on the
 * server and src/scripts/surface.ts drives the rest from the same source.
 */

/* --- Bessel --------------------------------------------------------------- */

/**
 * J_m(x) by its power series, which is all this needs: x never exceeds the
 * first zero of J_2 at 5.14, where the series converges in a dozen terms.
 *
 * Stepped by the ratio between successive terms rather than by evaluating
 * factorials, so nothing ever overflows and there is no cancellation to worry
 * about at these magnitudes.
 */
export function besselJ(m: number, x: number): number {
  const half = x / 2;
  let term = half ** m;
  for (let k = 2; k <= m; k++) term /= k;
  let sum = term;
  for (let k = 0; k < 40; k++) {
    term *= -(half * half) / ((k + 1) * (k + 1 + m));
    sum += term;
    if (Math.abs(term) < 1e-17) break;
  }
  return sum;
}

/** First zero of J_2: where the wall of the corral sits. */
export const J21 = 5.135622301840683;

/** Angular index of the drawn state. Two up-lobes and two down-lobes. */
export const M = 2;

/** Peak of J_2 over the well, sampled — the normaliser for the drawn height. */
export const PEAK = (() => {
  let peak = 0;
  for (let i = 0; i <= 2000; i++) {
    const v = Math.abs(besselJ(M, (i / 2000) * J21));
    if (v > peak) peak = v;
  }
  return peak;
})();

/** Re psi(r, th, t), normalised to +-1. */
export function psiReal(r: number, theta: number, phase: number): number {
  return (besselJ(M, J21 * r) / PEAK) * Math.cos(M * theta - phase);
}

/* --- time ----------------------------------------------------------------- */

/**
 * Seconds for the pattern to turn once. An m = 2 state looks the same after
 * half a turn, so the figure repeats every PERIOD / 2 — deliberately slow: the
 * first pass ran this at 24s and read as an animation rather than a state.
 */
export const PERIOD = 72;

/** The sphere's precession, in seconds. Slower still, and 2:3 against the
 * surface's visual repeat, so the band never settles into a single beat. */
export const BLOCH_PERIOD = 54;

/** Seconds to the rotation phase w*t. */
export function phaseAt(seconds: number): number {
  return ((seconds % PERIOD) / PERIOD) * 2 * Math.PI;
}

/* --- the mesh ------------------------------------------------------------- */

/** Spokes, samples along each; rings, samples around each. */
export const SPOKES = 40;
export const SPOKE_SAMPLES = 24;
export const RINGS = 12;
export const RING_SAMPLES = 81;

/** Total polylines the component renders and the script drives. */
export const MESH_LINES = SPOKES + RINGS;

/** viewBox of the surface panel. */
export const PANEL = 300;

/**
 * Plan scale, foreshortening, and height.
 *
 * SQUASH is the whole look. At 1.0 the disc is a circle seen from directly
 * above and the lobes read as shading; near 0.4 the view is low enough that the
 * lobes stand up and cross in front of each other, which is what the reference
 * draws. RISE is then large enough that the figure is taller than it is deep.
 */
const SPAN = 120;
const SQUASH = 0.42;
const RISE = 86;

const C = PANEL / 2;

/**
 * Every mesh point, with everything that does not depend on time already
 * folded in.
 *
 * Screen x never moves — the pattern rotates, the geometry does not — so only
 * the height has to be recomputed, and even that is two multiplications from
 * the cached amplitude and the cached cos/sin of m*theta. A frame is therefore
 * a few thousand multiplications and one string build, which is why this can
 * run at 60fps without the page noticing.
 */
function buildLine(points: readonly (readonly [number, number])[]) {
  const n = points.length;
  const sx = new Float64Array(n);
  const syBase = new Float64Array(n);
  const ac = new Float64Array(n);
  const as = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    const [r, th] = points[i]!;
    const amp = besselJ(M, J21 * r) / PEAK;
    sx[i] = C + r * Math.cos(th) * SPAN;
    syBase[i] = C + r * Math.sin(th) * SPAN * SQUASH;
    ac[i] = amp * Math.cos(M * th);
    as[i] = amp * Math.sin(M * th);
  }
  return { sx, syBase, ac, as, n };
}

const lines = (() => {
  const out: ReturnType<typeof buildLine>[] = [];

  for (let s = 0; s < SPOKES; s++) {
    const th = (s / SPOKES) * 2 * Math.PI;
    out.push(
      buildLine(
        Array.from(
          { length: SPOKE_SAMPLES },
          (_, i) => [i / (SPOKE_SAMPLES - 1), th] as const,
        ),
      ),
    );
  }

  for (let ring = 1; ring <= RINGS; ring++) {
    const r = ring / RINGS;
    out.push(
      buildLine(
        Array.from(
          { length: RING_SAMPLES },
          (_, i) => [r, (i / (RING_SAMPLES - 1)) * 2 * Math.PI] as const,
        ),
      ),
    );
  }

  return out;
})();

/** Where the projection puts a point of the disc at a given phase. */
export function project(
  r: number,
  theta: number,
  phase: number,
): readonly [number, number] {
  return [
    C + r * Math.cos(theta) * SPAN,
    C + r * Math.sin(theta) * SPAN * SQUASH - psiReal(r, theta, phase) * RISE,
  ];
}

/**
 * Every polyline of the mesh at a phase, as `points` attribute strings. Spokes
 * first, then rings, so the order is stable between the server's frame and the
 * browser's.
 */
export function meshPoints(phase: number): string[] {
  const cp = Math.cos(phase);
  const sp = Math.sin(phase);
  const out: string[] = [];

  for (const line of lines) {
    const parts: string[] = [];
    for (let i = 0; i < line.n; i++) {
      /* cos(m*th - phase) expanded onto the cached cos and sin of m*th. */
      const z = line.ac[i]! * cp + line.as[i]! * sp;
      parts.push(
        `${line.sx[i]!.toFixed(2)},${(line.syBase[i]! - z * RISE).toFixed(2)}`,
      );
    }
    out.push(parts.join(" "));
  }
  return out;
}

/**
 * The rim of the well, where psi is pinned to zero. Flat by definition, so it
 * is drawn once and never moves — the one line in the figure that states the
 * boundary condition rather than obeying it silently.
 */
export const RIM = { cx: C, cy: C, rx: SPAN, ry: SPAN * SQUASH };

/**
 * Reference axes and the markers that sit on them. The reference sheet puts an
 * open square at each axis end and one filled square out along the horizontal,
 * which is where these come from — they are not panel corners.
 */
export const AXES = {
  h: { x1: 14, x2: PANEL - 14, y: C },
  v: { x: C, y1: 14, y2: PANEL - 14 },
  marks: [
    { x: 14, y: C, filled: false },
    { x: PANEL - 14, y: C, filled: false },
    { x: C, y: 14, filled: false },
    { x: 222, y: C, filled: true },
  ],
};

/* --- the sphere ----------------------------------------------------------- */

export const BLOCH_PANEL = 210;
const BR = 62;
const BCX = 100;
const BCY = 100;

/** Polar angle of the state. Fixed — only the azimuth advances. */
export const THETA = (52 * Math.PI) / 180;

/** Camera azimuth and elevation. Chosen so x falls to the lower left and y to
 * the right, which is how the canonical figure is always drawn. */
const AZ = (35 * Math.PI) / 180;
const EL = (20 * Math.PI) / 180;

/** Radii of the two angle arcs, in sphere radii. Exported so the tests can
 * check that each arc starts on the axis it is measured from without keeping a
 * second copy of the number. */
export const THETA_ARC_R = 0.38;
export const PHI_ARC_R = 0.54;

/** Orthographic projection of a unit-sphere point onto the panel. */
export function blochProject(
  X: number,
  Y: number,
  Z: number,
): readonly [number, number] {
  const right = -Math.sin(AZ) * X + Math.cos(AZ) * Y;
  const up =
    -Math.cos(AZ) * Math.sin(EL) * X -
    Math.sin(AZ) * Math.sin(EL) * Y +
    Math.cos(EL) * Z;
  return [BCX + BR * right, BCY - BR * up];
}

/** Positive towards the viewer: what decides solid from dashed. */
export function blochDepth(X: number, Y: number, Z: number): number {
  return (
    Math.cos(EL) * Math.cos(AZ) * X +
    Math.cos(EL) * Math.sin(AZ) * Y +
    Math.sin(EL) * Z
  );
}

const polyline = (pts: readonly (readonly [number, number])[]) =>
  pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");

/** A short arrowhead at `tip`, pointing away from `from`. */
function head(
  from: readonly [number, number],
  tip: readonly [number, number],
  size = 6,
): string {
  const dx = tip[0] - from[0];
  const dy = tip[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const w = size * 0.42;
  return polyline([
    [tip[0], tip[1]],
    [tip[0] - ux * size - uy * w, tip[1] - uy * size + ux * w],
    [tip[0] - ux * size + uy * w, tip[1] - uy * size - ux * w],
  ]);
}

const axis = (
  X: number,
  Y: number,
  Z: number,
  label: readonly [number, number],
) => {
  const tip = blochProject(X, Y, Z);
  return {
    x2: tip[0],
    y2: tip[1],
    head: head([BCX, BCY], tip),
    lx: tip[0] + label[0],
    ly: tip[1] + label[1],
  };
};

/**
 * Everything about the sphere that never moves: the silhouette, the two halves
 * of the equator, the three axes with their arrowheads and labels, and the
 * poles.
 */
export const BLOCH_GEOMETRY = {
  cx: BCX,
  cy: BCY,
  r: BR,
  /* The equator splits at the silhouette. Front is the lower half and is drawn
     solid; back is the upper half and is dashed. */
  equatorFront: polyline(
    Array.from({ length: 41 }, (_, i) => {
      const t = -Math.PI / 2 + (i / 40) * Math.PI;
      return blochProject(Math.cos(t + AZ), Math.sin(t + AZ), 0);
    }),
  ),
  equatorBack: polyline(
    Array.from({ length: 41 }, (_, i) => {
      const t = Math.PI / 2 + (i / 40) * Math.PI;
      return blochProject(Math.cos(t + AZ), Math.sin(t + AZ), 0);
    }),
  ),
  axes: {
    x: axis(1.34, 0, 0, [-11, 12]),
    y: axis(0, 1.34, 0, [7, 6]),
    z: axis(0, 0, 1.3, [-13, -3]),
  },
  poleTop: blochProject(0, 0, 1),
  poleBottom: blochProject(0, 0, -1),
  /* The negative z axis is drawn plain, without a head — the reference only
     arrows the positive directions. */
  axisBottom: blochProject(0, 0, -1.24),
};

export interface BlochFrame {
  tip: readonly [number, number];
  foot: readonly [number, number];
  /** Arrowhead on the state vector. */
  head: string;
  /** The polar-angle arc, from the z axis round to the state. */
  thetaArc: string;
  /** The azimuth arc, in the equatorial plane, from the x axis round to phi. */
  phiArc: string;
  /** Where to hang the two angle labels. */
  thetaLabel: readonly [number, number];
  phiLabel: readonly [number, number];
  /** Where to hang the state label, pushed clear of the vector. */
  stateLabel: readonly [number, number];
  behind: boolean;
}

/** The state vector and its furniture at time t. */
export function blochFrame(seconds: number): BlochFrame {
  const phi = ((seconds % BLOCH_PERIOD) / BLOCH_PERIOD) * 2 * Math.PI;
  const sinT = Math.sin(THETA);
  const X = sinT * Math.cos(phi);
  const Y = sinT * Math.sin(phi);
  const Z = Math.cos(THETA);

  const tip = blochProject(X, Y, Z);
  const foot = blochProject(X, Y, 0);

  /* The polar arc lives in the plane through z and the state, so it swings with
     the state rather than sitting in a fixed plane. */
  const AR = THETA_ARC_R;
  const thetaArc = polyline(
    Array.from({ length: 21 }, (_, i) => {
      const t = (i / 20) * THETA;
      return blochProject(
        AR * Math.sin(t) * Math.cos(phi),
        AR * Math.sin(t) * Math.sin(phi),
        AR * Math.cos(t),
      );
    }),
  );

  const PR = PHI_ARC_R;
  const phiArc = polyline(
    Array.from({ length: 25 }, (_, i) => {
      const t = (i / 24) * phi;
      return blochProject(PR * Math.cos(t), PR * Math.sin(t), 0);
    }),
  );

  const thetaMid = blochProject(
    AR * 1.28 * Math.sin(THETA / 2) * Math.cos(phi),
    AR * 1.28 * Math.sin(THETA / 2) * Math.sin(phi),
    AR * 1.28 * Math.cos(THETA / 2),
  );
  const phiMid = blochProject(
    PR * 1.24 * Math.cos(phi / 2),
    PR * 1.24 * Math.sin(phi / 2),
    0,
  );

  return {
    tip,
    foot,
    head: head([BCX, BCY], tip),
    thetaArc,
    phiArc,
    thetaLabel: [thetaMid[0] - 3, thetaMid[1] + 3] as const,
    phiLabel: [phiMid[0] - 3, phiMid[1] + 9] as const,
    /* Pushed well clear along the vector's own direction, so it never lands on
       the vector, the tip, or the polar arc — all three of which crowd the same
       corner when the state points up and to the left. */
    stateLabel: [
      tip[0] + (tip[0] - BCX) * 0.3 + 6,
      tip[1] + (tip[1] - BCY) * 0.3 - 6,
    ] as const,
    behind: blochDepth(X, Y, Z) < 0,
  };
}
