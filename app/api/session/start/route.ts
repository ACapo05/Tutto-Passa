import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { buildPrompt, getProfile, DEFAULT_LANGUAGE } from "@/lib/languages";
import { toDateString } from "@/lib/srs";

const MAX_DUE_ITEMS = 8;

/**
 * Called just before a conversation starts. Pulls what the schedule says is due plus the
 * memory of the last session, and returns the ElevenLabs session overrides.
 *
 * The persona prompt is built here, not in the ElevenLabs dashboard, so this repo stays the
 * single source of truth and a new language needs no dashboard work.
 */
export async function GET(request: Request) {
  const lang = new URL(request.url).searchParams.get("lang") ?? DEFAULT_LANGUAGE;
  const profile = getProfile(lang);

  const [{ data: due }, { data: last }] = await Promise.all([
    supabase
      .from("items")
      .select("kind, item_key, correct_form, note, recurrence_count")
      .eq("language", lang)
      .lte("next_due", toDateString(new Date()))
      // Most-repeated first: a persistent error deserves the airtime more than a one-off.
      .order("recurrence_count", { ascending: false })
      .limit(MAX_DUE_ITEMS),
    supabase
      .from("sessions")
      .select("memory")
      .eq("language", lang)
      .not("memory", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const dueLines = (due ?? []).map((i) =>
    [i.correct_form ?? i.item_key, i.note].filter(Boolean).join(" — ")
  );

  return NextResponse.json({
    language: lang,
    due: dueLines,
    overrides: {
      agent: {
        prompt: { prompt: buildPrompt(profile, dueLines, last?.memory) },
        firstMessage: profile.firstMessage,
        language: profile.elevenLabsLanguage,
      },
      ...(profile.voiceId ? { tts: { voiceId: profile.voiceId } } : {}),
    },
  });
}
