import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BLOCH_GEOMETRY,
  BLOCH_PERIOD,
  BLOCH_PANEL,
  LINES,
  MODES,
  PANEL,
  PEAK,
  PERIOD,
  SAMPLES,
  amplitudeBound,
  blochFrame,
  eigenstate,
  meshPoints,
  project,
  psiReal,
  tauAt,
} from "../src/lib/quantum.ts";

const TWO_PI = 2 * Math.PI;

/* --- the properties the figure rests on ----------------------------------- */

test("the E=5 pair is degenerate", () => {
  const pair = MODES.filter((m) => m.energy === 5);
  assert.equal(pair.length, 2, "the rotating saddle needs exactly two modes");
  assert.deepEqual(
    pair.map((m) => [m.n, m.m]),
    [
      [2, 1],
      [1, 2],
    ],
  );
});

test("energies match n^2 + m^2", () => {
  for (const mode of MODES) {
    assert.equal(
      mode.energy,
      mode.n ** 2 + mode.m ** 2,
      `mode ${mode.n}${mode.m}`,
    );
  }
});

test("the two detunings differ, so the beats never lock", () => {
  const detunings = MODES.filter((m) => m.energy !== 5).map((m) =>
    Math.abs(m.energy - 5),
  );
  assert.deepEqual(detunings.sort(), [3, 5]);
  assert.notEqual(
    detunings[0],
    detunings[1],
    "equal detunings would move the two swells as one — this is why phi_22 is not in the set",
  );
});

test("every energy is an integer, which is what closes the loop", () => {
  for (const mode of MODES) {
    assert.ok(
      Number.isInteger(mode.energy),
      `E=${mode.energy} is not an integer`,
    );
  }
});

/* --- the state ------------------------------------------------------------ */

test("psi is exactly periodic over tau", () => {
  for (const [x, y] of [
    [0.23, 0.61],
    [0.5, 0.5],
    [0.87, 0.14],
    [0.33, 0.72],
  ]) {
    for (let k = 0; k < 8; k++) {
      const tau = (k / 8) * TWO_PI;
      assert.ok(
        Math.abs(psiReal(x, y, tau) - psiReal(x, y, tau + TWO_PI)) < 1e-12,
        `psi drifted at tau=${tau}`,
      );
    }
  }
});

test("psi vanishes on all four walls, at every time", () => {
  for (let k = 0; k < 24; k++) {
    const tau = (k / 24) * TWO_PI;
    for (let i = 0; i <= 20; i++) {
      const s = i / 20;
      for (const [x, y] of [
        [0, s],
        [1, s],
        [s, 0],
        [s, 1],
      ]) {
        assert.ok(
          Math.abs(psiReal(x, y, tau)) < 1e-12,
          `psi(${x},${y},${tau}) is not zero on the wall`,
        );
      }
    }
  }
});

test("the eigenstates are orthogonal", () => {
  const n = 120;
  const pairs: [number, number][] = [
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 2],
    [1, 3],
    [2, 3],
  ];
  for (const [a, b] of pairs) {
    const ma = MODES[a];
    const mb = MODES[b];
    let sum = 0;
    for (let i = 1; i < n; i++) {
      for (let j = 1; j < n; j++) {
        const x = i / n;
        const y = j / n;
        sum +=
          eigenstate(ma.n, ma.m, x, y) *
          eigenstate(mb.n, mb.m, x, y) *
          (1 / n) ** 2;
      }
    }
    assert.ok(
      Math.abs(sum) < 1e-3,
      `<phi_${ma.n}${ma.m}|phi_${mb.n}${mb.m}> = ${sum}, should be 0`,
    );
  }
});

test("the saddle rotates rather than breathing", () => {
  /* A state that only breathes returns to a scalar multiple of itself: the
     ratio of the field at two fixed points stays constant. A rotating one does
     not. Sampling two points off the diagonal catches the difference. */
  const ratios: number[] = [];
  for (let k = 0; k < 12; k++) {
    const tau = (k / 12) * TWO_PI;
    ratios.push(psiReal(0.3, 0.7, tau) / psiReal(0.7, 0.3, tau));
  }
  const spread = Math.max(...ratios) - Math.min(...ratios);
  assert.ok(
    spread > 1,
    `field ratio barely moved (${spread}) — the saddle is not turning`,
  );
});

/* --- normalisation -------------------------------------------------------- */

test("PEAK is below the rigorous amplitude bound", () => {
  let bound = 0;
  for (let i = 0; i <= 60; i++) {
    for (let j = 0; j <= 60; j++) {
      bound = Math.max(bound, amplitudeBound(i / 60, j / 60));
    }
  }
  assert.ok(PEAK <= bound, `PEAK ${PEAK} exceeds the bound ${bound}`);
  assert.ok(
    PEAK > bound * 0.5,
    `PEAK ${PEAK} is far under the bound ${bound} — the surface would read flat`,
  );
});

