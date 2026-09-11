import { test } from "node:test";
import assert from "node:assert/strict";
import { LISTENING_LEVELS, PHASES, listeningLevel, whereInPlan } from "./plan.ts";
import { SHOWS } from "./podcasts.ts";

test("listening gets harder every 30 days", () => {
  assert.equal(listeningLevel("2026-09-11").month, 1);
  assert.equal(listeningLevel("2026-10-10").month, 1); // day 29
  assert.equal(listeningLevel("2026-10-11").month, 2); // day 30
  assert.equal(listeningLevel("2028-01-01").month, 12);
  for (let i = 1; i < LISTENING_LEVELS.length; i++) {
    assert.ok(LISTENING_LEVELS[i].storyWords > LISTENING_LEVELS[i - 1].storyWords);
    assert.ok(LISTENING_LEVELS[i].vocabulary > LISTENING_LEVELS[i - 1].vocabulary);
  }
});

test("every podcast in the ladder exists", () => {
  for (const level of LISTENING_LEVELS) for (const id of level.shows) assert.ok(SHOWS[id], `missing show ${id}`);
});

test("the first day is week 1 of the first phase", () => {
  const p = whereInPlan("2026-09-11");
  assert.equal(p.week, 1);
  assert.equal(p.phase.name, "Sound system");
  assert.equal(p.focus, PHASES[0].grammar[0]);
  assert.equal(p.weekStart, "2026-09-11");
});

test("phases follow the plan's calendar", () => {
  assert.equal(whereInPlan("2026-10-08").phase.name, "Sound system"); // day 27, week 4
  assert.equal(whereInPlan("2026-10-09").phase.name, "Core structures"); // day 28, week 5
  assert.equal(whereInPlan("2027-03-12").phase.name, "Native material"); // day 182, week 27
});

test("grammar focus walks through a phase in order", () => {
  const core = PHASES[1];
  assert.equal(whereInPlan("2026-10-09").focus, core.grammar[0]); // week 5
  assert.equal(whereInPlan("2026-12-04").focus, core.grammar.at(-1)); // week 13, last of the phase
});

test("dates outside the year stay inside the plan", () => {
  assert.equal(whereInPlan("2026-01-01").week, 1);
  assert.equal(whereInPlan("2028-01-01").week, 52);
  assert.equal(whereInPlan("2028-01-01").phase.name, "Native material");
});
