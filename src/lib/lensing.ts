/**
 * Light bending around a Schwarzschild black hole, in the orbital plane.
 *
 * This is the *method* the C++ renderer uses, reduced to something a diagram
 * can show: integrate the photon orbit equation
 *
 *     d²u/dφ² = -u + (3/2) rs u²,     u = 1/r
 *
 * and see where the ray ends up. The Newtonian term alone gives a straight
 * line; the u² term is general relativity, and it is the whole reason the
 * image bends.
 *
 * A ray arriving from infinity with impact parameter b follows u = sin(φ)/b
 * while it is still far away, which is where the integration starts.
 *
 * Deliberately not a renderer. The C++ project is the renderer, and its output
 * is on the page; this only explains how it works.
 */

/** Weak-field deflection angle, 2rs/b. Exact only for b >> rs. */
export function deflection(impactParameter: number, rs: number): number {
  return (2 * rs) / impactParameter;
}

/**
 * Critical impact parameter. Light aimed inside this is captured; outside it
 * escapes, however sharply bent. b_crit = (3√3/2)·rs ≈ 2.598 rs.
 */
export function criticalImpactParameter(rs: number): number {
  return ((3 * Math.sqrt(3)) / 2) * rs;
}

export interface Ray {
  /** Polyline through the orbital plane, in units of rs. */
  points: [number, number][];
  captured: boolean;
  /** Total turning of the ray, in radians. */
  deflected: number;
}

export interface TraceOptions {
  rs?: number;
  /** Integration step in φ. Smaller is smoother and slower. */
  dphi?: number;
  maxSteps?: number;
  /** Stop drawing beyond this radius. */
  maxRadius?: number;
}

export function traceRay(impactParameter: number, opts: TraceOptions = {}): Ray {
  const { rs = 1, dphi = 0.02, maxSteps = 4000, maxRadius = 40 } = opts;

  const b = Math.abs(impactParameter);
  const points: [number, number][] = [];

  // Far from the hole the ray is a straight line: r sin φ = b, so u = sin φ / b.
  // Start at a tiny φ, which is r ≈ b/dphi — effectively infinity.
  let phi = dphi;
  let u = Math.sin(phi) / b;
  let du = Math.cos(phi) / b;

  let captured = false;

  // RK4. At this step size it agrees with Euler to five decimals, so it is not
  // load-bearing for the picture — but it costs nothing and keeps the capture
  // threshold exact at b_crit, which is the one number the diagram asserts.
  //
  // The residual few percent against 2rs/b is not integration error: it is the
  // real second-order term (15π/16)(rs/b)², plus the φ quantisation.
  const accel = (uu: number) => -uu + 1.5 * rs * uu * uu;
  const h = dphi;

  for (let i = 0; i < maxSteps; i++) {
    const k1u = du;
    const k1v = accel(u);
    const k2u = du + (h / 2) * k1v;
    const k2v = accel(u + (h / 2) * k1u);
    const k3u = du + (h / 2) * k2v;
    const k3v = accel(u + (h / 2) * k2u);
    const k4u = du + h * k3v;
    const k4v = accel(u + h * k3u);

    u += (h / 6) * (k1u + 2 * k2u + 2 * k3u + k4u);
    du += (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
    phi += dphi;

    if (u <= 1e-9) break; // reached the outgoing asymptote
    const r = 1 / u;

    if (r <= rs) {
      captured = true;
      points.push([r * Math.cos(phi), r * Math.sin(phi)]);
      break;
    }

    // Clip what is *drawn* to the frame, but keep integrating: stopping here
    // would measure the deflection mid-flight instead of at the asymptote.
    if (r <= maxRadius) {
      points.push([r * Math.cos(phi), r * Math.sin(phi)]);
    }
  }

  // An undeflected ray sweeps exactly π of azimuth between its asymptotes.
  return { points, captured, deflected: captured ? Number.NaN : phi - Math.PI };
}

/**
 * A fan of rays at evenly spaced impact parameters, for the diagram.
 *
 * `mirror` reflects each ray below the axis. Physically correct — the geometry
 * is symmetric — but the diagram uses one side only: rays bending down and
 * their mirrors bending up genuinely cross after passing the hole, which is
 * the whole reason an Einstein ring exists, and which reads as noise in a
 * figure meant to show one idea.
 */
export function rayFan(
  count: number,
  maxB: number,
  opts: TraceOptions & { mirror?: boolean } = {},
): Ray[] {
  const { mirror = true, ...trace } = opts;
  const rays: Ray[] = [];
  for (let i = 1; i <= count; i++) {
    const b = (maxB * i) / count;
    const ray = traceRay(b, trace);
    rays.push(ray);
    if (mirror) {
      rays.push({
        ...ray,
        points: ray.points.map(([x, y]) => [x, -y] as [number, number]),
      });
    }
  }
  return rays;
}
