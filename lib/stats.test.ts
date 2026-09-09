import { test } from "node:test";
import assert from "node:assert/strict";
import { streak } from "./stats.ts";

const today = new Date(2026, 8, 9); // 9 Sep 2026

test("no sessions is no streak", () => {
  assert.equal(streak([], today), 0);
});

test("counts back over consecutive days", () => {
  assert.equal(streak(["2026-09-09", "2026-09-08", "2026-09-07"], today), 3);
});

test("a gap ends the count", () => {
  assert.equal(streak(["2026-09-09", "2026-09-08", "2026-09-06"], today), 2);
});

test("yesterday keeps the streak alive, because today is not over", () => {
  assert.equal(streak(["2026-09-08", "2026-09-07"], today), 2);
});

test("two days of silence breaks it", () => {
  assert.equal(streak(["2026-09-07", "2026-09-06"], today), 0);
});

test("several sessions in one day count once", () => {
  assert.equal(streak(["2026-09-09", "2026-09-09", "2026-09-08"], today), 2);
});

test("a streak crossing a month boundary is unbroken", () => {
  const oct1 = new Date(2026, 9, 1);
  assert.equal(streak(["2026-10-01", "2026-09-30", "2026-09-29"], oct1), 3);
});
