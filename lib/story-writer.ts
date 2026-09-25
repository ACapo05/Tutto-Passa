import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { ListeningLevel } from "./plan";
import type { LanguageProfile } from "./languages";

const client = new Anthropic();

const Story = z.object({
  title: z.string().describe("A short title in the language being learned."),
  paragraphs: z
    .array(z.string())
    .describe("The text in short paragraphs, in the language being learned. A voice reads every character, so no headings, lists, brackets or stage directions."),
  english: z.array(z.string()).describe("A natural English translation, exactly one entry per paragraph."),
  questions: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .describe("Three short comprehension questions in English about what happens, each with a short answer in English."),
});

export type StoryText = z.infer<typeof Story>;

const system = ({ label, variety, country }: LanguageProfile) => `You write one short ${label} listening text a day for an English speaker who is learning. It follows comprehensible input: they should understand nearly every word and be able to guess the few new ones from context.

- Match the length, level and style you are given. The texts get longer and richer each month, so write neither above nor below the level.
- Mostly use the most common ${label} words, up to the number given, plus the words the learner has been studying. Bring several of their recent words back in new sentences, so they hear them in real use.
- Write natural, spoken ${variety} with no dialect. Everyday life in ${country}, with a small point or a small surprise at the end, never a list of facts.
- Write for the ear: short paragraphs, no headings, no lists, no brackets, no stage directions.
- Give a natural English translation paragraph by paragraph, and three short comprehension questions in English with answers.

Accuracy matters most: every sentence must be correct, natural ${label}.`;

/** Today's listening text at the learner's 30-day level. Throws if nothing parses. */
export async function writeStory({
  profile,
  level,
  focus,
  recent,
}: {
  profile: LanguageProfile;
  level: ListeningLevel;
  focus: string;
  recent: string[];
}): Promise<StoryText> {
  const response = await client.beta.messages.parse({
    model: "claude-opus-5",
    max_tokens: 16000,
    // If the model declines, the API reruns the request on its default fallback instead of failing.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(Story) },
    system: system(profile),
    messages: [
      {
        role: "user",
        content:
          `Month ${level.month} of 12, level ${level.cefr}.\n` +
          `Length: about ${level.storyWords} words.\n` +
          `Style: ${level.style}\n` +
          `Vocabulary: mostly the ${level.vocabulary} most common ${profile.label} words.\n` +
          `Grammar they are working on this week: ${focus}\n` +
          `Words they have been studying recently: ${recent.length ? recent.join(", ") : "(none yet)"}`,
      },
    ],
  });
  if (!response.parsed_output) throw new Error(`No story (stop_reason: ${response.stop_reason})`);
  return response.parsed_output;
}
