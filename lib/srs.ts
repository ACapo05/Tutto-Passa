/**
 * Review schedule: FSRS, the scheduler Anki offers, through ts-fsrs (MIT).
 *
 * A review happens in two places. In a flashcard session the learner rates recall the way Anki
 * does (Again, Hard, Good, Easy). In a call, using an item correctly counts as Good, and making
 * the same mistake again counts as Again. Both move the same card, so practice anywhere counts.
 */
import { createEmptyCard, fsrs, Rating, type Card } from "ts-fsrs";

export { Rating };
export type Grade = Exclude<Rating, Rating.Manual>;

/* No fuzz, so the interval shown on a rating button is exactly what gets saved. */
const scheduler = fsrs({ enable_fuzz: false });

/* Anki's default learn-ahead limit: a card due again within this long comes back in the same session. */
export const SAME_SESSION_MS = 20 * 60_000;

const DAY_MS = 86_400_000;

/** A card as stored in jsonb: the ts-fsrs fields, with dates as ISO strings. */
export type StoredCard = Omit<Card, "due" | "last_review"> & { due: string; last_review?: string };

export type ScheduleUpdate = {
  fsrs: StoredCard;
  next_due: string; // YYYY-MM-DD
  last_reviewed: string; // YYYY-MM-DD
  interval_days: number;
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

/* Rows from before FSRS have no card yet; they start as new cards. */
function revive(stored: StoredCard | null, now: Date): Card {
  if (!stored) return createEmptyCard(now);
  return { ...stored, due: new Date(stored.due), last_review: stored.last_review ? new Date(stored.last_review) : undefined };
}

function store(card: Card): StoredCard {
  return { ...card, due: card.due.toISOString(), last_review: card.last_review?.toISOString() };
}

/** The card after one review. */
export function schedule(stored: StoredCard | null, grade: Grade, now = new Date()): ScheduleUpdate {
  const { card } = scheduler.next(revive(stored, now), now, grade);
  return {
    fsrs: store(card),
    next_due: toDateString(card.due),
    last_reviewed: toDateString(now),
    interval_days: Math.max(0, Math.round((card.due.getTime() - now.getTime()) / DAY_MS)),
  };
}

/** A new card, due now: what a freshly saved word starts as. */
export function newCard(now = new Date()): Pick<ScheduleUpdate, "fsrs" | "next_due"> {
  const card = createEmptyCard(now);
  return { fsrs: store(card), next_due: toDateString(card.due) };
}

/** "1m", "10m", "3h", "4d", "2mo", "1y". */
export function shortDuration(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.round(days / 365)}y`;
}

/** When each answer would bring the card back, for the rating buttons. */
export function previewIntervals(stored: StoredCard | null, now = new Date()): Record<Grade, string> {
  const preview = scheduler.repeat(revive(stored, now), now);
  const label = (grade: Grade) => shortDuration(preview[grade].card.due.getTime() - now.getTime());
  return {
    [Rating.Again]: label(Rating.Again),
    [Rating.Hard]: label(Rating.Hard),
    [Rating.Good]: label(Rating.Good),
    [Rating.Easy]: label(Rating.Easy),
  };
}
