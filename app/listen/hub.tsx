"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { Button, Eyebrow, Section, Surface } from "@/components/ui";
import type { Episode } from "@/lib/podcasts";
import type { Story } from "./story";

export type ShowView = { id: string; name: string; by: string; about: string; episodes: Episode[] };

type Playing = { kind: "story" | "episode"; title: string; src: string };
type Gloss = { word: string; status: "loading" | "ready" | "error"; meaning?: string; note?: string; saved?: boolean };

const STEP = 15;
const SLOW = 0.8;
const PUNCTUATION = /^[.,!?;:«»"“”()…'-]+|[.,!?;:«»"“”()…'-]+$/g;

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

const words = (text: string) => text.split(/\s+/).filter(Boolean);
const length = (seconds: number | null) => (seconds ? `${Math.max(1, Math.round(seconds / 60))} min` : "");

function PlayIcon({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
      {playing ? (
        <path d="M5 3.5v9M11 3.5v9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      ) : (
        <path d="M5 3.2v9.6L13 8z" fill="currentColor" />
      )}
    </svg>
  );
}

/**
 * One page for listening. The story is heard first without text (the way comprehension grows),
 * then read along with the words lit as the voice reaches them. Every minute of real playback,
 * story or podcast, counts toward the week without a tap.
 */
export function ListenHub(props: {
  month: number;
  cefr: string;
  daysToNext: number | null;
  story: Story | null;
  storyProblem: string | null;
  shows: ShowView[];
  listenedToday: number;
  listenedWeek: number;
  weeklyTarget: number;
}) {
  const { month, cefr, daysToNext, storyProblem, shows, weeklyTarget } = props;
  const audio = useRef<HTMLAudioElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const asked = useRef(false);
  const heard = useRef({ last: 0, seconds: 0 });
  const [story, setStory] = useState(props.story);
  const [writing, setWriting] = useState<"idle" | "writing" | "failed">(props.story || storyProblem ? "idle" : "writing");
  const [playing, setPlaying] = useState<Playing | null>(null);
  const [paused, setPaused] = useState(true);
  const [slow, setSlow] = useState(false);
  const [showText, setShowText] = useState(false);
  const [showEnglish, setShowEnglish] = useState(false);
  const [gloss, setGloss] = useState<Gloss | null>(null);
  const [minutesToday, setMinutesToday] = useState(props.listenedToday);
  const [minutesWeek, setMinutesWeek] = useState(props.listenedWeek);

  // Today's story is written and recorded on the first visit of the day.
  useEffect(() => {
    if (story || storyProblem || asked.current) return;
    asked.current = true;
    post("/api/listening/story", {})
      .then((data) => {
        setStory(data.story);
        setWriting("idle");
      })
      .catch(() => setWriting("failed"));
  }, [story, storyProblem]);

  const titleWords = story ? words(story.title).length : 0;
  const paragraphWords = (story?.paragraphs ?? []).reduce<{ w: string; i: number }[][]>((all, p) => {
    const start = titleWords + all.reduce((n, ws) => n + ws.length, 0);
    return [...all, words(p).map((w, k) => ({ w, i: start + k }))];
  }, []);
  const totalWords = titleWords + paragraphWords.reduce((n, ws) => n + ws.length, 0);
  // Only light words up when the timings line up with the text; otherwise the highlight would drift.
  const synced = Boolean(story && story.wordStarts.length === totalWords);
  const storyPlaying = playing?.kind === "story";

  useEffect(() => {
    const el = audio.current;
    const root = transcript.current;
    if (!el || !root || !story || !storyPlaying || !synced) return;
    let frame = 0;
    const tick = () => {
      let current = -1;
      while (current + 1 < story.wordStarts.length && story.wordStarts[current + 1] <= el.currentTime) current++;
      root.querySelectorAll<HTMLElement>("[data-i]").forEach((w) => w.toggleAttribute("data-said", Number(w.dataset.i) <= current));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [story, storyPlaying, synced, showText]);

  function play(next: Playing) {
    const el = audio.current;
    if (!el) return;
    if (playing?.src === next.src) {
      if (el.paused) void el.play();
      else el.pause();
      return;
    }
    setPlaying(next);
    el.src = next.src;
    el.defaultPlaybackRate = el.playbackRate = slow ? SLOW : 1;
    heard.current.last = 0;
    void el.play();
  }

  function toggleSlow() {
    const next = !slow;
    setSlow(next);
    if (audio.current) audio.current.defaultPlaybackRate = audio.current.playbackRate = next ? SLOW : 1;
  }

  // Counts real listening only: time that actually played, not seeking or scrubbing.
  function onTimeUpdate() {
    const el = audio.current;
    if (!el) return;
    const h = heard.current;
    const delta = el.currentTime - h.last;
    h.last = el.currentTime;
    if (el.paused || delta <= 0 || delta > 2) return;
    h.seconds += delta / el.playbackRate;
    if (h.seconds < 60) return;
    h.seconds -= 60;
    setMinutesToday((m) => m + 1);
    setMinutesWeek((m) => m + 1);
    void post("/api/habits", { add_minutes: 1 }).catch(() => {});
  }

  function adjust(delta: number) {
    const before = minutesToday;
    const next = Math.max(0, before + delta);
    setMinutesToday(next);
    setMinutesWeek((w) => w + next - before);
    post("/api/habits", { listening_minutes: next }).catch(() => {
      setMinutesToday(before);
      setMinutesWeek((w) => w - (next - before));
    });
  }

  async function lookUp(word: string, sentence: string) {
    if (!word) return;
    setGloss({ word, status: "loading" });
    try {
      const data = await post("/api/help", { kind: "word", word, sentence });
      setGloss((g) => (g?.word === word ? { ...g, status: "ready", meaning: data.meaning, note: data.note } : g));
    } catch {
      setGloss((g) => (g?.word === word ? { ...g, status: "error" } : g));
    }
  }

  async function save() {
    if (!gloss?.meaning) return;
    const { word, meaning } = gloss;
    try {
      await post("/api/words", { word, meaning });
      setGloss((g) => (g?.word === word ? { ...g, saved: true } : g));
    } catch {
      setGloss((g) => (g?.word === word ? { ...g, status: "error" } : g));
    }
  }

  return (
    <>
      <header className="flex items-baseline justify-between">
        <Link href="/" className="text-sm font-semibold text-muted hover:text-ink">
          Home
        </Link>
        <span className="text-sm font-semibold text-muted">
          Month {month} · {cefr}
        </span>
      </header>

      <h1 className="mt-6 text-2xl font-extrabold">Listening</h1>
      <p className="mt-1 tabular-nums text-muted">
        {minutesToday} min today, {minutesWeek} of {weeklyTarget} this week
      </p>
      {daysToNext !== null && (
        <p className="text-sm text-muted">
          Stories and podcasts step up a level in {daysToNext} {daysToNext === 1 ? "day" : "days"}.
        </p>
      )}

      <Surface className="mt-6">
        <Eyebrow>Today&rsquo;s story</Eyebrow>
        {story ? (
          <>
            <h2 lang="it" className="mt-2 font-voice text-2xl leading-snug">
              {story.title}
            </h2>
            <p className="mt-1 text-sm text-muted">Listen once without reading. Then read along, and answer the questions.</p>
            <Button variant="primary" onClick={() => play({ kind: "story", title: story.title, src: story.audioUrl })} className="mt-4 w-full">
              {storyPlaying && !paused ? "Pause" : storyPlaying ? "Resume story" : "Play story"}
            </Button>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" aria-pressed={showText} onClick={() => setShowText((v) => !v)}>
                {showText ? "Hide text" : "Read along"}
              </Button>
              {showText && (
                <Button size="sm" aria-pressed={showEnglish} onClick={() => setShowEnglish((v) => !v)}>
                  {showEnglish ? "Hide English" : "Show English"}
                </Button>
              )}
            </div>

            {showText && (
              <div ref={transcript} className="transcript mt-5 space-y-4" data-live={storyPlaying && synced ? "" : undefined}>
                {paragraphWords.map((ws, p) => (
                  <div key={p}>
                    <p lang="it" className="font-voice text-xl leading-relaxed">
                      {ws.map(({ w, i }, k) => (
                        <Fragment key={i}>
                          {k > 0 && " "}
                          <button
                            type="button"
                            data-i={i}
                            onClick={() => lookUp(w.replace(PUNCTUATION, ""), story.paragraphs[p])}
                            aria-pressed={gloss?.word === w.replace(PUNCTUATION, "")}
                            className="word -mx-0.5 rounded px-0.5 hover:bg-ground aria-pressed:bg-basil-soft"
                          >
                            {w}
                          </button>
                        </Fragment>
                      ))}
                    </p>
                    {showEnglish && story.english[p] && <p className="mt-1 text-[0.95rem] text-muted">{story.english[p]}</p>}
                  </div>
                ))}
                {!gloss && <p className="text-xs text-muted">Tap any word for English.</p>}
                {gloss && (
                  <div className="rise rounded-2xl bg-ground p-4" role="status">
                    <div className="flex items-start justify-between gap-3">
                      <p lang="it" className="font-voice text-xl">
                        {gloss.word}
                      </p>
                      <button type="button" onClick={() => setGloss(null)} aria-label="Close translation" className="text-sm font-semibold text-muted hover:text-ink">
                        Close
                      </button>
                    </div>
                    {gloss.status === "loading" && <div className="mt-2 h-5 w-44 animate-pulse rounded-md bg-line" aria-label="Translating" />}
                    {gloss.status === "error" && <p className="mt-1 text-sm text-tomato-ink">That didn&rsquo;t work. Tap the word again.</p>}
                    {gloss.status === "ready" && (
                      <>
                        <p className="mt-1">{gloss.meaning}</p>
                        {gloss.note && <p className="mt-1 text-sm text-muted">{gloss.note}</p>}
                        <Button size="sm" onClick={save} disabled={gloss.saved} className="mt-3">
                          {gloss.saved ? "Saved for review" : "Save for review"}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 border-t border-line pt-4">
              <Eyebrow>After listening</Eyebrow>
              <ol className="mt-2 space-y-3">
                {story.questions.map((q, n) => (
                  <li key={n}>
                    <details className="group">
                      <summary className="cursor-pointer list-none font-semibold [&::-webkit-details-marker]:hidden">
                        {n + 1}. {q.question} <span className="text-sm font-normal text-muted group-open:hidden">Show answer</span>
                      </summary>
                      <p className="mt-1 text-muted">{q.answer}</p>
                    </details>
                  </li>
                ))}
              </ol>
            </div>
          </>
        ) : storyProblem || writing === "failed" ? (
          <p role="alert" className="mt-2 text-sm font-semibold text-tomato-ink">
            {storyProblem ?? "Today's story could not be made. Open this page again to retry."}
          </p>
        ) : (
          <div className="mt-3" aria-label="Writing and recording today's story">
            <div className="h-7 w-3/5 animate-pulse rounded-md bg-line" />
            <div className="mt-4 h-12 w-full animate-pulse rounded-2xl bg-line" />
            <p className="mt-3 text-sm text-muted">Writing and recording today&rsquo;s story at your level. This takes about a minute.</p>
          </div>
        )}
      </Surface>

      <Section title="Real Italian for your level">
        <p className="text-sm text-muted">Episodes from podcasts made for learners at month {month}, streamed from each show.</p>
        {shows.map((s) => (
          <div key={s.id} className="mt-6">
            <p className="font-semibold">
              {s.name} <span className="font-normal text-muted">· {s.by}</span>
            </p>
            <p className="text-sm text-muted">{s.about}</p>
            {s.episodes.length === 0 ? (
              <p className="mt-2 text-sm text-muted">This show could not be reached just now.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {s.episodes.map((e) => {
                  const active = playing?.src === e.audio;
                  return (
                    <li key={e.audio} className="flex items-center gap-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => play({ kind: "episode", title: `${s.name}: ${e.title}`, src: e.audio })}
                        aria-label={`${active && !paused ? "Pause" : "Play"} ${e.title}`}
                        className={`grid size-10 shrink-0 place-items-center rounded-full border ${
                          active ? "border-basil bg-basil text-card" : "border-line bg-card hover:bg-ground"
                        }`}
                      >
                        <PlayIcon playing={active && !paused} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-[0.95rem] leading-snug">{e.title}</p>
                        <p className="text-xs tabular-nums text-muted">{length(e.seconds)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </Section>

      <div className="mt-12 flex items-center justify-between gap-4 border-t border-line pt-5">
        <div className="min-w-0">
          <p className="font-semibold">Listened somewhere else?</p>
          <p className="text-sm text-muted">Shows, other podcasts, a film in Italian.</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button size="sm" onClick={() => adjust(-STEP)} disabled={minutesToday === 0} aria-label={`Remove ${STEP} minutes`}>
            −{STEP}
          </Button>
          <Button size="sm" onClick={() => adjust(STEP)} aria-label={`Add ${STEP} minutes`}>
            +{STEP}
          </Button>
        </div>
      </div>

      <div
        hidden={!playing}
        className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-card px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3"
      >
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{playing?.title}</p>
            <audio
              ref={audio}
              controls
              preload="none"
              onTimeUpdate={onTimeUpdate}
              onPlay={() => setPaused(false)}
              onPause={() => setPaused(true)}
              className="mt-1 h-9 w-full"
            />
          </div>
          <Button size="sm" onClick={toggleSlow} aria-pressed={slow} aria-label="Slower playback" className="shrink-0">
            {slow ? `${SLOW}×` : "1×"}
          </Button>
        </div>
      </div>
    </>
  );
}
