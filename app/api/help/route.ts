import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getProfile, DEFAULT_LANGUAGE } from "@/lib/languages";

const client = new Anthropic();

const Gloss = z.object({
  meaning: z.string().describe("The English meaning of the word as used in this sentence, in a few words, e.g. 'went' or 'it was (hot)'."),
  note: z.string().describe("One short sentence of useful context in plain English, e.g. 'Past participle of andare, to go.' Empty string if there is nothing useful to add."),
});

const Hint = z.object({
  italian: z.string().describe("One short, natural sentence the learner could say next, in the language being practised, at their level."),
  english: z.string().describe("What that sentence means, in English."),
});

const Body = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("word"), word: z.string().min(1).max(60), sentence: z.string().max(800) }),
  z.object({
    kind: z.literal("hint"),
    turns: z.array(z.object({ who: z.enum(["you", "giulia"]), text: z.string().max(800) })).max(12),
  }),
]);

/**
 * In-call help, always as English text so what the learner hears stays in the target language:
 * the meaning of a word she just said, or one thing they could say next. Low effort keeps it
 * quick enough to use mid-conversation.
 */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const body = parsed.data;
  const language = getProfile(DEFAULT_LANGUAGE).name;

  try {
    if (body.kind === "word") {
      const response = await client.beta.messages.parse({
        model: "claude-opus-5",
        max_tokens: 4096,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low", format: betaZodOutputFormat(Gloss) },
        system: `You help an English speaker who is learning ${language} understand one word from a spoken conversation. Give its meaning in this sentence, not a dictionary list.`,
        messages: [{ role: "user", content: `Sentence: ${body.sentence}\nWord: ${body.word}` }],
      });
      if (!response.parsed_output) throw new Error(`No translation (stop_reason: ${response.stop_reason})`);
      return NextResponse.json(response.parsed_output);
    }

    const transcript = body.turns.map((t) => `${t.who === "you" ? "LEARNER" : "GIULIA"}: ${t.text}`).join("\n");
    const response = await client.beta.messages.parse({
      model: "claude-opus-5",
      max_tokens: 4096,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(Hint) },
      system: `An English speaker learning ${language} is on a call with Giulia, a friend in Rome, and is stuck for words. Suggest one short, natural thing they could say next that fits the conversation. Match their level from how they have spoken so far.`,
      messages: [{ role: "user", content: transcript || "(The call has just started. Giulia has not said anything yet.)" }],
    });
    if (!response.parsed_output) throw new Error(`No hint (stop_reason: ${response.stop_reason})`);
    return NextResponse.json(response.parsed_output);
  } catch (err) {
    const status = err instanceof Anthropic.RateLimitError ? 429 : 502;
    return NextResponse.json({ error: err instanceof Error ? err.message : "Help is unavailable." }, { status });
  }
}
