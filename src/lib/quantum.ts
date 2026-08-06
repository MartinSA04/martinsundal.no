/**
 * The two figures in Fig. 05, as numbers.
 *
 * --- the surface -----------------------------------------------------------
 *
 * A particle in a circular infinite well — a quantum corral, the thing an STM
 * builds out of a ring of adatoms. Separating the Schrodinger equation in polar
 * coordinates gives
 *
 *     psi(r, th, t) = J_m(j_m1 * r) * e^(i*m*th) * e^(-i*E*t),   E proportional
 *                                                                to j_m1^2
 *
 * where J_m is the Bessel function of the first kind and j_m1 its first zero,
 * which is what pins psi to zero on the wall at r = 1. The drawn height is the
 * real part of a three-mode superposition in that one well:
 *
 *     Re psi = A * J_2(j_21 r) * cos(2th - w_A t)     four lobes, turning
 *            + B * J_0(j_01 r) * cos(w_B t)           a central swell, breathing
 *            + C * J_3(j_31 r) * cos(3th + w_C t)     six lobes, turning back
 *
 * Every frequency is the mode's real energy, j_m1^2, on one shared time scale.
 * Nothing here is tuned to look good; the amplitudes are the only free numbers.
 *
 * The superposition is the point, and it is a deliberate reversal. An earlier
 * pass drew the (m = 2) mode alone, because a single mode has a single energy
 * and therefore closes an exact loop. But a single mode's time dependence is a
 * rigid rotation — the shape never changes, it only turns, and that is exactly
 * what it looked like. Three modes at their true energies genuinely deform: the
 * four-lobe pattern turns one way, the six-lobe turns the other, and the
 * central swell breathes through both at a fifth of the rate.
 *
 * The cost is that j_m1^2 ratios are irrational, so the state is quasi-periodic
 * and never exactly repeats. That turns out not to matter. A seam would only
 * appear at a restart, and there is no restart — the figure runs from a
 * continuous clock, so it evolves smoothly forever. Insisting on an exact loop
 * bought nothing and cost the motion.
 *
 * --- the sphere ------------------------------------------------------------
 *
 * A qubit precessing about a tilted effective field: what a detuned drive does
 * to it. The state turns about an axis lying off z, so its polar angle rises and
 * falls instead of holding — and the whole figure is then seen in the lab frame,
 * whose own rotation winds that path round again. Two rotations at once, so the
 * tip sweeps a band of the sphere rather than tracing one circle.
 *
 * Both turn counts are integers, so this one does close exactly.
 *
 * No DOM in here. The component renders t = 0 from these functions on the
 * server and src/scripts/surface.ts drives the rest from the same source.
 */

/* --- Bessel --------------------------------------------------------------- */

/**
 * J_m(x) by its power series, which is all this needs: x never exceeds the
 * first zero of J_3 at 6.38, where the series converges in a dozen terms.
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

/* --- the state ------------------------------------------------------------ */

/**
 * The three modes. `zero` is J_m's first zero, so each one vanishes on the same
 * wall; `energy` is that zero squared, which is the real spectrum of a circular
 * well; `spin` is which way the pattern turns, and is zero for the m = 0 mode
 * because a rotationally symmetric mode has nothing to turn.
 */
export const MODES = [
  { m: 2, zero: 5.135622301840683, amplitude: 1.0, spin: -1 },
  /* Kept well under the other two. J_0 is positive right across the well, so
     this mode domes and bowls the whole disc at once; at 0.42 it swung the
     figure bodily up and down the panel and swamped the lobes it is meant to
     breathe through. */
  { m: 0, zero: 2.404825557695773, amplitude: 0.28, spin: 0 },
  { m: 3, zero: 6.380161895923984, amplitude: 0.34, spin: 1 },
] as const;

/**
 * Seconds for the m = 2 pattern to turn once. Everything else follows from the
 * real energies, so this is the only clock in the figure.
 *
 * The pattern turns at w/m, and w is proportional to j^2, so fixing this fixes
 * the shared time scale for all three modes.
 */
export const TURN = 72;

const RATE = (2 * Math.PI * MODES[0].m) / (MODES[0].zero ** 2 * TURN);

/** Angular frequency of a mode, in radians per second. */
export function omega(index: number): number {
  return MODES[index]!.zero ** 2 * RATE;
}

