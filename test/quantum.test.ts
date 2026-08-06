import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AXES,
  BLOCH_GEOMETRY,
  BLOCH_PANEL,
  BLOCH_PERIOD,
  J21,
  M,
  PHI_ARC_R,
  MESH_LINES,
  PANEL,
  PEAK,
  PERIOD,
  PLAN_EXTENT,
  RMAX,
  besselJ,
  blochDepth,
  blochFrame,
  blochProject,
  meshPoints,
  phaseAt,
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
    [2, 5, 0.046565],
  ];
  for (const [m, x, want] of cases) {
    assert.ok(
      Math.abs(besselJ(m, x) - want) < 1e-6,
      `J_${m}(${x}) = ${besselJ(m, x)}, want ${want}`,
    );
  }
});

test("J21 is a zero of J_2, and the first one", () => {
  assert.ok(Math.abs(besselJ(2, J21)) < 1e-12, `J_2(J21) = ${besselJ(2, J21)}`);
  for (let i = 1; i < 400; i++) {
    const x = (i / 400) * J21;
    assert.ok(besselJ(2, x) > 1e-9, `J_2 crossed zero early, at ${x}`);
  }
});

/* --- the state ------------------------------------------------------------ */

test("psi vanishes on the wall of the well, at every time", () => {
  for (let k = 0; k < 32; k++) {
    const phase = (k / 32) * TWO_PI;
    for (let i = 0; i < 24; i++) {
      const theta = (i / 24) * TWO_PI;
      assert.ok(
        Math.abs(psiReal(1, theta, phase)) < 1e-12,
        `psi(1, ${theta}, ${phase}) is not zero on the wall`,
      );
    }
  }
});

test("psi vanishes on the axis, as an m=2 state must", () => {
  for (let k = 0; k < 16; k++) {
    assert.ok(Math.abs(psiReal(0, 0, (k / 16) * TWO_PI)) < 1e-12);
  }
});

test("psi is exactly periodic in phase", () => {
  for (const [r, th] of [
    [0.3, 0.4],
    [0.59, 2.1],
    [0.85, 5.0],
  ]) {
    for (let k = 0; k < 8; k++) {
      const p = (k / 8) * TWO_PI;
      assert.ok(
        Math.abs(psiReal(r!, th!, p) - psiReal(r!, th!, p + TWO_PI)) < 1e-12,
      );
    }
  }
});

test("the pattern is a rigid rotation, and repeats after half a turn", () => {
  /* Rotating by the phase over m reproduces the field exactly: that is what
     makes it rigid rather than rippling, and it is the property that lets the
     loop close at all for a circular well. */
  for (const r of [0.25, 0.6, 0.9]) {
    for (let k = 0; k < 12; k++) {
      const phase = (k / 12) * TWO_PI;
      assert.ok(
        Math.abs(psiReal(r, 0.7 + phase / M, phase) - psiReal(r, 0.7, 0)) <
          1e-12,
        "the pattern is not rotating rigidly",
      );
      /* Half a turn of phase is a whole period of the drawn shape. */
      assert.ok(
        Math.abs(
          psiReal(r, 0.7, phase) - psiReal(r, 0.7, phase + Math.PI * 2),
        ) < 1e-12,
      );
    }
  }
});

test("the state has four lobes, alternating in sign", () => {
  const signs = [0, 1, 2, 3].map((q) =>
    Math.sign(psiReal(0.594, (q * Math.PI) / 2, 0)),
  );
  assert.deepEqual(signs, [1, -1, 1, -1]);
});

test("the drawn height is normalised to exactly +-1", () => {
  let peak = 0;
  for (let i = 0; i <= 400; i++) {
    for (let k = 0; k < 40; k++) {
      peak = Math.max(
        peak,
        Math.abs(psiReal(i / 400, (k / 40) * TWO_PI, (k / 40) * TWO_PI)),
      );
    }
  }
  assert.ok(peak <= 1 + 1e-9, `height reached ${peak}`);
  assert.ok(peak > 0.999, `height only reached ${peak}`);
  assert.ok(PEAK > 0.48 && PEAK < 0.49, `PEAK ${PEAK} is not J_2's maximum`);
});

/* --- the mesh ------------------------------------------------------------- */

test("the mesh has every spoke and every ring", () => {
  assert.equal(meshPoints(0).length, MESH_LINES);
});

