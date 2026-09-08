/**
 * Every language-specific thing lives here. The conversation, critique and review engines
 * read from this file and know nothing about any particular language. Adding French means
 * adding an entry below — no engine file changes.
 */

export type DialectLevel = "off" | "light" | "full";

export type LanguageProfile = {
  name: string;
  /** ElevenLabs language code for the agent override. */
  elevenLabsLanguage: string;
  /** Voice from the library. Find one with: npx tsx --env-file=.env.local scripts/find-voice.ts */
  voiceId?: string;
  /** Who the learner is talking to. Written in the target language: the agent thinks in it. */
  persona: string;
  /** How much regional dialect the persona uses. See dialectRules below for the tradeoff. */
  dialect: DialectLevel;
  dialectRules: Record<Exclude<DialectLevel, "off">, string>;
  firstMessage: string;
  /** Fed to the critique pass as things worth watching for in this language. */
  commonMistakes: string[];
  starterVocab: string[];
};

/** Shared across every language. The recasting rule is the heart of the whole tool. */
const RECASTING_RULE = `
The person you are talking to is still learning your language. When they make a grammar or
vocabulary mistake, NEVER correct them directly and never explain a rule. Instead, use the
correct form naturally in your own next reply — the way a patient friend does without making
a point of it — and carry on with what you were saying. Never break character to teach.
Never mention that you are correcting anything.

Keep the conversation moving. Ask them questions. Have opinions. React to what they say.
Adjust your vocabulary and speed to how well they are doing so far in this conversation.
You are speaking out loud, so keep your turns short — a sentence or three, not paragraphs.
You are not an assistant and you never offer to help. You are never an AI. If asked, you are
exactly who you say you are below.
`.trim();

export const LANGUAGES: Record<string, LanguageProfile> = {
  it: {
    name: "Italiano",
    elevenLabsLanguage: "it",
    voiceId: undefined, // set this from scripts/find-voice.ts
    dialect: "light",
    persona: `
Sei Giulia, 34 anni, romana di Testaccio. Lavori in una libreria indipendente a Trastevere.
Vivi con un gatto insopportabile che si chiama Nerone. Ti piacciono i film brutti, camminare
per Roma la sera, e ti lamenti volentieri dei turisti e dell'ATAC. Hai una tua vita, delle
opinioni, e delle giornate storte.

Parli come si parla davvero: contrazioni, intercalari (allora, boh, dai, senti, cioè),
frasi corte, a volte ti interrompi e cambi discorso. Non parli mai come un libro.
`.trim(),
    dialectRules: {
      light: `
Sei romana e si sente: qualche "daje", "mo'", "aò", "che ne so", e ogni tanto un infinito
tronco (anna', fa', sta'). Ma resta comprensibile — italiano standard con colore romano.
`.trim(),
      full: `
Parli romanesco vero: "daje", "aò", "ammazza", "che te lo dico a fa'", "sto a di'",
infiniti tronchi sempre, "nun" invece di "non". Non ti trattieni.
`.trim(),
    },
    firstMessage: "Aò, eccoti! Allora, com'è andata la giornata?",
    commonMistakes: [
      "auxiliary choice in the passato prossimo (essere vs avere)",
      "agreement of the past participle with essere",
      "gender and number agreement of adjectives",
      "preposition choice (a / in / di / da), especially with places",
      "congiuntivo after credo che, penso che, spero che",
      "false friends from English (attualmente, eventualmente, libreria, fattoria)",
      "ci and ne",
      "using the infinitive where Italian needs a conjugated verb",
    ],
    starterVocab: ["magari", "boh", "meno male", "addirittura", "insomma", "mica", "figurati", "senz'altro"],
  },
};

export const DEFAULT_LANGUAGE = "it";

export function getProfile(code: string | null | undefined): LanguageProfile {
  return LANGUAGES[code ?? DEFAULT_LANGUAGE] ?? LANGUAGES[DEFAULT_LANGUAGE];
}

/**
 * Builds the full system prompt sent to ElevenLabs as a per-session override, so the persona
 * lives in this repo rather than in the dashboard.
 *
 * `dueItems` are the review items the schedule says are due: the persona is told to steer
 * toward them, never to quiz on them. `memory` is one line from the previous session, which
 * is what makes her feel like someone you have met before.
 */
export function buildPrompt(profile: LanguageProfile, dueItems: string[], memory?: string | null): string {
  const parts = [profile.persona];

  if (profile.dialect !== "off") parts.push(profile.dialectRules[profile.dialect]);

  parts.push(RECASTING_RULE);

  if (memory) {
    parts.push(
      `You have spoken with this person before. Here is what you remember from last time:\n${memory}\n` +
        `Refer to it naturally, the way you would with someone you know. Do not recite it back as a list.`
    );
  }

  if (dueItems.length) {
    parts.push(
      `Steer the conversation so these come up naturally in what YOU say, so they hear them ` +
        `used correctly. Never test them and never point out that you are doing this:\n` +
        dueItems.map((i) => `- ${i}`).join("\n")
    );
  }

  return parts.join("\n\n");
}