/**
 * The largest |Re psi| the state can ever reach, exactly.
 *
 * At a fixed point each mode contributes a cosine whose amplitude is fixed and
 * whose phase sweeps the whole circle, and the three frequencies are mutually
 * irrational — so over time the phases become independent and the supremum is
 * simply the sum of the three amplitudes. No sampling in time needed, and no
 * safety margin: this is the number, not an estimate of it.
 *
 * It is also rarely reached, which is deliberate. The surface sits at roughly
 * two thirds of its height budget most of the time and swells towards the top
 * of it when the modes come into phase, so the figure breathes.
 */
export const PEAK = (() => {
  let peak = 0;
  for (let i = 0; i <= 4000; i++) {
    const r = i / 4000;
    let sum = 0;
    for (const mode of MODES) {
      sum += mode.amplitude * Math.abs(besselJ(mode.m, mode.zero * r));
    }
    if (sum > peak) peak = sum;
  }
  return peak;
})();

/** Re psi(r, th, t), normalised so |Re psi| <= 1. */
export function psiReal(r: number, theta: number, seconds: number): number {
  let sum = 0;
  for (let i = 0; i < MODES.length; i++) {
    const mode = MODES[i]!;
    sum +=
      mode.amplitude *
      besselJ(mode.m, mode.zero * r) *
      Math.cos(mode.m * theta + mode.spin * omega(i) * seconds);
  }
  return sum / PEAK;
}

/* --- the mesh ------------------------------------------------------------- */

/** Spokes, samples along each; rings, samples around each. */
export const SPOKES = 40;
export const SPOKE_SAMPLES = 24;
export const RINGS = 12;
export const RING_SAMPLES = 81;

/**
 * How far out the mesh is drawn, as a fraction of the well.
 *
 * Short of the wall, deliberately. psi is pinned to zero at r = 1, so anything
 * drawn there is a node: a ring on the wall is dead flat and stays flat forever,
 * whatever the rest of the surface is doing. Drawing it put a static ellipse
 * around a moving figure, which read as a frame rather than as part of the
 * state. Stopping just inside means every line in the plot is live.
 *
 * The wall is therefore not drawn at all. It still sets the state — the three
 * zeros are the boundary condition — it just has nothing to show.
 */
export const RMAX = 0.94;

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
 * draws. RISE is then as tall as the panel will take once the plan has had its
 * share, because the state only rarely uses all of it.
 */
const SPAN = 120;
const SQUASH = 0.42;
const RISE = 98;

const C = PANEL / 2;

/**
 * Every mesh point, with everything that does not depend on time already
 * folded in.
 *
 * Screen x never moves — the patterns rotate, the geometry does not — so it is
 * cached alongside each mode's amplitude and the cos and sin of m*theta. A
 * frame is then five multiplications per point, which is why a mesh this dense
 * costs nothing to redraw.
 */
function buildLine(points: readonly (readonly [number, number])[]) {
  const n = points.length;
  const sx = new Float64Array(n);
  const syBase = new Float64Array(n);
  /* Per mode, per point: the cos(m*th) and sin(m*th) halves of the angular
     factor, already scaled by amplitude and by J_m at this radius. */
  const cosPart = MODES.map(() => new Float64Array(n));
  const sinPart = MODES.map(() => new Float64Array(n));

  for (let i = 0; i < n; i++) {
    const [r, th] = points[i]!;
    sx[i] = C + r * Math.cos(th) * SPAN;
    syBase[i] = C + r * Math.sin(th) * SPAN * SQUASH;
    for (let k = 0; k < MODES.length; k++) {
      const mode = MODES[k]!;
      const a = (mode.amplitude * besselJ(mode.m, mode.zero * r)) / PEAK;
      cosPart[k]![i] = a * Math.cos(mode.m * th);
      sinPart[k]![i] = a * Math.sin(mode.m * th);
    }
  }
  return { sx, syBase, cosPart, sinPart, n };
}

