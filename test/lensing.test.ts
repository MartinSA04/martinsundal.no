import test from "node:test";
import assert from "node:assert/strict";
import {
  deflection,
  criticalImpactParameter,
  traceRay,
  rayFan,
} from "../src/lib/lensing.ts";

test("deflection follows the weak-field limit 2rs/b", () => {
  assert.ok(Math.abs(deflection(100, 1) - 0.02) < 1e-9);
});

test("deflection grows as the impact parameter shrinks", () => {
  assert.ok(deflection(10, 1) > deflection(100, 1));
});

test("critical impact parameter is 3root3/2 rs", () => {
  assert.ok(Math.abs(criticalImpactParameter(1) - 2.598076211) < 1e-6);
});

test("light aimed inside b_crit is captured", () => {
  const b = criticalImpactParameter(1) * 0.85;
  assert.equal(traceRay(b).captured, true);
});

test("light aimed outside b_crit escapes, however sharply bent", () => {
  const b = criticalImpactParameter(1) * 1.15;
  assert.equal(traceRay(b).captured, false);
});

test("a distant ray is deflected by about 2rs/b", () => {
  // The whole point of the u^2 term. Einstein's 1915 result.
  const b = 40;
  const ray = traceRay(b, { maxRadius: 400, dphi: 0.004 });
  assert.equal(ray.captured, false);
  const predicted = deflection(b, 1);
  assert.ok(
    Math.abs(ray.deflected - predicted) < predicted * 0.15,
    `deflected ${ray.deflected} vs predicted ${predicted}`,
  );
});

test("a captured ray ends at or inside the horizon", () => {
  const ray = traceRay(1.5);
  assert.equal(ray.captured, true);
  const [x, y] = ray.points.at(-1)!;
  assert.ok(Math.hypot(x, y) <= 1.001, "last point should be at the horizon");
});

test("traced points are finite and inside the frame", () => {
  const ray = traceRay(6, { maxRadius: 40 });
  assert.ok(ray.points.length > 10);
  for (const [x, y] of ray.points) {
    assert.ok(Number.isFinite(x) && Number.isFinite(y));
    assert.ok(Math.hypot(x, y) <= 40.5);
  }
});

test("the fan is mirrored about the axis", () => {
  const rays = rayFan(4, 10);
  assert.equal(rays.length, 8);
  const [a, b] = [rays[0]!, rays[1]!];
  assert.equal(a.points.length, b.points.length);
  assert.ok(Math.abs(a.points[3]![1] + b.points[3]![1]) < 1e-12);
});

test("the fan spans captured and escaping rays", () => {
  const rays = rayFan(12, 8);
  assert.ok(rays.some((r) => r.captured), "expected some captured");
  assert.ok(rays.some((r) => !r.captured), "expected some to escape");
});
