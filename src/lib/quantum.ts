/**
 * The two figures in Fig. 05, as numbers.
 *
 * --- the surface -----------------------------------------------------------
 *
 * A particle in a two-dimensional infinite square well, ħ = m = L = 1. The
 * eigenstates are φₙₘ = sin(nπx)·sin(mπy) with Eₙₘ ∝ n² + m², and the drawn
 * height is the real part of a four-mode superposition:
 *
 *     ψ = a·φ₁₁·e^(-2iτ) + b·(φ₂₁ + i·φ₁₂)·e^(-5iτ) + c·φ₁₃·e^(-10iτ)
 *
 *     Re ψ = a·φ₁₁·cos2τ + b·(φ₂₁·cos5τ + φ₁₂·sin5τ) + c·φ₁₃·cos10τ
 *
 * Three things about that state are load-bearing, and all three are physics
 * rather than art direction:
 *
 *   The saddle turns. φ₂₁ and φ₁₂ are degenerate at E = 5. Added in phase they
 *   give a four-lobe saddle that only breathes in place; added in quadrature —
 *   the `+ i·φ₁₂`, which is what puts cos and sin on the same energy below —
 *   the saddle rotates. That rotation is the figure.
 *
 *   It ripples rather than merely spinning. φ₁₁ and φ₁₃ sit 3 below and 5 above
 *   the degenerate pair, so they beat against it at two rates that never
 *   coincide. The obvious fourth mode is φ₂₂ at E = 8, and it is the wrong one:
 *   its detuning of 3 matches φ₁₁'s exactly, so the two swells lock together
 *   and the surface has one beat instead of two. φ₁₃ is also the only term
 *   without a mirror line, which is what keeps the figure from settling into
 *   something symmetric.
 *
 *   The loop has no seam. Every energy is an integer multiple of one unit, so
 *   ψ(τ + 2π) = ψ(τ) exactly. Nothing is crossfaded and nothing drifts.
 *
 * ψ vanishes on all four walls, so the mesh meets its frame flat on every edge.
 *
 * --- the sphere ------------------------------------------------------------
 *
 * |ψ⟩ = cos(θ/2)|0⟩ + e^(iφ)·sin(θ/2)|1⟩ with θ fixed and φ advancing: free
 * precession about z, the simplest true motion a qubit has. Its period is half
 * the surface's, so the band returns to its opening state as one system.
 *
 * No DOM in here. The component renders τ = 0 from these functions on the
 * server and src/scripts/surface.ts drives the rest from the same source.
 */

/* --- the state ------------------------------------------------------------ */

/** Amplitudes. b is the subject; a and c are the two beats against it. */
const A11 = 0.4;
const A_PAIR = 1.0;
const A13 = 0.3;

/** One full τ ∈ [0, 2π), in seconds. */
export const PERIOD = 24;

/** The sphere's precession, in seconds. Exactly half the surface's. */
export const BLOCH_PERIOD = 12;

/**
 * The four modes, as (n, m, E, amplitude). Exported because the tests assert
 * on the energies — that the pair is degenerate and the detunings differ — and
 * those are the properties the whole figure rests on.
 */
export const MODES = [
  { n: 1, m: 1, energy: 2, amplitude: A11 },
  { n: 2, m: 1, energy: 5, amplitude: A_PAIR },
  { n: 1, m: 2, energy: 5, amplitude: A_PAIR },
  { n: 1, m: 3, energy: 10, amplitude: A13 },
] as const;

/** φₙₘ(x, y) = sin(nπx)·sin(mπy). */
export function eigenstate(n: number, m: number, x: number, y: number): number {
  return Math.sin(n * Math.PI * x) * Math.sin(m * Math.PI * y);
}

/** Re ψ(x, y, τ), unnormalised. */
export function psiReal(x: number, y: number, tau: number): number {
  const sx = Math.sin(Math.PI * x);
  const s2x = Math.sin(2 * Math.PI * x);
  const sy = Math.sin(Math.PI * y);
  const s2y = Math.sin(2 * Math.PI * y);
  const s3y = Math.sin(3 * Math.PI * y);

  return (
    A11 * (sx * sy) * Math.cos(2 * tau) +
    A_PAIR * (s2x * sy * Math.cos(5 * tau) + sx * s2y * Math.sin(5 * tau)) +
    A13 * (sx * s3y) * Math.cos(10 * tau)
  );
}

/**
 * A rigorous ceiling on |Re ψ| anywhere, any time. The degenerate pair is
 * A·cos5τ + B·sin5τ, whose amplitude is √(A² + B²); the other two terms can at
 * worst add their own amplitudes on top. Nothing can exceed this, so the tests
 * use it to check that the sampled PEAK below is both safe and not wasteful.
 */
