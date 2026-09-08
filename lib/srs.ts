/**
 * Review schedule. Deliberately a plain Leitner doubling, not SM-2.
 *
 * The review "event" is not a quiz — it is whether the item came up correctly in real speech
 * during the conversation. Correct use pushes the next due date out; the same mistake again
 * resets it to tomorrow and bumps the recurrence count, so a persistent error is visibly
 * different from a slip.
 *
 * ponytail: fixed doubling with a cap. Add ease factors only if the schedule feels wrong.
 */

export const MAX_INTERVAL_DAYS = 180;

export type Outcome = "correct" | "mistake";

export type Schedule = {
  interval_days: number;
  recurrence_count: number;
};

export type ScheduleUpdate = Schedule & {
  next_due: string; // YYYY-MM-DD
  last_reviewed: string; // YYYY-MM-DD
};

/** YYYY-MM-DD in local time. `toISOString` would shift the date for anyone west of UTC. */
export function toDateString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(from: Date, days: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

export function nextReview(current: Schedule, outcome: Outcome, today = new Date()): ScheduleUpdate {
  const interval_days =
    outcome === "correct" ? Math.min(Math.max(current.interval_days, 1) * 2, MAX_INTERVAL_DAYS) : 1;

  return {
    interval_days,
    recurrence_count: current.recurrence_count + (outcome === "mistake" ? 1 : 0),
    next_due: toDateString(addDays(today, interval_days)),
    last_reviewed: toDateString(today),
  };
}
