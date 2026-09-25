import { cookies } from "next/headers";
import { getProfile } from "./languages";
import { supabase } from "./supabase";
import { toDateString } from "./srs";

/** The cookie the language picker sets. Server-only: pages and routes read it, the browser never needs to. */
export const LANGUAGE_COOKIE = "lang";

/** The language this person picked, or the default. Every page and route asks this, so one choice switches the whole app. */
export async function currentProfile() {
  return getProfile((await cookies()).get(LANGUAGE_COOKIE)?.value);
}

/**
 * The first day of this learner's year in a language: their first call or card in it, or today
 * if there is none yet. Nothing is configured, so a new copy of the app, or a newly picked
 * language, always starts at week 1.
 */
export async function planStart(code: string): Promise<string> {
  const [session, item] = await Promise.all([
    supabase.from("sessions").select("created_at").eq("language", code).order("created_at").limit(1).maybeSingle(),
    supabase.from("items").select("first_seen").eq("language", code).not("first_seen", "is", null).order("first_seen").limit(1).maybeSingle(),
  ]);
  const days = [session.data ? toDateString(new Date(session.data.created_at)) : null, item.data?.first_seen ?? null];
  return days.filter((d): d is string => Boolean(d)).sort()[0] ?? toDateString(new Date());
}
