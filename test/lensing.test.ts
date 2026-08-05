import test from "node:test";
import assert from "node:assert/strict";
import { deflection, orbitCamera, FRAGMENT_SHADER, VERTEX_SHADER } from "../src/lib/lensing.ts";

test("deflection follows the weak-field limit 2rs/b", () => {
  assert.ok(Math.abs(deflection(100, 1) - 0.02) < 1e-9);
});

test("deflection grows as the impact parameter shrinks", () => {
  assert.ok(deflection(10, 1) > deflection(100, 1));
});

test("deflection is zero for light that never approaches", () => {
  assert.ok(deflection(1e9, 1) < 1e-8);
});

test("camera stays on its orbit radius", () => {
  const { eye } = orbitCamera(0.7, 0.3, 12);
  assert.ok(Math.abs(Math.hypot(eye[0], eye[1], eye[2]) - 12) < 1e-6);
});

test("elevation moves the camera vertically", () => {
  assert.ok(orbitCamera(0, 0.5, 10).eye[1] > orbitCamera(0, 0, 10).eye[1]);
});

test("azimuth sweeps the camera around the hole", () => {
  const a = orbitCamera(0, 0, 10).eye;
  const b = orbitCamera(Math.PI / 2, 0, 10).eye;
  assert.ok(Math.abs(a[0] - b[0]) > 1);
});

test("the shaders declare an es 3.0 version and a precision qualifier", () => {
  assert.ok(FRAGMENT_SHADER.startsWith("#version 300 es"));
  assert.ok(VERTEX_SHADER.startsWith("#version 300 es"));
  assert.match(FRAGMENT_SHADER, /precision\s+(highp|mediump)\s+float/);
});

test("the fragment shader integrates the geodesic equation it claims to", () => {
  // u'' = -u + 1.5 rs u^2 is the whole physics of the page; if this term is
  // gone, the render is decorative rather than a simulation.
  assert.match(FRAGMENT_SHADER, /1\.5\s*\*\s*RS\s*\*\s*u\s*\*\s*u/);
  assert.match(FRAGMENT_SHADER, /outColor/);
});
