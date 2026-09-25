import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { DeckResult } from "./deck";
import type { LanguageProfile } from "./languages";

const client = new Anthropic();

const Deck = z.object({
  results: z.array(
    z.object({
      form: z.string().describe("The candidate word exactly as given."),
      skip: z
        .boolean()
        .describe("True for a proper name, an interjection or filler, a fragment of another word, or a form not worth a card of its own at this level."),
      sentence: z.string().describe("One short, natural sentence a person would really say, using the word in exactly this form. Empty string if skipped."),
      english: z.string().describe("A natural English translation of that sentence. Empty string if skipped."),
      gloss: z
        .string()
        .describe("The word and what it means in this sentence, plus one short grammar note if it helps, e.g. 'been (past participle of to be)'. Empty string if skipped."),
    })
  ),
});

const system = ({ label, variety, country }: LanguageProfile) => `You write ${label} flashcards for an English speaker. Follow these principles, which come from vocabulary research and from people who learned a language to fluency:

- Frequency first. The candidates are ${label} words in order of how often they appear in film and TV subtitles, so they reflect spoken ${label}. Keep that order.
- One new thing per card. Each sentence uses the candidate word in exactly the form given, and otherwise only words the learner already knows or the most basic ${label} words. Keep it short: about 4 to 9 words at this level.
- Real speech. Write what a person would actually say in everyday life in ${country}, in ${variety} with no dialect. Never an empty textbook sentence.
- Use this week's grammar when it fits naturally, but a simple, natural sentence matters more.
- Skip proper names, interjections, filler, fragments of other words, and forms that do not deserve a card of their own at this level. Articles, prepositions, pronouns and common verb forms do deserve cards.

Return one result for every candidate, in the order given. Accuracy matters most: the learner will memorise these sentences, so each one must be correct, natural ${label}.`;

/** One sentence card per candidate word, in order, at the learner's level. Throws if nothing parses. */
export async function writeCards({
  profile,
  candidates,
  known,
  level,
  focus,
}: {
  profile: LanguageProfile;
  candidates: string[];
  known: string[];
  level: string;
  focus: string;
}): Promise<DeckResult[]> {
  const response = await client.beta.messages.parse({
    model: "claude-opus-5",
    max_tokens: 16000,
    // If the model declines, the API reruns the request on its default fallback instead of failing.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(Deck) },
    system: system(profile),
    messages: [
      {
        role: "user",
        content:
          `Their level: ${level}\n` +
          `This week's grammar: ${focus}\n` +
          `Words they already know: ${known.length ? known.join(", ") : "(none yet)"}\n\n` +
          `Candidate words, most frequent first:\n${candidates.map((w) => `- ${w}`).join("\n")}`,
      },
    ],
  });
  if (!response.parsed_output) throw new Error(`No cards (stop_reason: ${response.stop_reason})`);
  return response.parsed_output.results;
}
