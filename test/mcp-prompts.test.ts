import test from "node:test";
import assert from "node:assert/strict";
import {
  PROMPTS,
  defaults,
  sentence,
  invalidSlots,
  studyYear,
  CODE_PATTERN,
} from "../src/lib/mcp-prompts.ts";

const byId = (id: string) => PROMPTS.find((p) => p.id === id)!;
const AUTUMN = new Date("2026-09-01T00:00:00Z");

test("every prompt ships filled in, and every default is valid", () => {
  for (const p of PROMPTS) {
    assert.deepEqual(
      invalidSlots(p, defaults(p)),
      [],
      `${p.id} does not start in a state it can be asked from`,
    );
  }
});

test("every slot in the sentence has a definition, and every definition appears", () => {
  for (const p of PROMPTS) {
    const inParts = p.parts
      .filter((x) => typeof x !== "string")
      .map((x) => (x as { slot: string }).slot);
    assert.deepEqual(
      inParts,
      p.slots.map((s) => s.id),
      `${p.id} slots and sentence disagree`,
    );
  }
});

test("the study year is named for the autumn it opens", () => {
  assert.equal(studyYear(new Date("2026-09-01T00:00:00Z")), 2026);
  assert.equal(studyYear(new Date("2027-03-01T00:00:00Z")), 2026);
  assert.equal(studyYear(new Date("2026-07-31T00:00:00Z")), 2025);
});

test("a filled prompt reads as a sentence", () => {
  const p = byId("conflicts");
  assert.equal(
    sentence(p, { a: "TFY4205", b: "FY2045", c: "TMA4130" }),
    "do TFY4205, FY2045 and TMA4130 clash?",
  );
});

test("codes are upper-cased whatever they are typed as", () => {
  assert.equal(
    sentence(byId("grades"), { a: " tdt4100 " }),
    "how many fail TDT4100?",
  );
  assert.deepEqual(
    byId("grades").args({ a: "tdt4100" }, 2026, byId("grades")),
    {
      course_code: "TDT4100",
    },
  );
});

test("an emptied optional slot takes its separator with it", () => {
  const p = byId("conflicts");
  assert.equal(
    sentence(p, { a: "TFY4205", b: "FY2045", c: "" }),
    "do TFY4205, FY2045 clash?",
  );
  assert.equal(
    sentence(p, { a: "TFY4205", b: "", c: "TMA4130" }),
    "do TFY4205 and TMA4130 clash?",
  );
});

test("an emptied optional slot is dropped from the call too", () => {
  const p = byId("conflicts");
  assert.deepEqual(p.args({ a: "TFY4205", b: "FY2045", c: "" }, 2026, p), {
    course_codes: ["TFY4205", "FY2045"],
    year: 2026,
  });
});

test("a required blank blocks the ask; an optional one does not", () => {
  const p = byId("conflicts");
  assert.deepEqual(invalidSlots(p, { a: "TFY4205", b: "FY2045", c: "" }), []);
  assert.deepEqual(invalidSlots(p, { a: "", b: "FY2045", c: "TMA4130" }), [
    "a",
  ]);
});

test("a clash check is never sent with fewer courses than the server accepts", () => {
  const p = byId("conflicts");
  assert.ok(invalidSlots(p, { a: "TFY4205", b: "", c: "" }).length > 0);
});

test("something that is not a course code is refused", () => {
  const p = byId("grades");
  assert.deepEqual(invalidSlots(p, { a: "quantum" }), ["a"]);
  assert.deepEqual(invalidSlots(p, { a: "TDT41" }), ["a"]);
  assert.deepEqual(invalidSlots(p, { a: "TDT4100" }), []);
});

test("the code pattern covers the odd-shaped real codes", () => {
  for (const code of ["TDT4100", "AM201306", "SMF2292F", "GEOG2015", "TIØ4252"])
    assert.ok(CODE_PATTERN.test(code), code);
  for (const code of ["", "2026", "TDT", "TOOLONGNAME4100"])
    assert.ok(!CODE_PATTERN.test(code), code);
});

test("the free-text prompt is not held to the course-code pattern", () => {
  const p = byId("search");
  assert.deepEqual(invalidSlots(p, { a: "kvantemekanikk" }), []);
  assert.deepEqual(p.args({ a: "kvantemekanikk" }, 2026, p), {
    query: "kvantemekanikk",
    year: 2026,
  });
});

test("each prompt names a distinct tool, so the picker covers six of them", () => {
  const tools = PROMPTS.map((p) => p.tool);
  assert.equal(new Set(tools).size, tools.length);
});
