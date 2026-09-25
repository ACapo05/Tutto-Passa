"use client";

import { Fragment, useEffect, useRef, useState, ViewTransition } from "react";
import type { Mission } from "@/lib/languages";
import { Avatar, type AvatarMode } from "./avatar";
import { Button } from "./ui";
import { useLanguage } from "./language";

export type Turn = { who: "you" | "partner"; text: string };
export type CallView = "ringing" | "listening" | "thinking" | "speaking" | "muted" | "ended";
/** A phrase from today's ticket, and whether you have said it in this call. */
export type Phrase = { text: string; said: boolean };

const status = (name: string): Record<CallView, string> => ({
  ringing: `Calling ${name}…`,
  listening: "Your turn",
  thinking: `${name} is thinking`,
  speaking: `${name} is talking`,
  muted: "You're muted",
  ended: "Writing your report…",
});

const FACE: Record<CallView, AvatarMode> = {
  ringing: "idle",
  listening: "listening",
  thinking: "thinking",
  speaking: "speaking",
  muted: "idle",
  ended: "idle",
};

type Gloss = { word: string; line: string; status: "loading" | "ready" | "error"; meaning?: string; note?: string; saved?: boolean };
type Hint = { status: "loading" | "ready" | "error"; phrase?: string; english?: string };

type Props = {
  view: CallView;
  clock: string;
  mission: Mission | null;
  /** Today's phrases. Each turns green once you say it. */
  phrases?: Phrase[];
  turns: Turn[];
  /** How many characters of her current line have been voiced, or null when unknown. Read every frame. */
  spokenChars?: () => number | null;
  isMuted: boolean;
  onMute: () => void;
  onHangUp: () => void;
  inputVolume?: () => number;
  outputVolume?: () => number;
  outputFrequencies?: () => Uint8Array;
  /** Inside a frame on /stile instead of covering the page. */
  embedded?: boolean;
};

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

