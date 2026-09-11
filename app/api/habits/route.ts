import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { toDateString } from "@/lib/srs";

const Body = z.union([
  z.object({ listening_minutes: z.number().int().min(0).max(1440) }),
  z.object({ add_minutes: z.number().int().min(1).max(60) }),
]);

/**
 * Records today's listening minutes: set directly (listening done elsewhere) or added a minute at
 * a time by the player. Speaking and flashcards are counted from what happened in the app.
 */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const day = toDateString(new Date());

  let minutes: number;
  if ("add_minutes" in parsed.data) {
    // ponytail: read then write. Fine for one listener; use an RPC doing `listening_minutes + n` if several devices play at once.
    const { data, error } = await supabase.from("habits").select("listening_minutes").eq("day", day).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    minutes = Math.min(1440, (data?.listening_minutes ?? 0) + parsed.data.add_minutes);
  } else {
    minutes = parsed.data.listening_minutes;
  }

  const { error } = await supabase
    .from("habits")
    .upsert({ day, listening_minutes: minutes, updated_at: new Date().toISOString() }, { onConflict: "day" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved: true, listening_minutes: minutes });
}
