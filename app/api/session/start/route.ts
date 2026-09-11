import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { buildPrompt, getProfile, DEFAULT_LANGUAGE } from "@/lib/languages";
import { addDays, toDateString } from "@/lib/srs";
import { whereInPlan } from "@/lib/plan";

const MAX_DUE_ITEMS = 8;

type OverrideFlags = {
  agent?: { prompt?: { prompt?: boolean }; first_message?: boolean; language?: boolean };
  tts?: { voice_id?: boolean };
};

/**
 * Which session overrides the agent's Security tab allows. Sending one it forbids makes
 * ElevenLabs refuse the whole call, so only allowed ones are sent. Null means unknown.
 */
async function allowedOverrides(): Promise<OverrideFlags | null> {
  const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID}`, {
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! },
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) return null;
  const data = await res.json();
  return data.platform_settings?.overrides?.conversation_config_override ?? null;
}

/**
 * Called just before a conversation starts. Pulls what the schedule says is due plus the
 * memory of the last session, and returns the ElevenLabs session overrides.
 *
 * The persona prompt is built here, not in the ElevenLabs dashboard, so this repo stays the
 * single source of truth and a new language needs no dashboard work. If the agent does not
 * allow a prompt override, the persona is returned as `context` for the page to send once the
 * call connects: weaker than a system prompt, but the call is not refused.
 */
export async function GET(request: Request) {
  const lang = new URL(request.url).searchParams.get("lang") ?? DEFAULT_LANGUAGE;
  const profile = getProfile(lang);

  const today = toDateString(new Date());
  const [{ data: due }, { data: last }, allowed, { data: learned }] = await Promise.all([
    supabase
      .from("items")
      .select("kind, item_key, correct_form, note, recurrence_count")
      .eq("language", lang)
      .neq("kind", "deck") // deck sentences are for flashcards; she steers toward what came from calls
      .lte("next_due", today)
      // Most-repeated first: a persistent error deserves the airtime more than a one-off.
      .order("recurrence_count", { ascending: false })
      .limit(MAX_DUE_ITEMS),
    supabase
      .from("sessions")
      .select("memory, report")
      .eq("language", lang)
      .not("memory", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    allowedOverrides(),
    // Words reviewed in the last week and not due again yet: the ones they have just learned.
    supabase
      .from("items")
      .select("kind, correct_form, card")
      .eq("language", lang)
      .in("kind", ["vocab", "deck"])
      .gte("last_reviewed", toDateString(addDays(new Date(), -7)))
      .gt("next_due", today)
      .limit(16),
  ]);

  const dueLines = (due ?? []).map((i) =>
    [i.correct_form ?? i.item_key, i.note].filter(Boolean).join(" — ")
  );

  const ok = (flag?: boolean) => allowed === null || flag === true;
  const plan = whereInPlan(today);
  const prompt = buildPrompt(profile, {
    due: dueLines,
    memory: last?.memory,
    mission: last?.report?.next_mission ?? profile.starterMission,
    level: plan.phase.giulia,
    focus: plan.focus,
    // A deck word has two cards, so the same word can appear twice.
    learned: [...new Set((learned ?? []).map((w) => (w.kind === "deck" ? w.card?.word : w.correct_form)).filter(Boolean))],
  });

  return NextResponse.json({
    language: lang,
    due: dueLines,
    overrides: {
      agent: {
        ...(ok(allowed?.agent?.prompt?.prompt) ? { prompt: { prompt } } : {}),
        ...(ok(allowed?.agent?.first_message) ? { firstMessage: profile.firstMessage } : {}),
        ...(ok(allowed?.agent?.language) ? { language: profile.elevenLabsLanguage } : {}),
      },
      ...(profile.voiceId && ok(allowed?.tts?.voice_id) ? { tts: { voiceId: profile.voiceId } } : {}),
    },
    ...(ok(allowed?.agent?.prompt?.prompt)
      ? {}
      : {
          context:
            `From now on, follow these instructions. They replace anything you were told before. ` +
            `The language is ${profile.name}.\n\n${prompt}`,
        }),
  });
}