test("no drawn height escapes the normalisation over a full period", () => {
  let worst = 0;
  for (let k = 0; k < 600; k++) {
    const tau = (k / 600) * TWO_PI;
    for (let i = 0; i < LINES; i++) {
      for (let j = 0; j < SAMPLES; j++) {
        const x = i / (LINES - 1);
        const y = j / (SAMPLES - 1);
        worst = Math.max(worst, Math.abs(psiReal(x, y, tau)) / PEAK);
      }
    }
  }
  assert.ok(worst <= 1, `a drawn point reached ${worst} of PEAK`);
  assert.ok(
    worst > 0.9,
    `the surface only reaches ${worst} of its height budget`,
  );
});

/* --- the mesh ------------------------------------------------------------- */

test("the mesh has both families, fully sampled", () => {
  const lines = meshPoints(0);
  assert.equal(lines.length, LINES * 2);
  for (const line of lines) {
    assert.equal(line.split(" ").length, SAMPLES);
  }
});

test("no projected point leaves the panel, at any time", () => {
  for (let k = 0; k < 120; k++) {
    const tau = (k / 120) * TWO_PI;
    for (const line of meshPoints(tau)) {
      for (const pair of line.split(" ")) {
        const [x, y] = pair.split(",").map(Number);
        assert.ok(
          x >= 0 && x <= PANEL && y >= 0 && y <= PANEL,
          `point ${pair} is outside the ${PANEL} panel at tau=${tau}`,
        );
      }
    }
  }
});

test("the mesh returns to its opening frame after one period", () => {
  assert.deepEqual(meshPoints(tauAt(0)), meshPoints(tauAt(PERIOD)));
});

test("the flat plan is a centred diamond", () => {
  const [cx, cy] = project(0.5, 0.5, 0);
  assert.ok(Math.abs(cx - PANEL / 2) < 1e-9);
  assert.ok(Math.abs(cy - PANEL / 2) < 1e-9);
});

/* --- the sphere ----------------------------------------------------------- */

test("the sphere precesses on a circle of constant latitude", () => {
  const heights = new Set<string>();
  for (let k = 0; k < 24; k++) {
    const { tip } = blochFrame((k / 24) * BLOCH_PERIOD);
    const dx = tip[0] - BLOCH_GEOMETRY.cx;
    const dy = tip[1] - BLOCH_GEOMETRY.orbit.cy;
    /* On the drawn ellipse: (dx/rx)^2 + (dy/ry)^2 = 1. */
    const r =
      (dx / BLOCH_GEOMETRY.orbit.rx) ** 2 + (dy / BLOCH_GEOMETRY.orbit.ry) ** 2;
    heights.add(r.toFixed(6));
  }
  assert.deepEqual(
    [...heights],
    ["1.000000"],
    "the tip left its precession circle",
  );
});

test("the tip stays inside the silhouette", () => {
  for (let k = 0; k < 48; k++) {
    const { tip } = blochFrame((k / 48) * BLOCH_PERIOD);
    const d = Math.hypot(
      tip[0] - BLOCH_GEOMETRY.cx,
      tip[1] - BLOCH_GEOMETRY.cy,
    );
    assert.ok(
      d <= BLOCH_GEOMETRY.r + 1e-9,
      `tip escaped the sphere by ${d - BLOCH_GEOMETRY.r}`,
    );
  }
});

test("the tip passes behind and in front exactly once each", () => {
  const flags: boolean[] = [];
  for (let k = 0; k < 200; k++) {
    flags.push(blochFrame((k / 200) * BLOCH_PERIOD).behind);
  }
  let crossings = 0;
  for (let i = 0; i < flags.length; i++) {
    if (flags[i] !== flags[(i + 1) % flags.length]) crossings++;
  }
  assert.equal(
    crossings,
    2,
    "free precession crosses the silhouette twice per turn",
  );
  assert.ok(flags.includes(true) && flags.includes(false));
});

test("the sphere's period is exactly half the surface's", () => {
  assert.equal(PERIOD / BLOCH_PERIOD, 2);
  const a = blochFrame(0);
  const b = blochFrame(PERIOD);
  assert.ok(Math.abs(a.tip[0] - b.tip[0]) < 1e-9);
  assert.ok(Math.abs(a.tip[1] - b.tip[1]) < 1e-9);
});

test("the sphere's geometry fits its panel", () => {
  const { cx, cy, r, pole } = BLOCH_GEOMETRY;
  assert.ok(cx - r >= 0 && cx + r <= BLOCH_PANEL);
  assert.ok(cy - pole >= 0 && cy + pole <= BLOCH_PANEL);
});