const PUNCTUATION = /^[.,!?;:«»"“”()…'-]+|[.,!?;:«»"“”()…'-]+$/g;

/** Her line as words that keep their character offsets, so timing data can light them up. */
function words(line: string) {
  return [...line.matchAll(/\S+/g)].map((m) => ({ text: m[0], start: m.index ?? 0, bare: m[0].replace(PUNCTUATION, "") }));
}

function Close({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="-m-2 grid size-9 shrink-0 place-items-center rounded-full text-muted hover:text-ink"
    >
      <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );
}

/**
 * The call. Subtitles, not chat bubbles: her language in a serif across the wall, lit word by
 * word as she says it, every word tappable for English. Help is text only, so what you hear
 * stays in the language. One panel at a time, and the partner steps back while one is open.
 */
export function CallScreen({
  view,
  clock,
  mission,
  phrases = [],
  turns,
  spokenChars,
  isMuted,
  onMute,
  onHangUp,
  inputVolume,
  outputVolume,
  outputFrequencies,
  embedded = false,
}: Props) {
  const language = useLanguage();
  const { partner } = language;
  const root = useRef<HTMLDivElement>(null);
  const caption = useRef<HTMLParagraphElement>(null);
  const [gloss, setGloss] = useState<Gloss | null>(null);
  const [hint, setHint] = useState<Hint | null>(null);

  const theirs = turns.findLast((t) => t.who === "partner")?.text ?? "";
  const you = turns.findLast((t) => t.who === "you")?.text ?? "";
  const live = view !== "ringing" && view !== "ended";
  const shownGloss = gloss?.line === theirs ? gloss : null;
  const panelOpen = Boolean(shownGloss || hint);

  // Move focus into the call when it opens, so keyboard and screen reader users land in it.
  useEffect(() => {
    if (!embedded) root.current?.focus();
  }, [embedded]);

  useEffect(() => {
    const el = caption.current;
    if (!el) return;
    if (!spokenChars) {
      el.dataset.karaoke = "off";
      return;
    }
    let frame = 0;
    const tick = () => {
      const n = spokenChars();
      el.dataset.karaoke = n === null ? "off" : "on";
      if (n !== null) {
        el.querySelectorAll<HTMLElement>(".word").forEach((w) => w.toggleAttribute("data-said", Number(w.dataset.start) < n));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [spokenChars, theirs]);

  async function lookUp(word: string) {
    if (!word) return;
    setHint(null);
    setGloss({ word, line: theirs, status: "loading" });
    try {
      const data = await post("/api/help", { kind: "word", word, sentence: theirs });
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

  async function help() {
    setGloss(null);
    setHint({ status: "loading" });
    try {
      const data = await post("/api/help", { kind: "hint", turns: turns.slice(-8) });
      setHint({ status: "ready", phrase: data.phrase, english: data.english });
    } catch {
      setHint({ status: "error" });
    }
  }

  return (
    <div
      ref={root}
      tabIndex={-1}
      role={embedded ? undefined : "dialog"}
      aria-modal={embedded ? undefined : true}
      aria-label={`Call with ${partner.name}`}
      className={`${embedded ? "absolute" : "fixed"} inset-0 z-20 flex flex-col bg-linear-to-b from-wall to-wall-deep px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-ink outline-none`}
    >
      <div className="mx-auto flex w-full max-w-md items-center justify-between text-sm font-semibold text-wall-ink">
        <span className="tabular-nums">{view === "ringing" ? "Ringing" : view === "ended" ? "Call ended" : clock}</span>
        <span>{partner.name} · {partner.city}</span>
      </div>
      {mission && (
        <p className="mx-auto mt-2 max-w-md text-center text-sm text-wall-ink">
          <span className="font-semibold text-ink">Today:</span> {mission.title}
        </p>
      )}
      {phrases.length > 0 && (
        <ul aria-label="Phrases to try" className="mx-auto mt-2 flex max-w-md flex-wrap justify-center gap-1.5">
          {phrases.map((p) => (
            <li
              key={p.text}
              data-said={p.said || undefined}
              className="flex max-w-full items-center gap-1 rounded-full bg-card/55 px-2.5 py-0.5 text-[0.95rem] transition-colors duration-300 data-said:bg-basil-soft data-said:text-basil-ink motion-reduce:transition-none"
            >
              {p.said && (
                <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" aria-hidden>
                  <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              <span lang={language.code} className="truncate font-voice">{p.text.split("/")[0].trim()}</span>
              {p.said && <span className="sr-only">, said</span>}
            </li>
          ))}
        </ul>
      )}

      {/* One scroll region. min-h-full plus justify-center centres short content without clipping tall content. */}
      <div className="-mx-5 min-h-0 flex-1 overflow-y-auto px-5">
        <div className="mx-auto flex min-h-full w-full max-w-md flex-col items-center justify-center gap-4 py-4">
          <ViewTransition name="partner" share="morph" default="none">
            <Avatar
              mode={FACE[view]}
              inputVolume={inputVolume}
              outputVolume={outputVolume}
              outputFrequencies={outputFrequencies}
              className={panelOpen ? "size-24 shrink-0" : "size-40 shrink-0 sm:size-52"}
            />
          </ViewTransition>

          <p aria-live="polite" className="mt-2 flex items-center gap-1 text-sm font-semibold text-wall-ink">
            {status(partner.name)[view]}
            {view === "thinking" && (
              <span className="dots tracking-widest" aria-hidden>
                <span>.</span><span>.</span><span>.</span>
              </span>
            )}
          </p>

          <div className="w-full text-center">
            {you && (
              <p className="text-[0.95rem] text-wall-ink">
                <span className="font-semibold">You:</span> {you}
              </p>
            )}
            {theirs && (
              <>
                <p ref={caption} lang={language.code} className="caption mt-2 font-voice text-[1.4rem] leading-snug text-balance">
                  {words(theirs).map((w, i) => (
                    <Fragment key={w.start}>
                      {i > 0 && " "}
                      <button
                        type="button"
                        data-start={w.start}
                        onClick={() => lookUp(w.bare)}
                        aria-pressed={shownGloss?.word === w.bare}
                        className="word -mx-0.5 rounded-md px-0.5 hover:bg-card/60 aria-pressed:bg-card"
                      >
                        {w.text}
                      </button>
                    </Fragment>
                  ))}
                </p>
                {!panelOpen && <p className="mt-2 text-xs text-wall-ink">Tap any word for English</p>}
              </>
            )}
          </div>

          {shownGloss && (
            <div className="rise w-full rounded-2xl bg-card/90 p-4 text-left" role="status">
              <div className="flex items-start justify-between gap-3">
                <p lang={language.code} className="font-voice text-xl">{shownGloss.word}</p>
                <Close onClick={() => setGloss(null)} label="Close translation" />
              </div>
              {shownGloss.status === "loading" && <div className="mt-2 h-5 w-44 animate-pulse rounded-md bg-line" aria-label="Translating" />}
              {shownGloss.status === "error" && <p className="mt-1 text-sm text-tomato-ink">That didn&rsquo;t work. Tap the word again.</p>}
              {shownGloss.status === "ready" && (
                <>
                  <p className="mt-1">{shownGloss.meaning}</p>
                  {shownGloss.note && <p className="mt-1 text-sm text-muted">{shownGloss.note}</p>}
                  <Button size="sm" onClick={save} disabled={shownGloss.saved} className="mt-3">
                    {shownGloss.saved ? "Saved for review" : "Save for review"}
                  </Button>
                </>
              )}
            </div>
          )}

          {hint && (
            <div className="rise w-full rounded-2xl bg-card/90 p-4 text-left" role="status">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Try saying</p>
                <Close onClick={() => setHint(null)} label="Close hint" />
              </div>
              {hint.status === "loading" && (
                <div className="mt-2 space-y-2" aria-label="Finding something to say">
                  <div className="h-6 w-4/5 animate-pulse rounded-md bg-line" />
                  <div className="h-4 w-1/2 animate-pulse rounded-md bg-line" />
                </div>
              )}
              {hint.status === "error" && <p className="mt-1 text-sm text-tomato-ink">No hint this time. Try again in a moment.</p>}
              {hint.status === "ready" && (
                <>
                  <p lang={language.code} className="mt-1 font-voice text-xl leading-snug">{hint.phrase}</p>
                  <p className="mt-1 text-muted">{hint.english}</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {view !== "ended" && (
        <div className="mx-auto mt-3 grid w-full max-w-md grid-cols-3 gap-2.5">
          <Button onClick={help} disabled={!live || hint?.status === "loading"}>
            Help
          </Button>
          <Button onClick={onMute} disabled={!live} aria-pressed={isMuted}>
            {isMuted ? "Unmute" : "Mute"}
          </Button>
          <Button variant="danger" onClick={onHangUp}>
            Hang up
          </Button>
        </div>
      )}
    </div>
  );
}

const DEMO_LINE = "Ieri sei andato al mare? Io sono rimasta a Roma, c'era un caldo terribile.";
const DEMO_TURNS: Turn[] = [
  { who: "you", text: "Ieri ho andato al mare con i miei amici." },
  { who: "partner", text: DEMO_LINE },
];
const DEMO_MISSION: Mission = { title: "Tell Giulia about your weekend", why: "Practises the passato prossimo." };
const DEMO_PHRASES: Phrase[] = [
  { text: "con i miei amici", said: true },
  { text: "sono andato al mare", said: false },
  { text: "faceva caldo", said: false },
];

let demoStart = 0;
const demoNow = () => {
  demoStart ||= performance.now();
  return performance.now() - demoStart;
};
const demoSpoken = () => Math.floor(demoNow() / 55) % (DEMO_LINE.length + 30);
const demoVoice = () => {
  const t = demoNow();
  return Math.max(0, 0.16 * Math.sin(t / 70) * Math.sin(t / 310) + 0.05);
};

/** The call screen with a fake voice and clock, so it can be designed without a live call. */
export function CallScreenDemo() {
  const [view, setView] = useState<CallView>("speaking");
  const [muted, setMuted] = useState(false);

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Call state">
        {(["ringing", "speaking", "listening", "thinking", "ended"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            aria-pressed={view === v}
            className="rounded-full border border-line px-3 py-1 text-sm font-semibold aria-pressed:bg-ink aria-pressed:text-card"
          >
            {v}
          </button>
        ))}
      </div>
      <div className="relative mt-4 h-[44rem] w-full overflow-hidden rounded-[2rem] border border-line sm:w-[24rem]">
        <CallScreen
          embedded
          view={muted && view === "listening" ? "muted" : view}
          clock="1:42"
          mission={DEMO_MISSION}
          phrases={DEMO_PHRASES}
          turns={DEMO_TURNS}
          spokenChars={view === "speaking" ? demoSpoken : undefined}
          isMuted={muted}
          onMute={() => setMuted((m) => !m)}
          onHangUp={() => setView("ended")}
          inputVolume={demoVoice}
          outputVolume={demoVoice}
        />
      </div>
    </div>
  );
}