const lines = (() => {
  const out: ReturnType<typeof buildLine>[] = [];

  for (let s = 0; s < SPOKES; s++) {
    const th = (s / SPOKES) * 2 * Math.PI;
    out.push(
      buildLine(
        Array.from(
          { length: SPOKE_SAMPLES },
          (_, i) => [(i / (SPOKE_SAMPLES - 1)) * RMAX, th] as const,
        ),
      ),
    );
  }

  for (let ring = 1; ring <= RINGS; ring++) {
    const r = (ring / RINGS) * RMAX;
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

/** Where the projection puts a point of the disc at a given time. */
export function project(
  r: number,
  theta: number,
  seconds: number,
): readonly [number, number] {
  return [
    C + r * Math.cos(theta) * SPAN,
    C + r * Math.sin(theta) * SPAN * SQUASH - psiReal(r, theta, seconds) * RISE,
  ];
}

/**
 * Every polyline of the mesh at a time, as `points` attribute strings. Spokes
 * first, then rings, so the order is stable between the server's frame and the
 * browser's.
 */
export function meshPoints(seconds: number): string[] {
  /* cos(m*th + s*w*t) expanded onto the cached cos and sin of m*th. */
  const ct = MODES.map((mode, k) => Math.cos(mode.spin * omega(k) * seconds));
  const st = MODES.map((mode, k) => Math.sin(mode.spin * omega(k) * seconds));
  const out: string[] = [];

  for (const line of lines) {
    const parts: string[] = [];
    for (let i = 0; i < line.n; i++) {
      let z = 0;
      for (let k = 0; k < MODES.length; k++) {
        z += line.cosPart[k]![i]! * ct[k]! - line.sinPart[k]![i]! * st[k]!;
      }
      parts.push(
        `${line.sx[i]!.toFixed(2)},${(line.syBase[i]! - z * RISE).toFixed(2)}`,
      );
    }
    out.push(parts.join(" "));
  }
  return out;
}

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

/** Plan extent of the drawn mesh — what the panel has to hold sideways. */
export const PLAN_EXTENT = {
  cx: C,
  cy: C,
  rx: SPAN * RMAX,
  ry: SPAN * SQUASH * RMAX,
};

/* --- the sphere ----------------------------------------------------------- */

export const BLOCH_PANEL = 210;
const BR = 62;
const BCX = 100;
const BCY = 100;

/** Seconds for the whole trajectory to close. */
export const BLOCH_PERIOD = 60;

/** Tilt of the effective field off z: what a detuned drive produces. */
export const TILT = (55 * Math.PI) / 180;

/** Polar angle the state starts at, which sets how wide a band it sweeps. */
export const START = (26 * Math.PI) / 180;

/** Turns about the effective field, and turns of the lab frame, per cycle.
 * Both integers, so the path closes; coprime, so it does not close early. */
export const NUTATIONS = 2;
export const PRECESSIONS = 3;

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

/**
 * Where the state points at time t.
 *
 * Two rotations composed. First the state turns about the effective field,
 * which lies at TILT off z in the x-z plane — that is the precession a detuned
 * drive causes, and because the axis is tilted the polar angle rises and falls
 * instead of holding. Then the whole thing is carried round z by the lab
 * frame's own rotation. The tip therefore sweeps a band between TILT - START
 * and TILT + START rather than tracing a single circle.
 */
export function blochState(seconds: number): readonly [number, number, number] {
  const u = (seconds % BLOCH_PERIOD) / BLOCH_PERIOD;
  const a = 2 * Math.PI * NUTATIONS * u;
  const b = 2 * Math.PI * PRECESSIONS * u;

  /* Rodrigues, rotating the initial state about the effective field by a. */
  const nx = Math.sin(TILT);
  const nz = Math.cos(TILT);
  const vx = Math.sin(START);
  const vz = Math.cos(START);
  const dot = nx * vx + nz * vz;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  /* n x v, with both vectors in the x-z plane, so the cross product is on y. */
  const crossY = nz * vx - nx * vz;

  const rx = nx * dot * (1 - ca) + vx * ca;
  const ry = crossY * sa;
  const rz = nz * dot * (1 - ca) + vz * ca;

  /* Then the lab frame's rotation about z. */
  const cb = Math.cos(b);
  const sb = Math.sin(b);
  return [rx * cb - ry * sb, rx * sb + ry * cb, rz] as const;
}

const polyline = (pts: readonly (readonly [number, number])[]) =>
  pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");

/**
 * The arrowhead, as a cone in three dimensions rather than a triangle in two.
 *
 * This has to be 3D or it breaks, and it broke. Built from the projected vector
 * — apex at the tip, base offset back along the screen-space direction — the
 * head is fine until the state points at the viewer. There the projected vector
 * has no length, its direction is undefined, and the head spins through half a
 * turn between one frame and the next. The state's path crosses the view
 * direction, so it happened every cycle.
 *
 * A cone has no such degeneracy. Its apex sits at the tip and its base is a
 * circle of `radius` a distance `length` back along the true 3D direction; both
 * are projected, and the silhouette is the apex fanned to the projected base.
 * Pointing sideways that fan is a triangle; pointing at the viewer the base
 * ellipse opens out to a circle and the apex falls inside it, so the head reads
 * as a disc — which is what a cone aimed at you looks like. Nothing flips,
 * because nothing is ever inferred from a direction that has collapsed.
 *
 * `at` is how far out along `dir` the apex sits, in sphere radii.
 */
function cone(
  dir: readonly [number, number, number],
  at: number,
  length = 0.15,
  radius = 0.052,
): string {
  const [dx, dy, dz] = dir;

  /* Any vector not parallel to dir, to seed the perpendicular basis. */
  const seed: readonly [number, number, number] =
    Math.abs(dz) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  let ux = dy * seed[2] - dz * seed[1];
  let uy = dz * seed[0] - dx * seed[2];
  let uz = dx * seed[1] - dy * seed[0];
  const ul = Math.hypot(ux, uy, uz) || 1;
  ux /= ul;
  uy /= ul;
  uz /= ul;
  const vx = dy * uz - dz * uy;
  const vy = dz * ux - dx * uz;
  const vz = dx * uy - dy * ux;

  const base = at - length;
  const rim = Array.from({ length: 20 }, (_, i) => {
    const t = (i / 20) * 2 * Math.PI;
    const c = Math.cos(t) * radius;
    const s = Math.sin(t) * radius;
    return blochProject(
      dx * base + ux * c + vx * s,
      dy * base + uy * c + vy * s,
      dz * base + uz * c + vz * s,
    );
  });

  return polyline([blochProject(dx * at, dy * at, dz * at), ...rim]);
}

const axis = (
  X: number,
  Y: number,
  Z: number,
  label: readonly [number, number],
) => {
  const at = Math.hypot(X, Y, Z);
  const tip = blochProject(X, Y, Z);
  return {
    x2: tip[0],
    y2: tip[1],
    head: cone([X / at, Y / at, Z / at], at),
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
  /* The kets hang off the ends of the z axis, clear of the sphere, not beside
     the poles. The state never leaves the sphere, so out here they can never be
     collided with — beside the north pole, |0> and |psi> landed on top of each
     other every time the state swung high. */
  ket0: [
    blochProject(0, 0, 1.3)[0] + 8,
    blochProject(0, 0, 1.3)[1] + 3,
  ] as const,
  ket1: [
    blochProject(0, 0, -1.24)[0] + 8,
    blochProject(0, 0, -1.24)[1] + 4,
  ] as const,
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
  /** Where to hang the state label. */
  stateLabel: readonly [number, number];
  /** The state's polar angle and azimuth, in radians. */
  theta: number;
  phi: number;
}

/** The state vector and its furniture at time t. */
export function blochFrame(seconds: number): BlochFrame {
  const [X, Y, Z] = blochState(seconds);
  const theta = Math.acos(Math.max(-1, Math.min(1, Z)));
  const phi = Math.atan2(Y, X);

  const tip = blochProject(X, Y, Z);
  const foot = blochProject(X, Y, 0);

  /* The polar arc lives in the plane through z and the state, so it swings with
     the state rather than sitting in a fixed plane. */
  const AR = THETA_ARC_R;
  const thetaArc = polyline(
    Array.from({ length: 21 }, (_, i) => {
      const t = (i / 20) * theta;
      return blochProject(
        AR * Math.sin(t) * Math.cos(phi),
        AR * Math.sin(t) * Math.sin(phi),
        AR * Math.cos(t),
      );
    }),
  );

  /* Measured from the x axis the short way round, so the arc never wraps the
     long way when the state crosses the negative x axis. */
  const PR = PHI_ARC_R;
  const phiArc = polyline(
    Array.from({ length: 25 }, (_, i) => {
      const t = (i / 24) * phi;
      return blochProject(PR * Math.cos(t), PR * Math.sin(t), 0);
    }),
  );

  const thetaMid = blochProject(
    AR * 1.28 * Math.sin(theta / 2) * Math.cos(phi),
    AR * 1.28 * Math.sin(theta / 2) * Math.sin(phi),
    AR * 1.28 * Math.cos(theta / 2),
  );
  const phiMid = blochProject(
    PR * 1.24 * Math.cos(phi / 2),
    PR * 1.24 * Math.sin(phi / 2),
    0,
  );

  return {
    tip,
    foot,
    head: cone([X, Y, Z], 1),
    thetaArc,
    phiArc,
    thetaLabel: [thetaMid[0] - 3, thetaMid[1] + 3] as const,
    phiLabel: [phiMid[0] - 3, phiMid[1] + 9] as const,
    /* A fixed offset up and to the right of the tip, exactly as the canonical
       figure sets it. Anything derived from the vector's direction jumps when
       that direction is ill-defined — an earlier version flipped the label to
       the other side of the tip as it crossed the centre line, which is the
       same degeneracy that used to spin the arrowhead. A constant offset simply
       cannot. */
    stateLabel: [tip[0] + 9, tip[1] - 7] as const,
    theta,
    phi,
  };
}
