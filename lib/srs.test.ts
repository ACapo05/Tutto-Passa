import { test } from "node:test";
import assert from "node:assert/strict";
import { nextReview, toDateString, addDays, MAX_INTERVAL_DAYS } from "./srs.ts";

const day = new Date(2026, 0, 15); // 15 Jan 2026, local time

test("correct use doubles the interval and does not count as a recurrence", () => {
  const r = nextReview({ interval_days: 4, recurrence_count: 2 }, "correct", day);
  assert.equal(r.interval_days, 8);
  assert.equal(r.recurrence_count, 2);
  assert.equal(r.next_due, "2026-01-23");
  assert.equal(r.last_reviewed, "2026-01-15");
});

test("a repeat mistake resets to tomorrow and increments the recurrence count", () => {
  const r = nextReview({ interval_days: 32, recurrence_count: 1 }, "mistake", day);
  assert.equal(r.interval_days, 1);
  assert.equal(r.recurrence_count, 2);
  assert.equal(r.next_due, "2026-01-16");
});

test("the interval is capped", () => {
  const r = nextReview({ interval_days: 170, recurrence_count: 0 }, "correct", day);
  assert.equal(r.interval_days, MAX_INTERVAL_DAYS);
});

test("a zero or missing interval still moves forward rather than sticking at zero", () => {
  const r = nextReview({ interval_days: 0, recurrence_count: 0 }, "correct", day);
  assert.equal(r.interval_days, 2);
});

test("dates use local time, so the day does not shift west of UTC", () => {
  // 23:30 local on the 15th must still be the 15th, which toISOString would get wrong.
  assert.equal(toDateString(new Date(2026, 0, 15, 23, 30)), "2026-01-15");
  assert.equal(toDateString(addDays(new Date(2026, 0, 31), 1)), "2026-02-01");
});
