import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AXES,
  BLOCH_GEOMETRY,
  BLOCH_PANEL,
  BLOCH_PERIOD,
  MESH_LINES,
  MODES,
  NUTATIONS,
  PANEL,
  PEAK,
  PHI_ARC_R,
  PLAN_EXTENT,
  PRECESSIONS,
  RMAX,
  START,
  TILT,
  TURN,
  besselJ,
  blochDepth,
  blochFrame,
  blochProject,
  blochState,
  meshPoints,
  omega,
  project,
  psiReal,
} from "../src/lib/quantum.ts";

const TWO_PI = 2 * Math.PI;

/* --- Bessel --------------------------------------------------------------- */

test("besselJ matches known values", () => {
  /* Reference values, 6dp, from the standard tables. */
  const cases: [number, number, number][] = [
    [0, 0, 1],
    [0, 1, 0.765198],
    [0, 2.404826, 0],
    [1, 1, 0.440051],
    [1, 3.831706, 0],
    [2, 1, 0.114903],
    [2, 3, 0.486091],
    [3, 2, 0.128943],
    [3, 6.380162, 0],
  ];
  for (const [m, x, want] of cases) {
    assert.ok(
      Math.abs(besselJ(m, x) - want) < 1e-6,
      `J_${m}(${x}) = ${besselJ(m, x)}, want ${want}`,
    );
  }
});

test("each mode's zero is the first zero of its own J_m", () => {
  for (const mode of MODES) {
    assert.ok(
      Math.abs(besselJ(mode.m, mode.zero)) < 1e-9,
      `J_${mode.m}(${mode.zero}) is not zero`,
    );
    for (let i = 1; i < 400; i++) {
      const x = (i / 400) * mode.zero;
      assert.ok(
        Math.abs(besselJ(mode.m, x)) > 1e-9,
        `J_${mode.m} crossed zero early, at ${x}`,
      );
    }
  }
});

/* --- the state ------------------------------------------------------------ */

test("psi vanishes on the wall of the well, at every time", () => {
  for (let k = 0; k < 32; k++) {
    const t = (k / 32) * TURN;
    for (let i = 0; i < 24; i++) {
      assert.ok(
        Math.abs(psiReal(1, (i / 24) * TWO_PI, t)) < 1e-9,
        "psi is not zero on the wall",
      );
    }
  }
});

test("the frequencies are the real energies, j^2 on one shared clock", () => {
  for (let i = 0; i < MODES.length; i++) {
    const ratio = omega(i) / omega(0);
    const want = MODES[i]!.zero ** 2 / MODES[0]!.zero ** 2;
    assert.ok(
      Math.abs(ratio - want) < 1e-12,
      `mode ${i} runs at ${ratio} of the base, but its energy ratio is ${want}`,
    );
  }
  /* And the base clock is what TURN says it is: the m=2 pattern turns once. */
  const turnRate = omega(0) / MODES[0]!.m;
  assert.ok(Math.abs(TWO_PI / turnRate - TURN) < 1e-9);
});

test("the state is not a rigid rotation", () => {
  /* The whole reason for three modes. A rigidly rotating pattern reproduces
     itself exactly under a matching turn of theta; this one must not, or it is
     the single-mode figure again with extra arithmetic. */
  let worst = 0;
  for (let k = 1; k < 40; k++) {
    const t = (k / 40) * TURN;
    const turned = (omega(0) * t) / MODES[0]!.m;
    for (const r of [0.3, 0.55, 0.8]) {
      worst = Math.max(
        worst,
        Math.abs(psiReal(r, 0.6 - turned, t) - psiReal(r, 0.6, 0)),
      );
    }
  }
  assert.ok(worst > 0.15, `the surface only deforms by ${worst} — still rigid`);
});

test("the state never exactly repeats, and that is by construction", () => {
  /* Irrational energy ratios mean no common period. Checked as the absence of a
     repeat over a long window rather than asserted about the reals. */
  const sample = (t: number) =>
    [0.3, 0.5, 0.7].map((r) => psiReal(r, 0.4, t)).join(",");
  const first = sample(0);
  for (let k = 1; k <= 400; k++) {
    assert.notEqual(sample((k * TURN) / 8), first);
  }
});

test("every mode contributes — none is drowned out", () => {
  for (const mode of MODES) {
    let peak = 0;
    for (let i = 1; i < 60; i++) {
      peak = Math.max(
        peak,
        (mode.amplitude * Math.abs(besselJ(mode.m, mode.zero * (i / 60)))) /
          PEAK,
      );
    }
    assert.ok(
      peak > 0.08,
      `mode m=${mode.m} peaks at only ${peak} of the total`,
    );
  }
});

