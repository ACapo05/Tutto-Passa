/**
 * One-off: find a voice with a regional accent in the ElevenLabs voice library.
 *
 *   npm run find-voice                 # every Italian voice, grouped by accent
 *   npm run find-voice -- it romano    # filter by a search term
 *   npm run find-voice -- es mexican   # another language, by its code in lib/languages
 *
 * Listen to the preview URLs, then paste the winning id into `voiceId` in lib/languages/<code>.ts.
 */
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) throw new Error("ELEVENLABS_API_KEY is not set. Put it in .env.local and run: npm run find-voice");

const API = "https://api.elevenlabs.io/v1";

async function get(path: string) {
  const res = await fetch(`${API}${path}`, { headers: { "xi-api-key": KEY! } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} on ${path}: ${await res.text()}`);
  return res.json();
}

type SharedVoice = {
  voice_id: string;
  name: string;
  accent?: string;
  gender?: string;
  age?: string;
  description?: string;
  preview_url?: string;
};

const [language = "it", search] = process.argv.slice(2);

// The accents endpoint is the authoritative list of what actually exists for a language.
// It is not critical, so a failure here must not stop the voice listing below.
try {
  const accents = await get(`/voices/accents?language=${language}`);
  const names = (accents.accents ?? accents ?? []).map((a: unknown) =>
    typeof a === "string" ? a : (a as { name?: string; accent_id?: string }).name ?? (a as { accent_id?: string }).accent_id
  );
  console.log(`\n${language} accent tags in the library (${names.length}):\n  ${names.join(", ")}\n`);
} catch (err) {
  console.log(`\n(accent list unavailable: ${(err as Error).message.split("\n")[0]})\n`);
}

const qs = new URLSearchParams({ language, page_size: "100" });
if (search) qs.set("search", search);
const shared = await get(`/shared-voices?${qs}`);
const voices: SharedVoice[] = shared.voices ?? [];

if (!voices.length) {
  console.log(`No ${language} voices matched${search ? ` "${search}"` : ""}. Try a different search term.`);
} else {
  // Group by accent so a regional voice is visible at a glance rather than buried in the list.
  const byAccent = new Map<string, SharedVoice[]>();
  for (const v of voices) {
    const key = v.accent ?? "(no accent tag)";
    byAccent.set(key, [...(byAccent.get(key) ?? []), v]);
  }
  for (const [accent, list] of [...byAccent].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n### ${accent}  (${list.length})`);
    for (const v of list) {
      console.log(`  ${v.name}  [${v.gender ?? "?"}, ${v.age ?? "?"}]`);
      console.log(`    id      ${v.voice_id}`);
      if (v.description) console.log(`    about   ${v.description.slice(0, 100)}`);
      if (v.preview_url) console.log(`    preview ${v.preview_url}`);
    }
  }
  console.log(`\n${voices.length} ${language} voices. Listen to the previews, then set voiceId in lib/languages/${language}.ts.\n`);
}

export {};