test("no projected point leaves the panel, at any phase", () => {
  for (let k = 0; k < 96; k++) {
    for (const line of meshPoints((k / 96) * TWO_PI)) {
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

test("the mesh returns to its opening frame after one period", () => {
  assert.deepEqual(meshPoints(phaseAt(0)), meshPoints(phaseAt(PERIOD)));
});

test("every drawn line moves — nothing in the figure is a node", () => {
  /* psi vanishes on the wall, so a ring drawn there would be dead flat forever
     while the rest of the surface turned. The mesh therefore stops just inside
     it. This is the guard on that: sample each polyline at two phases and
     require it to have changed. */
  const a = meshPoints(0);
  const b = meshPoints(Math.PI / 3);
  for (let i = 0; i < a.length; i++) {
    assert.notEqual(
      a[i],
      b[i],
      `polyline ${i} is static — it is sitting on a node`,
    );
  }
});

test("the mesh stops short of the wall", () => {
  assert.ok(RMAX < 1, "the mesh reaches the wall, where psi is pinned to zero");
  assert.ok(RMAX > 0.85, `RMAX ${RMAX} crops the figure well inside the well`);
  /* Still far enough out to be past the crest of J_2, so the lobes are whole. */
  const crest = 0.594;
  assert.ok(RMAX > crest, "the mesh is cropped inside the lobe crest");
});

test("the figure is drawn low enough that the lobes stand up", () => {
  /* The whole look rests on this: the height of a lobe must beat the depth of
     the plan, or the disc reads as seen from above and the lobes flatten into
     shading. */
  const crest = PLAN_EXTENT.cy - project(0.594, Math.PI / 2, Math.PI)[1];
  assert.ok(
    crest > PLAN_EXTENT.ry,
    `a lobe rises ${crest.toFixed(1)} against a plan depth of ${PLAN_EXTENT.ry} — too flat`,
  );
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

/* --- the sphere ----------------------------------------------------------- */

test("the projection puts x lower-left, y right, and z straight up", () => {
  const [xx, xy] = blochProject(1, 0, 0);
  const [yx, yy] = blochProject(0, 1, 0);
  const [zx, zy] = blochProject(0, 0, 1);
  assert.ok(
    xx < BLOCH_GEOMETRY.cx && xy > BLOCH_GEOMETRY.cy,
    "x is not lower-left",
  );
  assert.ok(
    yx > BLOCH_GEOMETRY.cx && yy > BLOCH_GEOMETRY.cy,
    "y is not lower-right",
  );
  assert.ok(Math.abs(zx - BLOCH_GEOMETRY.cx) < 1e-9, "z is not vertical");
  assert.ok(zy < BLOCH_GEOMETRY.cy, "z does not point up");
});

test("the front half of the equator is the half drawn lower", () => {
  const front = BLOCH_GEOMETRY.equatorFront
    .split(" ")
    .map((p) => Number(p.split(",")[1]));
  const back = BLOCH_GEOMETRY.equatorBack
    .split(" ")
    .map((p) => Number(p.split(",")[1]));
  assert.ok(Math.max(...front) > Math.max(...back));
  assert.ok(Math.min(...front) >= Math.min(...back) - 1e-9);
});

test("the state stays on the sphere and inside the panel", () => {
  for (let k = 0; k < 64; k++) {
    const b = blochFrame((k / 64) * BLOCH_PERIOD);
    const d = Math.hypot(
      b.tip[0] - BLOCH_GEOMETRY.cx,
      b.tip[1] - BLOCH_GEOMETRY.cy,
    );
    assert.ok(
      d <= BLOCH_GEOMETRY.r + 1e-9,
      `tip escaped by ${d - BLOCH_GEOMETRY.r}`,
    );
    for (const [x, y] of [b.tip, b.foot, b.thetaLabel, b.phiLabel]) {
      assert.ok(x >= 0 && x <= BLOCH_PANEL && y >= 0 && y <= BLOCH_PANEL);
    }
  }
});

test("the arcs start on the axes they are measured from", () => {
  const b = blochFrame(BLOCH_PERIOD * 0.3);
  const first = (s: string) => s.split(" ")[0]!.split(",").map(Number);
  /* Points are serialised to 2dp, so compare at that resolution rather than
     against an unrounded projection. */
  const near = (a: number, b: number) => Math.abs(a - b) < 0.01;
  /* The polar arc starts on the z axis. */
  const [tx] = first(b.thetaArc);
  assert.ok(near(tx!, BLOCH_GEOMETRY.cx), "theta arc misses z");
  /* The azimuth arc starts on the x axis. */
  const [px, py] = first(b.phiArc);
  const onX = blochProject(PHI_ARC_R, 0, 0);
  assert.ok(
    near(px!, onX[0]) && near(py!, onX[1]),
    "phi arc does not start on x",
  );
});

test("the tip passes behind and in front exactly once each", () => {
  const flags = Array.from(
    { length: 240 },
    (_, k) => blochFrame((k / 240) * BLOCH_PERIOD).behind,
  );
  let crossings = 0;
  for (let i = 0; i < flags.length; i++) {
    if (flags[i] !== flags[(i + 1) % flags.length]) crossings++;
  }
  assert.equal(crossings, 2);
  assert.ok(flags.includes(true) && flags.includes(false));
});

test("depth agrees with the drawn near half of the equator", () => {
  for (let k = 0; k < 48; k++) {
    const t = (k / 48) * TWO_PI;
    const near = blochDepth(Math.cos(t), Math.sin(t), 0) > 0;
    const [, y] = blochProject(Math.cos(t), Math.sin(t), 0);
    assert.equal(
      near,
      y > BLOCH_GEOMETRY.cy,
      "a near point of the equator was drawn above the centre line",
    );
  }
});

test("both figures loop, and slowly", () => {
  assert.ok(PERIOD >= 60, `the surface turns in ${PERIOD}s — too fast`);
  assert.ok(
    BLOCH_PERIOD >= 40,
    `the sphere precesses in ${BLOCH_PERIOD}s — too fast`,
  );
  const a = blochFrame(0);
  const b = blochFrame(BLOCH_PERIOD);
  assert.ok(Math.abs(a.tip[0] - b.tip[0]) < 1e-9);
  assert.ok(Math.abs(a.tip[1] - b.tip[1]) < 1e-9);
});