export function amplitudeBound(x: number, y: number): number {
  const p21 = A_PAIR * eigenstate(2, 1, x, y);
  const p12 = A_PAIR * eigenstate(1, 2, x, y);
  return (
    Math.abs(A11 * eigenstate(1, 1, x, y)) +
    Math.hypot(p21, p12) +
    Math.abs(A13 * eigenstate(1, 3, x, y))
  );
}

/* --- the mesh ------------------------------------------------------------- */

/** Lines per family, and samples along each line. */
export const LINES = 21;
export const SAMPLES = 41;

/** viewBox of the surface panel. */
export const PANEL = 300;

/**
 * Plan scale and height scale of the axonometric projection.
 *
 * Sized so the figure fills its square: the plan diamond is 2·cos30·PLAN wide
 * and 2·sin30·PLAN deep, and the surface adds RISE above and below that, so the
 * drawn extent is 256 x 268 in a 300 panel — enough margin that the mesh never
 * crowds the corner handles. The first pass had these at 138 and 46, which left
 * a third of the panel's height empty and flattened the saddle into a mound;
 * the height budget is what makes it read as a surface at all.
 */
const PLAN = 148;
const RISE = 60;
const COS30 = Math.cos(Math.PI / 6);
const SIN30 = 0.5;

const coarse = Array.from({ length: LINES }, (_, i) => i / (LINES - 1));
const fine = Array.from({ length: SAMPLES }, (_, i) => i / (SAMPLES - 1));

/**
 * Both families of grid points, with their four φ values precomputed.
 *
 * The mesh is redrawn every frame and the modes are fixed, so the only thing
 * that changes between frames is the four time factors. Caching φ turns each
 * frame from ~14k calls to sin into ~7k multiplications, which is the
 * difference between this figure costing something and costing nothing.
 *
 * Family A holds y and runs along x; family B holds x and runs along y.
 */
function buildFamily(hold: number[], run: number[], holdIsY: boolean) {
  const count = hold.length * run.length;
  const px = new Float64Array(count);
  const py = new Float64Array(count);
  const phi = new Float64Array(count * 4);

  let k = 0;
  for (const h of hold) {
    for (const r of run) {
      const x = holdIsY ? r : h;
      const y = holdIsY ? h : r;
      px[k] = x;
      py[k] = y;
      phi[k * 4] = eigenstate(1, 1, x, y);
      phi[k * 4 + 1] = eigenstate(2, 1, x, y);
      phi[k * 4 + 2] = eigenstate(1, 2, x, y);
      phi[k * 4 + 3] = eigenstate(1, 3, x, y);
      k++;
    }
  }
  return { px, py, phi, lines: hold.length, samples: run.length };
}

const families = [
  buildFamily(coarse, fine, true),
  buildFamily(coarse, fine, false),
];

/**
 * The normalising maximum: the largest |Re ψ| any drawn point reaches over a
 * full period, so the surface fills its height budget exactly and never
 * overruns it.
 *
 * Measured rather than taken from amplitudeBound(), because that bound assumes
 * all four terms peak at once and they never do — normalising by it would
 * leave the figure visibly flat. Measured in two passes rather than one,
 * because a single coarse τ scan under-reads the true maximum by roughly a
 * percent and padding that back with a blanket margin overshoots the rigorous
 * ceiling, which is the same as not knowing the answer:
 *
 *   pass 1  every grid point on a coarse τ grid, to find which points are
 *           anywhere near holding the maximum.
 *   pass 2  a dense τ scan on only those points — a handful survive the 0.97
 *           cut, so this costs almost nothing.
 *
 * The remaining margin is 0.05%, which covers the gap between the dense τ
 * samples with room to spare and still sits well under amplitudeBound(). The
 * tests hold it between the two.
 */
function samplePeak(): number {
  const evaluate = (
    c11: number,
    c21: number,
    c12: number,
    c13: number,
    steps: number,
  ) => {
    let best = 0;
    for (let s = 0; s < steps; s++) {
      const tau = (s / steps) * 2 * Math.PI;
      const v =
        c11 * Math.cos(2 * tau) +
        c21 * Math.cos(5 * tau) +
        c12 * Math.sin(5 * tau) +
        c13 * Math.cos(10 * tau);
      const a = v < 0 ? -v : v;
      if (a > best) best = a;
    }
    return best;
  };

  const coarse: number[] = [];
  let ceiling = 0;
  for (const f of families) {
    for (let k = 0; k < f.px.length; k++) {
      const v = evaluate(
        A11 * f.phi[k * 4],
        A_PAIR * f.phi[k * 4 + 1],
        A_PAIR * f.phi[k * 4 + 2],
        A13 * f.phi[k * 4 + 3],
        180,
      );
      coarse.push(v);
      if (v > ceiling) ceiling = v;
    }
  }

  let peak = ceiling;
  let i = 0;
  for (const f of families) {
    for (let k = 0; k < f.px.length; k++, i++) {
      if (coarse[i] < ceiling * 0.97) continue;
      const v = evaluate(
        A11 * f.phi[k * 4],
        A_PAIR * f.phi[k * 4 + 1],
        A_PAIR * f.phi[k * 4 + 2],
        A13 * f.phi[k * 4 + 3],
        6000,
      );
      if (v > peak) peak = v;
    }
  }

  return peak * 1.0005;
}

