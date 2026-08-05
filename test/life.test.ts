import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parsePlan, step } from "../src/lib/life.ts";

test("a blinker oscillates with period two", () => {
  const w = 5,
    h = 5;
  const cells = new Uint8Array(w * h);
  cells[1 * w + 2] = cells[2 * w + 2] = cells[3 * w + 2] = 1;
  const one = step(cells, w, h);
  assert.deepEqual([...one.slice(2 * w + 1, 2 * w + 4)], [1, 1, 1]);
  assert.deepEqual([...step(one, w, h)], [...cells]);
});

test("a block is still life", () => {
  const w = 4,
    h = 4;
  const cells = new Uint8Array(w * h);
  cells[1 * w + 1] = cells[1 * w + 2] = cells[2 * w + 1] = cells[2 * w + 2] = 1;
  assert.deepEqual([...step(cells, w, h)], [...cells]);
});

test("the board does not wrap at the edges", () => {
  const w = 3,
    h = 3;
  const cells = new Uint8Array(w * h);
  cells[0] = cells[1] = cells[2] = 1;
  // A horizontal triple on the top row becomes a vertical pair, not a torus
  // blinker: the centre survives and the cell below it is born.
  const next = step(cells, w, h);
  assert.equal(next[w + 1], 1);
  assert.equal(next[0], 0);
  assert.equal(next[2], 0);
});

test("parsePlan reads the board size header and the coordinates", () => {
  const plan = parsePlan("# board_size=4,3\n0,0\n3,2\n");
  assert.equal(plan.width, 4);
  assert.equal(plan.height, 3);
  assert.equal(plan.cells[0], 1);
  assert.equal(plan.cells[2 * 4 + 3], 1);
  assert.equal(
    plan.cells.reduce((n, c) => n + c, 0),
    2,
  );
});

test("parsePlan infers a board size when the header is absent", () => {
  const plan = parsePlan("2,1\n0,0\n");
  assert.equal(plan.width, 3);
  assert.equal(plan.height, 2);
});

test("the hero plan is the 356x192 board the layout expects", () => {
  const plan = parsePlan(readFileSync("public/martin_plan.txt", "utf8"));
  assert.equal(plan.width, 356);
  assert.equal(plan.height, 192);
});

test("the hero plan converges to a stable board and holds it", () => {
  const plan = parsePlan(readFileSync("public/martin_plan.txt", "utf8"));
  let cells = plan.cells;
  for (let i = 0; i < 277; i++) cells = step(cells, plan.width, plan.height);

  const settled = step(cells, plan.width, plan.height);
  assert.deepEqual(
    [...settled],
    [...cells],
    "board should be stable at generation 277",
  );

  const live = cells.reduce((n, c) => n + c, 0);
  assert.ok(live > 0, "board must not be empty");

  // The word sits in the centre band; if it drifted out the layout mask would
  // clip it. Rows 40%..60% of the board must hold most of the live cells.
  let centre = 0;
  const from = Math.floor(plan.height * 0.35) * plan.width;
  const to = Math.floor(plan.height * 0.65) * plan.width;
  for (let i = from; i < to; i++) centre += cells[i]!;
  assert.ok(
    centre / live > 0.9,
    `expected the word centred, got ${centre}/${live}`,
  );
});
