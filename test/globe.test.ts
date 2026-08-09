import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CALLOUT,
  MERIDIANS,
  MERIDIAN_SLOTS,
  ORIGIN,
  PANEL,
  START_LON,
  TURN,
  VIEW,
  crosshair,
  leader,
  longitudeAt,
  meridianRuns,
  originAt,
  parallelRuns,
  poles,
  project,
} from "../src/lib/globe.ts";

/* --- the projection ------------------------------------------------------- */

test("the view centre projects to the centre of the panel", () => {
  const p = project(VIEW.lat0, START_LON, START_LON);
  assert.ok(Math.abs(p.x - VIEW.cx) < 1e-9);
  assert.ok(Math.abs(p.y - VIEW.cy) < 1e-9);
  assert.equal(p.front, true);
});

test("the antipode of the view centre is on the far side", () => {
  const p = project(-VIEW.lat0, START_LON + 180, START_LON);
  assert.equal(p.front, false);
});

test("nothing projects outside the limb", () => {
  for (let lat = -90; lat <= 90; lat += 5) {
    for (let lon = -180; lon <= 180; lon += 5) {
      const p = project(lat, lon, START_LON);
      const r = Math.hypot(p.x - VIEW.cx, p.y - VIEW.cy);
      assert.ok(r <= VIEW.R + 1e-9, `${lat},${lon} fell outside the limb`);
    }
  }
});

test("a point 90 degrees from the view centre lands exactly on the limb", () => {
  /* Straight up the central meridian from the view centre. */
  const p = project(VIEW.lat0 + 90, START_LON, START_LON);
  const r = Math.hypot(p.x - VIEW.cx, p.y - VIEW.cy);
  assert.ok(Math.abs(r - VIEW.R) < 1e-9);
});

/* --- what the turn does and does not move --------------------------------- */

test("both poles sit on the vertical through the centre, north near and south far", () => {
  const { north, south } = poles();
  assert.ok(Math.abs(north.x - VIEW.cx) < 1e-9);
  assert.ok(Math.abs(south.x - VIEW.cx) < 1e-9);
  assert.equal(north.front, true);
  assert.equal(south.front, false);
  assert.ok(north.y < VIEW.cy && south.y > VIEW.cy);
});

test("the projection depends on the longitude difference only", () => {
  /* Which is the whole reason turning the globe moves so little of it. */
  for (const lon0 of [START_LON, -130, 71.5, 204]) {
    for (const delta of [-150, -37, 0, 12.5, 96]) {
      const a = project(40, lon0 + delta, lon0);
      const b = project(40, START_LON + delta, START_LON);
      assert.ok(Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9);
      assert.equal(a.front, b.front);
    }
  }
});

test("a parallel traces one fixed ellipse whatever the longitude", () => {
  /* The claim the optimisation rests on: turning the globe slides points along
     a circle of latitude without changing the curve drawn, so every parallel is
     computed once at build time and never touched again. Checked against the
     ellipse the parallel satisfies, which is the curve itself rather than any
     particular sampling of it. */
  const RADIANS = Math.PI / 180;
  for (const lat of [-60, -15, 0, 40, 75]) {
    const p = lat * RADIANS;
    const p0 = VIEW.lat0 * RADIANS;
    const a = VIEW.R * Math.cos(p);
    const b = VIEW.R * Math.sin(p0) * Math.cos(p);
    const yc = VIEW.cy - VIEW.R * Math.cos(p0) * Math.sin(p);
    for (const lon0 of [START_LON, -130, 71.5, 204]) {
      for (let lon = -180; lon <= 180; lon += 7) {
        const q = project(lat, lon, lon0);
        const on = ((q.x - VIEW.cx) / a) ** 2 + ((q.y - yc) / b) ** 2;
        assert.ok(
          Math.abs(on - 1) < 1e-9,
          `lat ${lat} lon ${lon} left the ellipse`,
        );
      }
    }
  }
});

test("a meridian never breaks into more runs than there are slots", () => {
  for (let t = 0; t < 360; t += 7) {
    const lon0 = START_LON - t;
    for (let k = 0; k < MERIDIANS; k++) {
      const runs = meridianRuns(k, lon0);
      assert.ok(
        runs.length <= MERIDIAN_SLOTS,
        `meridian ${k} at lon0 ${lon0} broke into ${runs.length} runs`,
      );
    }
  }
});

test("every meridian is drawn, in both halves, at the opening longitude", () => {
  const runs = Array.from({ length: MERIDIANS }, (_, k) =>
    meridianRuns(k, START_LON),
  );
  assert.equal(runs.length, MERIDIANS);
  assert.ok(runs.every((r) => r.length > 0));
  assert.ok(runs.some((r) => r.some((s) => s.front)));
  assert.ok(runs.some((r) => r.some((s) => !s.front)));
});

test("parallels are emitted for every step between the poles", () => {
  const ps = parallelRuns();
  assert.equal(ps.length, 11);
  assert.ok(ps.some((p) => p.lat === 0));
  assert.ok(ps.every((p) => p.runs.length > 0));
});

/* --- the origin ----------------------------------------------------------- */

test("the origin passes behind the globe and comes back once per turn", () => {
  const seen: boolean[] = [];
  for (let t = 0; t < TURN; t += 1) seen.push(originAt(longitudeAt(t)).front);
  assert.ok(seen.includes(true), "the origin is never visible");
  assert.ok(seen.includes(false), "the origin never goes behind");
  /* Far more of the turn in front than behind, which is why the marker is worth
     putting on the near side at all. */
  const behind = seen.filter((f) => !f).length;
  assert.ok(
    behind > 0 && behind < seen.length / 3,
    `behind for ${behind}s of ${TURN}s`,
  );
});

test("the origin is on the near side when the plate is first drawn", () => {
  assert.equal(originAt(START_LON).front, true);
});

test("the leader always reaches from the callout toward the origin", () => {
  for (let t = 0; t < TURN; t += 3) {
    const p = originAt(longitudeAt(t));
    const { line, head } = leader(p);
    assert.match(line, /^M[-\d.]+ [-\d.]+L[-\d.]+ [-\d.]+$/);
    assert.match(head, /z$/);
    assert.ok(!line.includes("NaN") && !head.includes("NaN"));
  }
});

test("the crosshair is centred on the origin", () => {
  const p = originAt(START_LON);
  assert.ok(crosshair(p).startsWith(`M${Math.round((p.x - 11) * 10) / 10} `));
});

/* --- the clock ------------------------------------------------------------ */

test("one turn is one full revolution, and it runs eastward", () => {
  assert.equal(longitudeAt(0), START_LON);
  assert.ok(Math.abs(longitudeAt(TURN) - (START_LON - 360)) < 1e-9);
  /* Decreasing longitude puts features left to right across the disc. */
  const a = originAt(longitudeAt(0));
  const b = originAt(longitudeAt(1));
  assert.ok(b.x > a.x, "the origin should travel east across the near side");
});

/* --- the frame ------------------------------------------------------------ */

test("the callout sits inside the panel, clear of the limb", () => {
  assert.ok(CALLOUT.x > 0 && CALLOUT.y > 0);
  assert.ok(CALLOUT.x < PANEL && CALLOUT.y < PANEL);
  assert.ok(
    Math.hypot(CALLOUT.x - VIEW.cx, CALLOUT.y - VIEW.cy) > VIEW.R * 0.6,
  );
});

test("the datum is the one Fig. 00 prints", () => {
  assert.equal(Number(ORIGIN.lat.toFixed(1)), 63.4);
});
