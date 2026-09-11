/**
 * The learner's twelve-month plan for Italian, turned into something the app can act on. It
 * decides Giulia's level, what missions practise, and where Home says you are in the year.
 *
 * Phases and grammar order follow the written plan. Word targets are scaled for about 45
 * minutes a day, which the plan puts at solid B1 in a year (90 to 120 minutes aims for B2).
 * No imports, so node --test can load it directly.
 */

export const PLAN_START = "2026-09-11";
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
  /** How Giulia pitches her Italian during this phase. Sent to her as part of the prompt. */
  giulia: string;
};

export const PHASES: PlanPhase[] = [
  {
    name: "Sound system",
    startWeek: 1,
    endWeek: 4,
    summary: "Pure vowels, double consonants and stress, once and for all. Language Transfer, and Anki from day one.",
    grammar: ["pure vowels and double consonants", "essere, avere and regular verbs"],
    wordTarget: 400,
    giulia:
      "They are a beginner in their first month. Speak slowly and clearly, in short present-tense sentences with very common words. Say double consonants carefully. Ask simple questions they can answer in a few words.",
  },
  {
    name: "Core structures",
    startWeek: 5,
    endWeek: 13,
    summary: "A textbook lesson every few days, speaking from now on, and the past tenses.",
    grammar: [
      "irregular verbs in the present",
      "passato prossimo",
      "imperfetto",
      "passato prossimo or imperfetto",
      "direct and indirect object pronouns",
      "ne and ci",
    ],
    wordTarget: 1000,
    giulia:
      "They know the present tense and are learning the past tenses. Speak at a relaxed pace with everyday words. Ask about yesterday, last weekend and when they were young, so they need the passato prossimo and the imperfetto.",
  },
  {
    name: "Input volume",
    startWeek: 14,
    endWeek: 26,
    summary: "Where most people stall and the gains are. Easy Italian, Podcast Italiano, shows with Italian subtitles.",
    grammar: ["futuro semplice", "condizionale", "reflexive verbs", "si impersonale"],
    wordTarget: 1800,
    giulia:
      "They are between A2 and B1. Speak at a natural but unhurried pace, with some idioms. Bring up plans, wishes and what people do in Rome, so they need the future, the conditional and the si impersonale.",
  },
  {
    name: "Native material",
    startWeek: 27,
    endWeek: 52,
    summary: "Native podcasts and TV, a modern novel, and the congiuntivo.",
    grammar: [
      "congiuntivo after penso che and credo che",
      "congiuntivo after benché and prima che",
      "congiuntivo imperfetto with se",
      "all the tenses in real conversation",
    ],
    wordTarget: 2500,
    giulia:
      "They are working toward a solid B1. Speak naturally, as with any Italian friend. Share opinions and doubts that invite the congiuntivo (penso che, credo che, spero che). Only simplify when they struggle.",
  },
];

const DAY_MS = 86_400_000;

/** Whole days since the plan started, never negative. */
export function daysIntoPlan(today: string): number {
  return Math.max(0, Math.round((Date.parse(today) - Date.parse(PLAN_START)) / DAY_MS));
}

export type ListeningLevel = {
  month: number;
  cefr: string;
  /** Rough length of the daily story, in Italian words. */
  storyWords: number;
  /** The story mostly uses this many of the most common Italian words. */
  vocabulary: number;
  style: string;
  /** Podcast ids from lib/podcasts.ts, easiest first. */
  shows: string[];
};

/* Listening gets harder every 30 days: longer stories, more words, richer grammar, then native podcasts. */
export const LISTENING_LEVELS: ListeningLevel[] = [
  { month: 1, cefr: "A1", storyWords: 80, vocabulary: 300, style: "A slow, simple dialogue in the present tense, with short sentences and plenty of repetition.", shows: ["magia-a-venezia", "coffee-break-italian"] },
  { month: 2, cefr: "A1", storyWords: 120, vocabulary: 500, style: "A simple dialogue or first-person scene in the present tense that repeats its key words.", shows: ["magia-a-venezia", "short-stories-beginners", "coffee-break-italian"] },
  { month: 3, cefr: "A2", storyWords: 160, vocabulary: 800, style: "A short story that starts to use the passato prossimo for what happened.", shows: ["short-stories-beginners", "podcast-italiano-principiante"] },
  { month: 4, cefr: "A2", storyWords: 200, vocabulary: 1000, style: "A story about the past that mixes the passato prossimo and the imperfetto.", shows: ["podcast-italiano-principiante", "short-stories-beginners"] },
  { month: 5, cefr: "A2", storyWords: 250, vocabulary: 1300, style: "A story with some dialogue, both past tenses and object pronouns.", shows: ["podcast-italiano-principiante", "podcast-italiano-intermedio"] },
  { month: 6, cefr: "B1", storyWords: 300, vocabulary: 1600, style: "A story about plans and wishes that uses the future and the conditional.", shows: ["podcast-italiano-intermedio", "easy-italian"] },
  { month: 7, cefr: "B1", storyWords: 350, vocabulary: 2000, style: "A conversation between friends with opinions and a few common idioms.", shows: ["podcast-italiano-intermedio", "easy-italian", "italiano-automatico"] },
  { month: 8, cefr: "B1", storyWords: 400, vocabulary: 2300, style: "A lively story at a natural pace, with idioms and reported speech.", shows: ["easy-italian", "italiano-automatico"] },
  { month: 9, cefr: "B1", storyWords: 450, vocabulary: 2600, style: "Opinions and doubts that bring in the congiuntivo after penso che and credo che.", shows: ["podcast-italiano-avanzato", "italiano-automatico"] },
  { month: 10, cefr: "B1+", storyWords: 500, vocabulary: 3000, style: "A short radio-style report or discussion, as an Italian presenter would say it.", shows: ["podcast-italiano-avanzato", "globo"] },
  { month: 11, cefr: "B1+", storyWords: 550, vocabulary: 3500, style: "A native-level conversation with colloquial Italian and the full range of tenses.", shows: ["globo", "il-mondo"] },
  { month: 12, cefr: "B2", storyWords: 600, vocabulary: 4000, style: "Native radio style: natural speed, idioms and longer sentences.", shows: ["il-mondo", "stories"] },
];

/** This month's listening level: month 1 is days 0 to 29, month 2 days 30 to 59, and so on. */
export function listeningLevel(today: string): ListeningLevel {
  const month = Math.min(12, Math.floor(daysIntoPlan(today) / 30) + 1);
  return LISTENING_LEVELS[month - 1];
}

/** Where a date (YYYY-MM-DD) falls in the plan. Dates before the start or after the end stay inside it. */
export function whereInPlan(today: string) {
  const days = Math.round((Date.parse(today) - Date.parse(PLAN_START)) / DAY_MS);
  const week = Math.min(WEEKS, Math.max(1, Math.floor(days / 7) + 1));
  const phaseIndex = PHASES.findIndex((p) => week >= p.startWeek && week <= p.endWeek);
  const phase = PHASES[phaseIndex];
  const weeksPerTopic = (phase.endWeek - phase.startWeek + 1) / phase.grammar.length;
  const focusIndex = Math.min(phase.grammar.length - 1, Math.floor((week - phase.startWeek) / weeksPerTopic));
  const weekStart = new Date(Date.parse(PLAN_START) + (week - 1) * 7 * DAY_MS).toISOString().slice(0, 10);
  return { week, phaseIndex, phase, focusIndex, focus: phase.grammar[focusIndex], weekStart };
}
