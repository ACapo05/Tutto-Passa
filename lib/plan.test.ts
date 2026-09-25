import { test } from "node:test";
import assert from "node:assert/strict";
import { WEEKS, listeningLevel, whereInPlan } from "./plan.ts";
import { LANGUAGES } from "./languages/index.ts";

const { phases, listening } = LANGUAGES.it;
const START = "2026-09-11";

test("listening gets harder every 30 days", () => {
  assert.equal(listeningLevel("2026-09-11", START, listening).month, 1);
  assert.equal(listeningLevel("2026-10-10", START, listening).month, 1); // day 29
  assert.equal(listeningLevel("2026-10-11", START, listening).month, 2); // day 30
  assert.equal(listeningLevel("2028-01-01", START, listening).month, 12);
});

test("the first day is week 1 of the first phase", () => {
  const p = whereInPlan("2026-09-11", START, phases);
  assert.equal(p.week, 1);
  assert.equal(p.phase.name, "Sound system");
  assert.equal(p.focus, phases[0].grammar[0]);
  assert.equal(p.weekStart, "2026-09-11");
});

test("phases follow the plan's calendar", () => {
  assert.equal(whereInPlan("2026-10-08", START, phases).phase.name, "Sound system"); // day 27, week 4
  assert.equal(whereInPlan("2026-10-09", START, phases).phase.name, "Core structures"); // day 28, week 5
  assert.equal(whereInPlan("2027-03-12", START, phases).phase.name, "Native material"); // day 182, week 27
});

test("grammar focus walks through a phase in order", () => {
  const core = phases[1];
  assert.equal(whereInPlan("2026-10-09", START, phases).focus, core.grammar[0]); // week 5
  assert.equal(whereInPlan("2026-12-04", START, phases).focus, core.grammar.at(-1)); // week 13, last of the phase
});

test("dates outside the year stay inside the plan", () => {
  assert.equal(whereInPlan("2026-01-01", START, phases).week, 1);
  assert.equal(whereInPlan("2028-01-01", START, phases).week, 52);
  assert.equal(whereInPlan("2028-01-01", START, phases).phase.name, "Native material");
});

/* The checks a new language has to pass. Add a language and these run on it too. */
for (const [code, p] of Object.entries(LANGUAGES)) {
  test(`${code}: the profile is complete and consistent`, () => {
    assert.equal(p.code, code, "code must match its key in LANGUAGES");
    assert.ok(p.frequency.length >= 1000, "frequency list is too short");
    assert.ok(p.partner.routine.length > 0 && p.partner.routine.at(-1)![0] >= 24, "routine must cover the whole day");
    assert.doesNotThrow(() => new Date().toLocaleString("en-GB", { timeZone: p.partner.timeZone }), "unknown time zone");
  });

  test(`${code}: phases cover weeks 1 to ${WEEKS} with no gaps`, () => {
    let next = 1;
    for (const phase of p.phases) {
      assert.equal(phase.startWeek, next, `${phase.name} should start in week ${next}`);
      assert.ok(phase.grammar.length > 0, `${phase.name} has no grammar`);
      next = phase.endWeek + 1;
    }
    assert.equal(next, WEEKS + 1);
  });

  test(`${code}: twelve listening levels, each harder, every show exists`, () => {
    assert.equal(p.listening.length, 12);
    p.listening.forEach((level, i) => {
      assert.equal(level.month, i + 1);
      if (i) assert.ok(level.storyWords > p.listening[i - 1].storyWords && level.vocabulary > p.listening[i - 1].vocabulary);
      for (const id of level.shows) assert.ok(p.shows[id], `missing show ${id}`);
    });
  });
}
