/**
 * Every language-specific thing lives in one file per language in this folder: the partner, the
 * word list, the year's grammar, the listening ladder and the podcasts. The conversation,
 * critique and review engines read from here and never name a language. To add one, copy it.ts,
 * translate it, and register it below. CONTRIBUTING.md has the checklist.
 */

import type { ListeningLevel, PlanPhase } from "../plan.ts";
import type { Show } from "../podcasts.ts";
import { it } from "./it.ts";
import { es } from "./es.ts";

export type DialectLevel = "off" | "light" | "full";

/** One goal for a call. English: it is shown to the learner and given to the persona as context. */
export type Mission = { title: string; why: string };

export type LanguageProfile = {
  /** ISO 639-1 code. Also the lang attribute on its text and the key its rows are saved under. */
  code: string;
  /** In English, for the interface and the prompts: "Italian". */
  label: string;
  /** In the language itself, for the picker: "Italiano". */
  nativeName: string;
  /** BCP 47 tag for the browser's own voice on flashcards: "it-IT". */
  speechLang: string;
  /** The variety written in flashcards and stories, with no dialect: "standard Italian". */
  variety: string;
  /** Where everyday life in the flashcards and stories happens: "Italy". */
  country: string;
  /** ElevenLabs language code for the agent override. */
  elevenLabsLanguage: string;
  /** Voice from the library. Find one with: npm run find-voice. Stories need one. */
  voiceId?: string;
  /** Who the learner calls. Shown on Home and on the call. */
  partner: {
    name: string;
    /** One line under the name, in English: "Bookseller in Trastevere". */
    role: string;
    /** Shown on the call, in the language: "Roma". */
    city: string;
    /** IANA time zone, for where they probably are right now. */
    timeZone: string;
    /** Until which hour they do what, in English, in order. The last entry covers the rest of the day. */
    routine: [untilHour: number, doing: string][];
  };
  /** Who the learner is talking to. Written in the target language: the agent thinks in it. */
  persona: string;
  /** How much regional dialect the persona uses. See dialectRules below for the tradeoff. */
  dialect: DialectLevel;
  dialectRules: Record<Exclude<DialectLevel, "off">, string>;
  firstMessage: string;
  /** The first call's goal, before any report has suggested one. */
  starterMission: Mission;
  /** Fed to the critique pass as things worth watching for in this language. */
  commonMistakes: string[];
  starterVocab: string[];
  /** The deck's order: the most frequent word forms first. See lib/data/README.md. */
  frequency: string[];
  /** The twelve-month plan. Weeks run 1 to 52 with no gaps. */
  phases: PlanPhase[];
  /** Twelve listening levels, one per 30 days, each harder than the last. */
  listening: ListeningLevel[];
  shows: Record<string, Show>;
};

/** Shared across every language. The recasting rule is the heart of the whole tool. */
const RECASTING_RULE = `
The person you are talking to is still learning your language. When they make a grammar or
vocabulary mistake, NEVER correct them directly and never explain a rule. Instead, use the
correct form naturally in your own next reply — the way a patient friend does without making
a point of it — and carry on with what you were saying. Never break character to teach.
Never mention that you are correcting anything.

They will sometimes drop into English when they are stuck. Understand it, but answer only in
your own language: put the word or phrase they were missing into your reply, in simple words,
and keep going. Never speak English back, even if they ask you to.

Keep the conversation moving. Ask them questions. Have opinions. React to what they say.
Adjust your vocabulary and speed to how well they are doing so far in this conversation.
You are speaking out loud, so keep your turns short — a sentence or three, not paragraphs.
You are not an assistant and you never offer to help. You are never an AI. If asked, you are
exactly who you say you are below.
`.trim();

export const LANGUAGES: Record<string, LanguageProfile> = { it, es };

export const DEFAULT_LANGUAGE = "it";

export function getProfile(code: string | null | undefined): LanguageProfile {
  return LANGUAGES[code ?? DEFAULT_LANGUAGE] ?? LANGUAGES[DEFAULT_LANGUAGE];
}

/** The part of a profile the browser needs. The rest (prompts, word lists) stays on the server. */
export type LanguageView = Pick<LanguageProfile, "code" | "label" | "nativeName" | "speechLang" | "partner">;

export function toView({ code, label, nativeName, speechLang, partner }: LanguageProfile): LanguageView {
  return { code, label, nativeName, speechLang, partner };
}

/** Every language, for the picker. */
export const CHOICES = Object.values(LANGUAGES).map(({ code, nativeName }) => ({ code, nativeName }));

/**
 * Builds the full system prompt sent to ElevenLabs as a per-session override, so the persona
 * lives in this repo rather than in the dashboard.
 *
 * `due` are the review items the schedule says are due: the persona is told to steer
 * toward them, never to quiz on them. `memory` is one line from the previous session, which
 * is what makes her feel like someone you have met before.
 */
export function buildPrompt(
  profile: LanguageProfile,
  {
    due = [],
    memory,
    mission,
    level,
    focus,
    learned = [],
  }: {
    due?: string[];
    memory?: string | null;
    mission?: Mission | null;
    level?: string;
    focus?: string;
    learned?: string[];
  } = {}
): string {
  const parts = [profile.persona];

  if (profile.dialect !== "off") parts.push(profile.dialectRules[profile.dialect]);

  parts.push(RECASTING_RULE);

  if (level) parts.push(`How to pitch your language for them right now: ${level}`);

  if (memory) {
    parts.push(
      `You have spoken with this person before. Here is what you remember from last time:\n${memory}\n` +
        `Refer to it naturally, the way you would with someone you know. Do not recite it back as a list.`
    );
  }

  if (mission) {
    parts.push(
      `Today they want to practise this: ${mission.title} (${mission.why}). Early on, give them a ` +
        `natural reason to do it, the way a friend would ask. Never announce it as a task.`
    );
  }

  if (focus) {
    parts.push(
      `This week their study plan focuses on: ${focus}. Use it naturally yourself and give them easy ` +
        `chances to use it. Never explain it.`
    );
  }

  if (learned.length) {
    parts.push(
      `They have just learned these words in their flashcards. Use a few of them naturally, so ` +
        `they hear them in real speech:\n` +
        learned.map((w) => `- ${w}`).join("\n")
    );
  }

  if (due.length) {
    parts.push(
      `Steer the conversation so these come up naturally in what YOU say, so they hear them ` +
        `used correctly. Never test them and never point out that you are doing this:\n` +
        due.map((i) => `- ${i}`).join("\n")
    );
  }

  return parts.join("\n\n");
}
