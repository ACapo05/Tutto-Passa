import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { LANGUAGES, DEFAULT_LANGUAGE } from "@/lib/languages";
import { newCard, toDateString } from "@/lib/srs";

/**
 * Saves a word tapped during a call as a new flashcard, due now. A word that is already
 * tracked keeps its schedule.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const word = typeof body.word === "string" ? body.word.trim() : "";
  const meaning = typeof body.meaning === "string" ? body.meaning.trim() : "";
  if (!word || !meaning || word.length > 60) {
    return NextResponse.json({ error: "word and meaning are required" }, { status: 400 });
  }
  const language = LANGUAGES[body.language] ? body.language : DEFAULT_LANGUAGE;
  const itemKey = word.toLowerCase().replace(/\s+/g, "-");
  const today = new Date();

  const { error } = await supabase.from("items").upsert(
    {
      language,
      kind: "vocab",
      item_key: itemKey,
      correct_form: word,
      note: meaning.slice(0, 300),
      first_seen: toDateString(today),
      interval_days: 0,
      recurrence_count: 1,
      ...newCard(today),
    },
    { onConflict: "language,kind,item_key", ignoreDuplicates: true }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved: true, item_key: itemKey });
}
