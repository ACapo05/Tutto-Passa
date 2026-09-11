/**
 * Italian read aloud with an ElevenLabs voice, with the start time of every word so a transcript
 * can follow the audio. fetch and Buffer only, so node --test can load it directly.
 */

type Alignment = { characters: string[]; character_start_times_seconds: number[] };

/** The start time of each whitespace-separated word, from per-character timings. */
export function wordStarts(alignment: Alignment): number[] {
  const starts: number[] = [];
  let inWord = false;
  alignment.characters.forEach((ch, i) => {
    const space = /\s/.test(ch);
    if (!space && !inWord) starts.push(alignment.character_start_times_seconds[i]);
    inWord = !space;
  });
  return starts;
}

export async function readAloud(text: string, voiceId: string) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_64`, {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!, "content-type": "application/json" },
    body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  const data: { audio_base64: string; alignment: Alignment } = await res.json();
  return { audio: Buffer.from(data.audio_base64, "base64"), wordStarts: wordStarts(data.alignment) };
}
