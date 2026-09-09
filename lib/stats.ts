import { toDateString, addDays } from "./srs.ts";

/**
 * Consecutive days with at least one conversation, counting back from today.
 *
 * A streak stays alive if you spoke today OR yesterday: the day is not over until you have
 * slept, and a counter that resets at midnight punishes an evening habit for no reason.
 */
export function streak(sessionDates: string[], today = new Date()): number {
  const days = new Set(sessionDates);
  const todayStr = toDateString(today);
  const yesterdayStr = toDateString(addDays(today, -1));

  // Nothing today and nothing yesterday means the run is broken.
  let cursor = days.has(todayStr) ? today : days.has(yesterdayStr) ? addDays(today, -1) : null;
  if (!cursor) return 0;

  let count = 0;
  while (days.has(toDateString(cursor))) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}