export const PEAK = samplePeak();

/**
 * Axonometric projection. The plan is a diamond — x and y run out to the left
 * and right — and z lifts straight up the screen, which is the projection every
 * surface plot on the reference sheet uses.
 */
export function project(
  x: number,
  y: number,
  z: number,
): readonly [number, number] {
  const u = x - 0.5;
  const v = y - 0.5;
  const c = PANEL / 2;
  return [c + (u - v) * COS30 * PLAN, c + (u + v) * SIN30 * PLAN - z * RISE];
}

/**
 * Every polyline of the mesh at time τ, as `points` attribute strings. Family A
 * first, then family B, so the order is stable between the server's frame and
 * the browser's.
 */
export function meshPoints(tau: number): string[] {
  const t11 = Math.cos(2 * tau);
  const t21 = Math.cos(5 * tau);
  const t12 = Math.sin(5 * tau);
  const t13 = Math.cos(10 * tau);
  const out: string[] = [];

  for (const f of families) {
    for (let line = 0; line < f.lines; line++) {
      const parts: string[] = [];
      for (let s = 0; s < f.samples; s++) {
        const k = line * f.samples + s;
        const z =
          (A11 * f.phi[k * 4] * t11 +
            A_PAIR * f.phi[k * 4 + 1] * t21 +
            A_PAIR * f.phi[k * 4 + 2] * t12 +
            A13 * f.phi[k * 4 + 3] * t13) /
          PEAK;
        const [sx, sy] = project(f.px[k], f.py[k], z);
        parts.push(`${sx.toFixed(2)},${sy.toFixed(2)}`);
      }
      out.push(parts.join(" "));
    }
  }
  return out;
}

/** Seconds → τ. */
export function tauAt(seconds: number): number {
  return ((seconds % PERIOD) / PERIOD) * 2 * Math.PI;
}

/* --- the sphere ----------------------------------------------------------- */

/** viewBox of the Bloch panel, and the sphere inside it. */
export const BLOCH_PANEL = 140;
const BR = 52;
const BC = BLOCH_PANEL / 2;

/** Polar angle of the state. Fixed — only the phase advances. */
export const THETA = (55 * Math.PI) / 180;

/** Camera elevation above the equatorial plane. Sets how open the equator is. */
const ELEV = (22 * Math.PI) / 180;

/** Semi-minor axis of any circle of latitude, as drawn. */
export const BLOCH_SQUASH = Math.sin(ELEV);

/** Where the equator and the precession circle sit, for the static markup. */
export const BLOCH_GEOMETRY = {
  cx: BC,
  cy: BC,
  r: BR,
  /** The precession circle at z = cos θ. */
  orbit: {
    rx: BR * Math.sin(THETA),
    ry: BR * Math.sin(THETA) * BLOCH_SQUASH,
    cy: BC - BR * Math.cos(THETA) * Math.cos(ELEV),
  },
  equator: { rx: BR, ry: BR * BLOCH_SQUASH },
  pole: BR * Math.cos(ELEV),
};

export interface BlochFrame {
  /** Tip of the state vector, in panel coordinates. */
  tip: readonly [number, number];
  /** Its drop onto the equatorial plane. */
  foot: readonly [number, number];
  /** True when the tip is on the far side of the sphere. */
  behind: boolean;
}

/** The state vector at time t, orthographically projected. */
export function blochFrame(seconds: number): BlochFrame {
  const phase = ((seconds % BLOCH_PERIOD) / BLOCH_PERIOD) * 2 * Math.PI;
  const sinT = Math.sin(THETA);
  const X = sinT * Math.cos(phase);
  const Y = sinT * Math.sin(phase);
  const Z = Math.cos(THETA);

  /* Depth is the axis the projection throws away — the y of the scene after
     the camera's elevation is rolled in. The viewer sits on its positive side,
     so the near half of the equator is the half drawn lower on the panel. */
  const depth = Y * Math.cos(ELEV) + Z * Math.sin(ELEV);

  return {
    tip: [
      BC + BR * X,
      BC - BR * (Z * Math.cos(ELEV) - Y * Math.sin(ELEV)),
    ] as const,
    foot: [BC + BR * X, BC + BR * Y * Math.sin(ELEV)] as const,
    behind: depth < 0,
  };
}
