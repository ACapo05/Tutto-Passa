/**
 * The learner's twelve-month plan, turned into something the app can act on. It decides the
 * partner's level, what missions practise, and where Home says you are in the year.
 *
 * Every function takes `start`, the first day of this learner's year in this language (see
 * planStart in lib/current-language.ts), so each person and each language begins at week 1.
 * The calendar lives here; each language's phases, grammar and listening ladder live in its
 * file in lib/languages. Word targets are scaled for about 45 minutes a day, which puts a solid
 * B1 in a year (90 to 120 minutes aims for B2). No imports, so node --test can load it directly.
 */

export const WEEKS = 52;
/* The plan says input volume is non-negotiable. About 25 minutes a day; raise it if you have the time. */
export const LISTENING_MINUTES_PER_WEEK = 180;

export type PlanPhase = {
  name: string;
  startWeek: number;
  endWeek: number;
  summary: string;
  /** In the order the plan says to learn them. Spread evenly across the phase's weeks. */
  grammar: string[];
  wordTarget: number;
  /** How the partner pitches their language during this phase. Sent to them as part of the prompt. */
  pitch: string;
};

const DAY_MS = 86_400_000;

/** Whole days since the plan started, never negative. */
export function daysIntoPlan(today: string, start: string): number {
  return Math.max(0, Math.round((Date.parse(today) - Date.parse(start)) / DAY_MS));
}

export type ListeningLevel = {
  month: number;
  cefr: string;
  /** Rough length of the daily story, in words of the language. */
  storyWords: number;
  /** The story mostly uses this many of the most common words of the language. */
  vocabulary: number;
  style: string;
  /** Ids from the language's shows, easiest first. */
  shows: string[];
};

/** This month's listening level: month 1 is days 0 to 29, month 2 days 30 to 59, and so on. */
export function listeningLevel(today: string, start: string, levels: ListeningLevel[]): ListeningLevel {
  const month = Math.min(12, Math.floor(daysIntoPlan(today, start) / 30) + 1);
  return levels[month - 1];
}

/** Where a date (YYYY-MM-DD) falls in the plan. Dates before the start or after the end stay inside it. */
export function whereInPlan(today: string, start: string, phases: PlanPhase[]) {
  const days = Math.round((Date.parse(today) - Date.parse(start)) / DAY_MS);
  const week = Math.min(WEEKS, Math.max(1, Math.floor(days / 7) + 1));
  const phaseIndex = phases.findIndex((p) => week >= p.startWeek && week <= p.endWeek);
  const phase = phases[phaseIndex];
  const weeksPerTopic = (phase.endWeek - phase.startWeek + 1) / phase.grammar.length;
  const focusIndex = Math.min(phase.grammar.length - 1, Math.floor((week - phase.startWeek) / weeksPerTopic));
  const weekStart = new Date(Date.parse(start) + (week - 1) * 7 * DAY_MS).toISOString().slice(0, 10);
  return { week, phaseIndex, phase, focusIndex, focus: phase.grammar[focusIndex], weekStart };
}