test("PEAK is the exact supremum, so the height is bounded and well used", () => {
  let worst = 0;
  for (let k = 0; k < 900; k++) {
    const t = (k / 900) * TURN * 7;
    for (let i = 0; i <= 40; i++) {
      for (let j = 0; j < 24; j++) {
        worst = Math.max(
          worst,
          Math.abs(psiReal((i / 40) * RMAX, (j / 24) * TWO_PI, t)),
        );
      }
    }
  }
  assert.ok(worst <= 1 + 1e-12, `the state reached ${worst} of PEAK`);
  assert.ok(worst > 0.7, `the state only ever reaches ${worst} of its budget`);
});

/* --- the mesh ------------------------------------------------------------- */

test("the mesh has every spoke and every ring", () => {
  assert.equal(meshPoints(0).length, MESH_LINES);
});

test("no projected point leaves the panel, at any time", () => {
  for (let k = 0; k < 300; k++) {
    for (const line of meshPoints((k / 300) * TURN * 5)) {
      for (const pair of line.split(" ")) {
        const [x, y] = pair.split(",").map(Number);
        assert.ok(
          x! >= 0 && x! <= PANEL && y! >= 0 && y! <= PANEL,
          `point ${pair} is outside the ${PANEL} panel`,
        );
      }
    }
  }
});

test("every drawn line moves — nothing in the figure is a node", () => {
  /* psi vanishes on the wall, so a ring drawn there would be dead flat forever
     while the rest of the surface turned. The mesh therefore stops just inside
     it. This is the guard on that. */
  const a = meshPoints(0);
  const b = meshPoints(TURN / 6);
  for (let i = 0; i < a.length; i++) {
    assert.notEqual(
      a[i],
      b[i],
      `polyline ${i} is static — it is sitting on a node`,
    );
  }
});

test("the axis markers sit on the axes", () => {
  for (const m of AXES.marks) {
    const onH = Math.abs(m.y - AXES.h.y) < 1e-9;
    const onV = Math.abs(m.x - AXES.v.x) < 1e-9;
    assert.ok(onH || onV, `marker at ${m.x},${m.y} is off both axes`);
    if (onH) assert.ok(m.x >= AXES.h.x1 && m.x <= AXES.h.x2);
    if (onV) assert.ok(m.y >= AXES.v.y1 && m.y <= AXES.v.y2);
  }
  assert.equal(AXES.marks.filter((m) => m.filled).length, 1);
});

test("the mesh stops short of the wall", () => {
  assert.ok(RMAX < 1, "the mesh reaches the wall, where psi is pinned to zero");
  assert.ok(RMAX > 0.85, `RMAX ${RMAX} crops the figure well inside the well`);
});

test("the figure is drawn low enough that the lobes stand up", () => {
  /* The whole look rests on this: a lobe must rise further than the plan is
     deep, or the disc reads as seen from above and the lobes flatten into
     shading. Taken as the best the surface manages over a long window. */
  let crest = 0;
  for (let k = 0; k < 400; k++) {
    const t = (k / 400) * TURN * 5;
    for (let j = 0; j < 24; j++) {
      crest = Math.max(
        crest,
        PLAN_EXTENT.cy - project(0.6, (j / 24) * TWO_PI, t)[1],
      );
    }
  }
  assert.ok(
    crest > PLAN_EXTENT.ry,
    `a lobe rises ${crest.toFixed(1)} against a plan depth of ${PLAN_EXTENT.ry} — too flat`,
  );
});

/* --- the sphere ----------------------------------------------------------- */

test("the projection puts x lower-left, y right, and z straight up", () => {
  const [xx, xy] = blochProject(1, 0, 0);
  const [yx, yy] = blochProject(0, 1, 0);
  const [zx, zy] = blochProject(0, 0, 1);
  assert.ok(
    xx < BLOCH_GEOMETRY.cx && xy > BLOCH_GEOMETRY.cy,
    "x not lower-left",
  );
  assert.ok(
    yx > BLOCH_GEOMETRY.cx && yy > BLOCH_GEOMETRY.cy,
    "y not lower-right",
  );
  assert.ok(Math.abs(zx - BLOCH_GEOMETRY.cx) < 1e-9, "z is not vertical");
  assert.ok(zy < BLOCH_GEOMETRY.cy, "z does not point up");
});

test("the front half of the equator is the half drawn lower", () => {
  const ys = (s: string) => s.split(" ").map((p) => Number(p.split(",")[1]));
  assert.ok(
    Math.max(...ys(BLOCH_GEOMETRY.equatorFront)) >
      Math.max(...ys(BLOCH_GEOMETRY.equatorBack)),
  );
});

