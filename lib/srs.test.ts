import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, newCard, previewIntervals, Rating, schedule, shortDuration, toDateString, type StoredCard } from "./srs.ts";

const day = new Date(2026, 0, 15, 9, 0); // 15 Jan 2026, 09:00 local time

/** Answers Good each time the card comes due. Returns the last review. */
function goodTimes(times: number) {
  let stored: StoredCard | null = null;
  let now = day;
  let last = schedule(stored, Rating.Good, now);
  for (let i = 0; i < times; i++) {
    last = schedule(stored, Rating.Good, now);
    stored = last.fsrs;
    now = new Date(stored.due);
  }
  return last;
}

test("remembering a card pushes it further out each time", () => {
  const early = goodTimes(3);
  const later = goodTimes(5);
  assert.ok(later.interval_days > early.interval_days);
  assert.ok(later.interval_days >= 7);
});

test("forgetting a learned card brings it back the same day and counts a lapse", () => {
  const learned = goodTimes(4);
  const now = new Date(learned.fsrs.due);
  const forgot = schedule(learned.fsrs, Rating.Again, now);
  assert.equal(forgot.fsrs.lapses, 1);
  assert.equal(forgot.next_due, toDateString(now));
});

test("a row with no stored card starts as a new one", () => {
  const first = schedule(null, Rating.Good, day);
  assert.equal(first.fsrs.reps, 1);
  assert.equal(first.last_reviewed, "2026-01-15");
});

test("stored cards survive a round trip through JSON", () => {
  const first = schedule(null, Rating.Good, day);
  const stored = JSON.parse(JSON.stringify(first.fsrs)) as StoredCard;
  const second = schedule(stored, Rating.Good, new Date(stored.due));
  assert.equal(second.fsrs.reps, 2);
  assert.equal(typeof second.fsrs.due, "string");
});

test("the interval on a button is what the rating saves", () => {
  const card = goodTimes(3).fsrs;
  const now = new Date(card.due);
  const labels = previewIntervals(card, now);
  for (const grade of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as const) {
    const saved = schedule(card, grade, now);
    assert.equal(labels[grade], shortDuration(new Date(saved.fsrs.due).getTime() - now.getTime()));
  }
});

test("new cards are due now", () => {
  assert.equal(newCard(day).next_due, "2026-01-15");
});

test("dates are local, not UTC", () => {
  assert.equal(toDateString(new Date(2026, 0, 31, 23, 30)), "2026-01-31");
  assert.equal(toDateString(addDays(new Date(2026, 0, 31), 1)), "2026-02-01");
});
