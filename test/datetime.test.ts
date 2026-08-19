import test from "node:test";
import assert from "node:assert/strict";
import { isoDateTime } from "../src/lib/datetime.ts";

test("a calendar day becomes a full ISO 8601 instant", () => {
  assert.equal(isoDateTime("2026-07-28"), "2026-07-28T12:00:00+02:00");
});

test("the offset follows Oslo across the DST boundary", () => {
  // Summer time, then winter time, on either side of the same year.
  assert.match(isoDateTime("2025-08-18"), /\+02:00$/);
  assert.match(isoDateTime("2025-02-15"), /\+01:00$/);
});

test("anything that is not a calendar day fails the build", () => {
  assert.throws(() => isoDateTime("2025-08-18T09:00:00Z"), /calendar day/);
  assert.throws(() => isoDateTime("18.08.2025"), /calendar day/);
});

test("midday keeps the calendar day intact once normalised to UTC", () => {
  // The reason the time is 12:00 and not 00:00: midnight in Oslo is the
  // previous day in UTC, and Google reads these in UTC.
  for (const day of ["2025-02-15", "2025-08-18", "2026-07-28"]) {
    assert.equal(new Date(isoDateTime(day)).toISOString().slice(0, 10), day);
  }
});
