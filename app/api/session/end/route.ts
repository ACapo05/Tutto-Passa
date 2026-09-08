import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getProfile, DEFAULT_LANGUAGE } from "@/lib/languages";
import { critique, type TranscriptTurn } from "@/lib/critique";
import { nextReview, toDateString, addDays } from "@/lib/srs";

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

export async function POST(request: Request) {
  const { conversationId, language = DEFAULT_LANGUAGE } = await request.json();
  if (!conversationId) return NextResponse.json({ error: "conversationId is required" }, { status: 400 });

  // The page can retry, and a re-run would double-count the schedule. Return what we have.
  const { data: existing } = await supabase
    .from("sessions").select("report").eq("conversation_id", conversationId).maybeSingle();
  if (existing?.report) return NextResponse.json({ report: existing.report, cached: true });

  const conversation = await fetchTranscript(conversationId);
  const transcript: TranscriptTurn[] = conversation.transcript ?? [];

  if (!transcript.some((t) => t.role === "user" && t.message?.trim())) {
    return NextResponse.json({ error: "Nothing was said in that conversation." }, { status: 422 });
  }

  const profile = getProfile(language);
  const { data: tracked } = await supabase
    .from("items")
    .select("id, kind, item_key, interval_days, recurrence_count")
    .eq("language", language);
  const byKey = new Map((tracked ?? []).map((i) => [i.item_key, i]));

  const report = await critique(profile, transcript, [...byKey.keys()]);

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

  type ItemRow = {
    language: string;
    kind: string;
    item_key: string;
    you_said?: string;
    correct_form?: string;
    note?: string;
    first_seen?: string;
    last_reviewed: string;
    next_due: string;
    interval_days: number;
    recurrence_count: number;
  };

  const today = new Date();
  const fresh = {
    first_seen: toDateString(today),
    last_reviewed: toDateString(today),
    next_due: toDateString(addDays(today, 1)),
    interval_days: 1,
    recurrence_count: 1,
  };

  // A correction on a tracked key is a repeat: reset the interval and bump the count.
  // A correction on an unknown key is a first sighting.
  const rows: ItemRow[] = report.corrections.map((c): ItemRow => {
    const prior = byKey.get(c.item_key);
    return {
      language,
      kind: "mistake" as const,
      item_key: c.item_key,
      you_said: c.you_said,
      correct_form: c.correct_form,
      note: c.explanation,
      ...(prior ? nextReview(prior, "mistake", today) : fresh),
    };
  });

  // Using an item correctly in real speech is the review event — no quiz needed.
  const corrected = new Set(report.corrections.map((c) => c.item_key));
  for (const key of report.handled_correctly) {
    const prior = byKey.get(key);
    if (!prior || corrected.has(key)) continue; // a correction in the same session wins
    rows.push({
      language,
      kind: prior.kind,
      item_key: key,
      ...nextReview(prior, "correct", today),
    });
  }

  for (const v of report.new_vocab) {
    if (byKey.has(v.item_key)) continue;
    rows.push({
      language,
      kind: "vocab" as const,
      item_key: v.item_key,
      correct_form: v.word,
      note: v.meaning,
      ...fresh,
    });
  }

  if (rows.length) {
    const { error } = await supabase.from("items").upsert(rows, { onConflict: "language,kind,item_key" });
    if (error) throw new Error(`Saving review items failed: ${error.message}`);
  }

  return NextResponse.json({ report, itemsUpdated: rows.length });
}
