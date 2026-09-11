import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { schedule, type Grade } from "@/lib/srs";

const Body = z.object({
  id: z.string().uuid(),
  rating: z.number().int().min(1).max(4), // Again, Hard, Good, Easy
});

/** One flashcard answer. The schedule is recomputed from the stored card, never taken from the browser. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { id, rating } = parsed.data;

  const { data: item, error } = await supabase.from("items").select("fsrs").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!item) return NextResponse.json({ error: "No such card" }, { status: 404 });

  const update = schedule(item.fsrs, rating as Grade);
  const { error: saveError } = await supabase.from("items").update(update).eq("id", id);
  if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 });
  return NextResponse.json({ saved: true, next_due: update.next_due });
}
