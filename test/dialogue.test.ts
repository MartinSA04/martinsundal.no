import test from "node:test";
import assert from "node:assert/strict";
import { createDialogue } from "../src/lib/dialogue.ts";

test("starts on the first page", () => {
  const d = createDialogue(["one", "two", "three"]);
  assert.equal(d.current(), "one");
  assert.equal(d.index(), 0);
  assert.equal(d.done(), false);
});

test("advance walks forward and reports when it moved", () => {
  const d = createDialogue(["one", "two"]);
  assert.equal(d.advance(), true);
  assert.equal(d.current(), "two");
  assert.equal(d.done(), true);
});

test("advancing past the end is a no-op", () => {
  const d = createDialogue(["only"]);
  assert.equal(d.advance(), false);
  assert.equal(d.current(), "only");
  assert.equal(d.index(), 0);
});

test("an empty script is immediately done and never throws", () => {
  const d = createDialogue([]);
  assert.equal(d.done(), true);
  assert.equal(d.current(), "");
  assert.equal(d.advance(), false);
  assert.equal(d.index(), 0);
});

test("reset returns to the first page", () => {
  const d = createDialogue(["a", "b", "c"]);
  d.advance();
  d.advance();
  assert.equal(d.done(), true);
  d.reset();
  assert.equal(d.index(), 0);
  assert.equal(d.current(), "a");
  assert.equal(d.done(), false);
});

test("total reports the script length", () => {
  assert.equal(createDialogue(["a", "b", "c"]).total(), 3);
  assert.equal(createDialogue([]).total(), 0);
});
