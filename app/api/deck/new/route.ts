import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { addDays, newCard, toDateString } from "@/lib/srs";
import { whereInPlan } from "@/lib/plan";
import { CANDIDATES, NEW_WORDS_PER_DAY, pickCards, type DeckResult } from "@/lib/deck";
import { writeCards } from "@/lib/deck-writer";
import FREQUENCY from "@/lib/data/it-frequency.json";
import { CARD_COLUMNS, toReviewCard, type CardRow } from "@/app/review/cards";

export const maxDuration = 120;

const LANGUAGE = "it";

/**
 * Writes today's new deck words. Each word becomes two cards, Italian to English and English
 * to Italian. Safe to call twice: rows are keyed by word and direction, and a repeat inserts nothing.
 */
export async function POST() {
  const now = new Date();
  const today = toDateString(now);

  const { count, error } = await supabase
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("language", LANGUAGE)
    .eq("kind", "deck")
    .eq("first_seen", today)
    .like("item_key", "%:en-it");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const wanted = NEW_WORDS_PER_DAY - (count ?? 0);
  if (wanted <= 0) return NextResponse.json({ cards: [] });

  const [{ data: state, error: stateError }, { data: saved }] = await Promise.all([
    supabase.from("deck_state").select("position").eq("language", LANGUAGE).maybeSingle(),
    supabase.from("items").select("correct_form").eq("language", LANGUAGE).eq("kind", "vocab").limit(1000),
  ]);
  if (stateError) return NextResponse.json({ error: stateError.message }, { status: 500 });

  const position = state?.position ?? 0;
  const candidates = FREQUENCY.slice(position, position + CANDIDATES);
  if (!candidates.length) return NextResponse.json({ cards: [] });

  // Everything earlier in the list has had its turn; words saved from calls count as known too.
  const known = [...new Set([...FREQUENCY.slice(0, position), ...(saved ?? []).map((s) => s.correct_form).filter(Boolean)])];
  const plan = whereInPlan(today);

  let results: DeckResult[];
  try {
    results = await writeCards({ candidates, known, level: plan.phase.giulia, focus: plan.focus });
  } catch (err) {
    const status = err instanceof Anthropic.RateLimitError ? 429 : 502;
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not write cards." }, { status });
  }

  const { chosen, consumed } = pickCards(candidates, results, wanted);
  // Anki buries new siblings: producing a sentence you read a minute ago tests nothing. The
  // English to Italian card waits until tomorrow.
  const tomorrow = addDays(now, 1);
  const rows = chosen.flatMap((c) =>
    (["it-en", "en-it"] as const).map((direction) => ({
      language: LANGUAGE,
      kind: "deck",
      item_key: `${c.form}:${direction}`,
      you_said: null,
      correct_form: c.italian,
      note: c.english,
      card: { word: c.form, gloss: c.gloss, direction },
      first_seen: today,
      recurrence_count: 1,
      interval_days: 0,
      ...newCard(direction === "it-en" ? now : tomorrow),
    }))
  );

  let inserted: CardRow[] = [];
  if (rows.length) {
    const { data, error: insertError } = await supabase
      .from("items")
      .upsert(rows, { onConflict: "language,kind,item_key", ignoreDuplicates: true })
      .select(CARD_COLUMNS);
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    inserted = (data ?? []) as CardRow[];
  }

  // Only move on once the cards are saved, so a failed insert does not lose words.
  const { error: positionError } = await supabase
    .from("deck_state")
    .upsert({ language: LANGUAGE, position: position + consumed }, { onConflict: "language" });
  if (positionError) return NextResponse.json({ error: positionError.message }, { status: 500 });

  // Only today's Italian to English cards join the session; their siblings are due tomorrow.
  const cards = inserted.filter((row) => row.card?.direction === "it-en").map(toReviewCard);
  return NextResponse.json({ cards });
}
