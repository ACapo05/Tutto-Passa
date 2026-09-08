import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { LanguageProfile } from "./languages";

const client = new Anthropic();

export type TranscriptTurn = { role: "user" | "agent"; message?: string | null; time_in_call_secs?: number };

export const CritiqueSchema = z.object({
  summary: z.string().describe("Two or three sentences to the learner about how the conversation went. Warm, specific, not generic praise."),
  memory: z.string().describe("One line for the persona's memory of this person: what they talked about and anything they said about their own life. Written in the second person, e.g. 'He went to Naples last month and hated the trains.'"),
  corrections: z.array(
    z.object({
      item_key: z.string().describe("Stable lowercase slug naming the underlying pattern, not the sentence, e.g. 'essere-auxiliary-motion-verbs'. If an existing key covers the same error, reuse it EXACTLY."),
      kind: z.enum(["grammar", "vocabulary", "usage"]),
      you_said: z.string(),
      correct_form: z.string(),
      explanation: z.string().describe("Plain terms, one or two sentences. No grammar jargon unless it genuinely helps."),
    })
  ).describe("Every place the persona recast something, plus any error she let pass."),
  handled_correctly: z.array(z.string()).describe("item_keys from the existing tracked list that the learner used CORRECTLY in this conversation. Only include a key if it genuinely came up."),
  new_vocab: z.array(
    z.object({
      item_key: z.string().describe("Lowercase slug of the word or phrase, e.g. 'magari'."),
      word: z.string(),
      meaning: z.string(),
    })
  ).describe("Useful words or expressions that came up and are worth keeping. Only ones actually used in the conversation."),
  focus_next: z.array(z.string()).describe("Two or three things to work on next time, in plain language."),
});

export type Critique = z.infer<typeof CritiqueSchema>;

export async function critique(
  profile: LanguageProfile,
  transcript: TranscriptTurn[],
  trackedKeys: string[]
): Promise<Critique> {
  const conversation = transcript
    .filter((t) => t.message?.trim())
    .map((t) => `${t.role === "user" ? "LEARNER" : "NATIVE SPEAKER"}: ${t.message!.trim()}`)
    .join("\n");

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: `You review transcripts of spoken ${profile.name} practice between a learner and a native-speaker persona.

The persona never corrects the learner out loud. She recasts errors — she reflects the correct form back in her own next reply and moves on. Your job is to find every one of those recasts, plus anything she let slide, and report it plainly to the learner.

Watch particularly for these errors, which are common for learners of this language:
${profile.commonMistakes.map((m) => `- ${m}`).join("\n")}

Two things to be careful about:

1. The transcript comes from speech recognition, so it contains mishearings. Do NOT report a "mistake" that is obviously the transcriber mangling a word the learner probably said correctly. When in doubt, leave it out. A false correction is worse than a missed one.
2. item_key must name the underlying pattern so the same error recurring in a later conversation produces the SAME key. These keys are already tracked for this learner — reuse one verbatim whenever the error is the same:
${trackedKeys.length ? trackedKeys.map((k) => `- ${k}`).join("\n") : "(none yet — this is the first session)"}`,
    messages: [{ role: "user", content: `Here is the transcript.\n\n${conversation}` }],
    output_config: { format: zodOutputFormat(CritiqueSchema) },
  });

  if (!response.parsed_output) throw new Error("Critique did not parse. stop_reason: " + response.stop_reason);
  return response.parsed_output;
}