test("the state stays on the unit sphere", () => {
  for (let k = 0; k < 400; k++) {
    const [X, Y, Z] = blochState((k / 400) * BLOCH_PERIOD);
    assert.ok(
      Math.abs(Math.hypot(X, Y, Z) - 1) < 1e-9,
      "the state left the sphere",
    );
  }
});

test("the state sweeps a band, not a single circle", () => {
  /* Free precession about z holds theta fixed; that was the old figure and it
     read as one circle. Precession about a tilted axis has to move theta as
     well, over the full band the tilt allows. */
  let lo = Infinity;
  let hi = -Infinity;
  for (let k = 0; k < 600; k++) {
    const { theta } = blochFrame((k / 600) * BLOCH_PERIOD);
    lo = Math.min(lo, theta);
    hi = Math.max(hi, theta);
  }
  const span = hi - lo;
  assert.ok(span > 0.5, `theta only spans ${span} radians — still one circle`);
  /* And it spans exactly what the geometry says. The path is a cone about the
     effective field of half-angle TILT - START, and that axis is itself TILT
     off z — so theta runs from START out to 2*TILT - START, not TILT +- START. */
  assert.ok(Math.abs(lo - START) < 0.02, `low edge ${lo}, want ${START}`);
  assert.ok(
    Math.abs(hi - (2 * TILT - START)) < 0.02,
    `high edge ${hi}, want ${2 * TILT - START}`,
  );
  /* Clear of both poles, so the angle arcs never degenerate. */
  assert.ok(lo > 0.2 && hi < Math.PI - 0.2);
});

test("the azimuth winds right round", () => {
  const seen = new Set<number>();
  for (let k = 0; k < 600; k++) {
    const { phi } = blochFrame((k / 600) * BLOCH_PERIOD);
    /* Clamped: atan2 returns pi inclusive, which would land in a ninth bucket. */
    seen.add(Math.min(7, Math.floor(((phi + Math.PI) / TWO_PI) * 8)));
  }
  assert.equal(seen.size, 8, "the state does not reach every azimuth");
});

test("the trajectory closes, because both turn counts are whole", () => {
  assert.ok(Number.isInteger(NUTATIONS) && Number.isInteger(PRECESSIONS));
  const a = blochState(0);
  const b = blochState(BLOCH_PERIOD);
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(a[i]! - b[i]!) < 1e-9);
  /* Coprime, so it does not close early and retrace itself. */
  const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : x);
  assert.equal(gcd(NUTATIONS, PRECESSIONS), 1);
});

test("the state passes both behind and in front", () => {
  const depths = Array.from({ length: 400 }, (_, k) => {
    const [X, Y, Z] = blochState((k / 400) * BLOCH_PERIOD);
    return blochDepth(X, Y, Z);
  });
  assert.ok(Math.max(...depths) > 0 && Math.min(...depths) < 0);
});

test("the state and its furniture stay inside the panel", () => {
  for (let k = 0; k < 400; k++) {
    const b = blochFrame((k / 400) * BLOCH_PERIOD);
    const d = Math.hypot(
      b.tip[0] - BLOCH_GEOMETRY.cx,
      b.tip[1] - BLOCH_GEOMETRY.cy,
    );
    assert.ok(d <= BLOCH_GEOMETRY.r + 1e-9, "tip escaped the sphere");
    for (const [x, y] of [
      b.tip,
      b.foot,
      b.thetaLabel,
      b.phiLabel,
      b.stateLabel,
    ]) {
      assert.ok(
        x >= 0 && x <= BLOCH_PANEL && y >= 0 && y <= BLOCH_PANEL,
        `a label left the ${BLOCH_PANEL} panel at ${x},${y}`,
      );
    }
  }
});

test("the arcs start on the axes they are measured from", () => {
  const b = blochFrame(BLOCH_PERIOD * 0.3);
  const first = (s: string) => s.split(" ")[0]!.split(",").map(Number);
  /* Points are serialised to 2dp, so compare at that resolution. */
  const near = (x: number, y: number) => Math.abs(x - y) < 0.01;
  const [tx] = first(b.thetaArc);
  assert.ok(near(tx!, BLOCH_GEOMETRY.cx), "theta arc misses z");
  const [px, py] = first(b.phiArc);
  const onX = blochProject(PHI_ARC_R, 0, 0);
  assert.ok(near(px!, onX[0]) && near(py!, onX[1]), "phi arc misses x");
});

test("both figures move slowly", () => {
  assert.ok(TURN >= 60, `the surface turns in ${TURN}s — too fast`);
  assert.ok(
    BLOCH_PERIOD >= 40,
    `the sphere closes in ${BLOCH_PERIOD}s — too fast`,
  );
});
