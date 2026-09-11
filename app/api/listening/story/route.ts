import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { addDays, toDateString } from "@/lib/srs";
import { listeningLevel, whereInPlan } from "@/lib/plan";
import { getProfile } from "@/lib/languages";
import { writeStory, type StoryText } from "@/lib/story-writer";
import { readAloud } from "@/lib/voice";
import { STORY_COLUMNS, toStory, type StoryRow } from "@/app/listen/story";

export const maxDuration = 300;

const LANGUAGE = "it";
const BUCKET = "listening";

async function storyFor(day: string) {
  const { data, error } = await supabase.from("stories").select(STORY_COLUMNS).eq("language", LANGUAGE).eq("day", day).maybeSingle();
  if (error) throw new Error(`${error.message}. Run the stories table from supabase/schema.sql.`);
  return data ? toStory(data as StoryRow) : null;
}

/**
 * Writes and records today's story, once. Claude writes it at this month's level, ElevenLabs
 * reads it in Giulia's voice, and the audio is stored so it is paid for only once.
 */
export async function POST() {
  const now = new Date();
  const today = toDateString(now);
  const level = listeningLevel(today);

  try {
    const existing = await storyFor(today);
    if (existing) return NextResponse.json({ story: existing });

    // Deck words from the last two weeks come back in the story, in new sentences.
    const { data: recentCards } = await supabase
      .from("items")
      .select("card")
      .eq("language", LANGUAGE)
      .eq("kind", "deck")
      .like("item_key", "%:it-en")
      .gte("first_seen", toDateString(addDays(now, -14)))
      .limit(100);
    const recent = [...new Set((recentCards ?? []).map((r) => r.card?.word).filter(Boolean))] as string[];

    let text: StoryText;
    try {
      text = await writeStory({ level, focus: whereInPlan(today).focus, recent });
    } catch (err) {
      const status = err instanceof Anthropic.RateLimitError ? 429 : 502;
      return NextResponse.json({ error: err instanceof Error ? err.message : "The story could not be written." }, { status });
    }

    const voiceId = getProfile(LANGUAGE).voiceId;
    if (!voiceId) throw new Error("Set voiceId for Italian in lib/languages.ts.");
    const { audio, wordStarts } = await readAloud([text.title, ...text.paragraphs].join("\n\n"), voiceId);

    // A unique name, so two requests racing on the first visit can never mix one story's text with another's audio.
    const path = `${LANGUAGE}/${today}-${now.getTime()}.mp3`;
    const upload = () => supabase.storage.from(BUCKET).upload(path, audio, { contentType: "audio/mpeg" });
    let { error: uploadError } = await upload();
    if (uploadError && /not found/i.test(uploadError.message)) {
      // The very first story: create the public bucket the audio lives in.
      await supabase.storage.createBucket(BUCKET, { public: true });
      ({ error: uploadError } = await upload());
    }
    if (uploadError) throw new Error(`Saving the audio failed: ${uploadError.message}`);

    const { error: insertError } = await supabase.from("stories").upsert(
      {
        language: LANGUAGE,
        day: today,
        month: level.month,
        title: text.title,
        paragraphs: text.paragraphs,
        english: text.english,
        questions: text.questions,
        audio_url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl,
        word_starts: wordStarts,
      },
      { onConflict: "language,day", ignoreDuplicates: true }
    );
    if (insertError) throw new Error(insertError.message);

    // If another request saved first, this returns that story, so text and audio always match.
    return NextResponse.json({ story: await storyFor(today) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "The story could not be made." }, { status: 500 });
  }
}
