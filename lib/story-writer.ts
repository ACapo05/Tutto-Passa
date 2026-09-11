import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { ListeningLevel } from "./plan";

const client = new Anthropic();

const Story = z.object({
  title: z.string().describe("A short title in Italian."),
  paragraphs: z
    .array(z.string())
    .describe("The Italian text in short paragraphs. A voice reads every character, so no headings, lists, brackets or stage directions."),
  english: z.array(z.string()).describe("A natural English translation, exactly one entry per Italian paragraph."),
  questions: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .describe("Three short comprehension questions in English about what happens, each with a short answer in English."),
});

export type StoryText = z.infer<typeof Story>;

const SYSTEM = `You write one short Italian listening text a day for an English speaker who is learning. It follows comprehensible input: they should understand nearly every word and be able to guess the few new ones from context.

- Match the length, level and style you are given. The texts get longer and richer each month, so write neither above nor below the level.
- Mostly use the most common Italian words, up to the number given, plus the words the learner has been studying. Bring several of their recent words back in new sentences, so they hear them in real use.
- Write natural, standard spoken Italian with no dialect. Everyday life in Italy, with a small point or a small surprise at the end, never a list of facts.
- Write for the ear: short paragraphs, no headings, no lists, no brackets, no stage directions.
- Give a natural English translation paragraph by paragraph, and three short comprehension questions in English with answers.

Accuracy matters most: every sentence must be correct, natural Italian.`;

/** Today's listening text at the learner's 30-day level. Throws if nothing parses. */
export async function writeStory({
  level,
  focus,
  recent,
}: {
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
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content:
          `Month ${level.month} of 12, level ${level.cefr}.\n` +
          `Length: about ${level.storyWords} Italian words.\n` +
          `Style: ${level.style}\n` +
          `Vocabulary: mostly the ${level.vocabulary} most common Italian words.\n` +
          `Grammar they are working on this week: ${focus}\n` +
          `Words they have been studying recently: ${recent.length ? recent.join(", ") : "(none yet)"}`,
      },
    ],
  });
  if (!response.parsed_output) throw new Error(`No story (stop_reason: ${response.stop_reason})`);
  return response.parsed_output;
}
