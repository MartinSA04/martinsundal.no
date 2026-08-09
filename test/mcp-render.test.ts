import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderResult } from "../src/lib/mcp-render.ts";

/**
 * Driven by the captured responses in public/mcp-snapshot.json, so these run
 * against shapes the server actually produced rather than shapes invented to
 * suit the renderer.
 */
const snapshot = JSON.parse(readFileSync("public/mcp-snapshot.json", "utf8"));

const answer = (question: string) => {
  const snap = snapshot.questions[question];
  assert.ok(snap, `no capture for "${question}" — re-run the capture script`);
  const text = JSON.parse(snap.response)
    .result.content.map((c: { text: string }) => c.text)
    .join("\n");
  return {
    tool: snap.tool,
    ...renderResult(snap.tool, JSON.parse(text), text, snap.args.query ?? ""),
  };
};

test("a catalog search says how many matched and lists rows", () => {
  const r = answer("find courses about kvantemekanikk");
  assert.equal(r.tool, "search_courses");
  assert.match(r.say, /^\d+ courses match “kvantemekanikk”\. First 12:$/);
  assert.match(r.html, /<code>FY2045<\/code>/);
});

test("a comparison is a table with one row per course", () => {
  const r = answer("compare tfy4205 and fy2045");
  assert.equal(r.tool, "compare_courses");
  assert.equal(r.say, "2 courses, side by side for 2026:");
  assert.equal(r.html.match(/<tr>/g)?.length, 3); // header plus two courses
});

test("clashes are counted, and the unavoidable ones agree with their verb", () => {
  const r = answer("do tfy4205, fy2045 and tma4130 clash?");
  assert.equal(r.tool, "check_timetable_conflicts");
  assert.match(r.say, /^\d+ timetable clashes and \d+ exam collisions/);
  // Singular subject, singular verb. "1 of them are" is the tell of a template
  // that was never read back.
  assert.doesNotMatch(r.say, /\b1 of them are\b/);
  if (/\b1 of them\b/.test(r.say)) assert.match(r.say, /1 of them is/);
  assert.match(r.html, /data-hard="true"/);
});

test("a grade distribution names the sitting and draws a bar per grade", () => {
  const r = answer("how many fail tdt4100?");
  assert.equal(r.tool, "get_grade_distribution");
  assert.match(r.say, /TDT4100, (vår|høst) \d{4}, \d+ candidates/);
  assert.match(r.say, /got an F\.$/);
  assert.equal(r.html.match(/mcp-bar-fill/g)?.length, 6);
});

test("exam logistics list every sitting the server returned", () => {
  const r = answer("when is the tfy4205 exam?");
  assert.equal(r.tool, "get_exam_info");
  assert.match(r.say, /^\d+ sittings across 1 course in 2026:$/);
  assert.match(r.html, /Ordinary examination/);
});

test("a course description renders the facts, skipping the empty ones", () => {
  const r = answer("tell me about tdt4102");
  assert.equal(r.tool, "get_course_info");
  assert.match(r.say, /^TDT4102/);
  assert.match(r.html, /<dt>Credits<\/dt>/);
  assert.doesNotMatch(r.html, /null|undefined/);
});

test("an unknown shape falls back to the server's own text, unedited", () => {
  const r = renderResult("get_study_plan", { unexpected: true }, "raw text");
  assert.equal(r.say, "get_study_plan answered:");
  assert.match(r.html, /raw text/);
});

test("markup in a course name cannot become markup on the page", () => {
  const data = {
    courses: [{ code: "X<script>", name: "</code><img onerror=1>", exams: [] }],
    num_found: 1,
  };
  const r = renderResult("search_courses", data, "", "q");
  assert.doesNotMatch(r.html, /<script>|<img/);
  assert.match(r.html, /&lt;script&gt;/);
});
