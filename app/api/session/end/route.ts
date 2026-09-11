import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getProfile, DEFAULT_LANGUAGE } from "@/lib/languages";
import { critique, type TranscriptTurn } from "@/lib/critique";
import { newCard, Rating, schedule, toDateString, type StoredCard } from "@/lib/srs";
import { whereInPlan } from "@/lib/plan";

export const maxDuration = 120; // the critique call plus polling can exceed the default

const POLL_ATTEMPTS = 20;
const POLL_INTERVAL_MS = 2000;

/** ElevenLabs finishes the transcript after the call ends, so the conversation must be polled. */
async function fetchTranscript(conversationId: string) {
  const url = `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`;
  const headers = { "xi-api-key": process.env.ELEVENLABS_API_KEY! };

  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
    const data = await res.json();
    if (data.status === "done" || data.status === "failed") return data;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error("Transcript was still processing after 40 seconds.");
}

type Tracked = { id: string; item_key: string; recurrence_count: number; first_seen: string | null; fsrs: StoredCard | null };

/* Every inserted row has the same keys: a bulk upsert fills missing keys with null. */
type ItemRow = {
  language: string;
  kind: "mistake" | "vocab";
  item_key: string;
  you_said: string | null;
  correct_form: string;
  note: string;
  first_seen: string;
  recurrence_count: number;
  fsrs: StoredCard;
  next_due: string;
  last_reviewed: string | null;
  interval_days: number;
};

export async function POST(request: Request) {
  const { conversationId, language = DEFAULT_LANGUAGE } = await request.json();
  if (!conversationId) return NextResponse.json({ error: "conversationId is required" }, { status: 400 });

  // The page can retry, and a re-run would double-count the schedule. Return what we have.
  const { data: existing } = await supabase
    .from("sessions").select("report").eq("conversation_id", conversationId).maybeSingle();
  if (existing?.report) return NextResponse.json({ report: existing.report, cached: true });

  let conversation;
  try {
    conversation = await fetchTranscript(conversationId);
  } catch (err) {
    // Usually the API key lacks the convai_read permission. Say so, instead of a bare HTML 500.
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
  const transcript: TranscriptTurn[] = conversation.transcript ?? [];

  if (!transcript.some((t) => t.role === "user" && t.message?.trim())) {
    return NextResponse.json({ error: "Nothing was said in that conversation." }, { status: 422 });
  }

  const profile = getProfile(language);
  const { data: tracked } = await supabase
    .from("items")
    .select("id, item_key, recurrence_count, first_seen, fsrs")
    .eq("language", language)
    .neq("kind", "deck"); // the critique tracks mistakes and words from calls, not deck sentences
  const byKey = new Map(((tracked ?? []) as Tracked[]).map((i) => [i.item_key, i]));

  const report = await critique(profile, transcript, [...byKey.keys()], whereInPlan(toDateString(new Date())).focus);

  await supabase.from("sessions").upsert(
    {
      conversation_id: conversationId,
      language,
      started_at: conversation.metadata?.start_time_unix_secs
        ? new Date(conversation.metadata.start_time_unix_secs * 1000).toISOString()
        : null,
      duration_secs: conversation.metadata?.call_duration_secs ?? null,
      transcript,
      report,
      memory: report.memory,
    },
    { onConflict: "conversation_id" }
  );

  const now = new Date();
  const today = toDateString(now);

  // A mistake in real speech is an Again. A repeat also bumps recurrence_count, so a
  // persistent error looks different from a slip.
  const rows: ItemRow[] = report.corrections.map((c) => {
    const prior = byKey.get(c.item_key);
    return {
      language,
      kind: "mistake",
      item_key: c.item_key,
      you_said: c.you_said,
      correct_form: c.correct_form,
      note: c.explanation,
      first_seen: prior?.first_seen ?? today,
      recurrence_count: (prior?.recurrence_count ?? 0) + 1,
      ...schedule(prior?.fsrs ?? null, Rating.Again, now),
    };
  });

  for (const v of report.new_vocab) {
    if (byKey.has(v.item_key)) continue;
    rows.push({
      language,
      kind: "vocab",
      item_key: v.item_key,
      you_said: null,
      correct_form: v.word,
      note: v.meaning,
      first_seen: today,
      recurrence_count: 1,
      last_reviewed: null,
      interval_days: 0,
      ...newCard(now),
    });
  }

  // Using something correctly in real speech is a Good review. Only the schedule changes, so
  // these are updates by id: an upsert would null the fields they do not send.
  const corrected = new Set(report.corrections.map((c) => c.item_key));
  const updates = report.handled_correctly
    .map((key) => byKey.get(key))
    .filter((prior): prior is Tracked => Boolean(prior) && !corrected.has(prior!.item_key))
    .map((prior) => supabase.from("items").update(schedule(prior.fsrs, Rating.Good, now)).eq("id", prior.id));

  const results = await Promise.all([
    ...(rows.length ? [supabase.from("items").upsert(rows, { onConflict: "language,kind,item_key" })] : []),
    ...updates,
  ]);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    return NextResponse.json({ error: `Saving review items failed: ${failed.error.message}` }, { status: 500 });
  }

  return NextResponse.json({ report, itemsUpdated: rows.length + updates.length });
}
