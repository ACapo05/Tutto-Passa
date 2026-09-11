"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button, Eyebrow, Surface, buttonClass } from "@/components/ui";
import { previewIntervals, Rating, SAME_SESSION_MS, schedule, type Grade } from "@/lib/srs";
import type { ReviewCard } from "./cards";

const GRADES: { grade: Grade; name: string; key: string }[] = [
  { grade: Rating.Again, name: "Again", key: "1" },
  { grade: Rating.Hard, name: "Hard", key: "2" },
  { grade: Rating.Good, name: "Good", key: "3" },
  { grade: Rating.Easy, name: "Easy", key: "4" },
];

/* The browser's own Italian voice. Free and offline; quality depends on the device. */
function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "it-IT";
  const voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith("it"));
  if (voice) utterance.voice = voice;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Italian text with the card's word underlined, so you can see which word is the new one. */
function Italian({ text, word, className }: { text: string; word: string | null; className: string }) {
  if (!word) return <p lang="it" className={className}>{text}</p>;
  // Letter-aware boundaries: \b does not understand accented letters. An elided form like l' has no end boundary.
  const end = word.endsWith("'") ? "" : "(?!\\p{L})";
  const parts = text.split(new RegExp(`((?<!\\p{L})${escapeRegExp(word)}${end})`, "iu"));
  return (
    <p lang="it" className={className}>
      {parts.map((part, i) =>
        i % 2 ? (
          <span key={i} className="underline decoration-basil decoration-2 underline-offset-[6px]">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </p>
  );
}

function Side({ italian, text, word, muted, large }: { italian: boolean; text: string; word: string | null; muted?: boolean; large?: boolean }) {
  if (!italian) return <p className={`leading-snug ${large ? "text-2xl font-bold" : "text-xl"}`}>{text}</p>;
  return (
    <div>
      <Italian
        text={text}
        word={word}
        className={`font-voice leading-snug ${large ? "text-3xl" : "text-2xl"} ${muted ? "text-muted" : large ? "text-basil-ink" : ""}`}
      />
      {!muted && (
        <Button size="sm" onClick={() => speak(text)} className="mt-3">
          Hear it
        </Button>
      )}
    </div>
  );
}

/**
 * An Anki-style session: say it, show it, rate it. A card you are about to forget again comes
 * back before the session ends, like Anki's learning steps. Ratings save in order behind the
 * scenes, so the next card appears at once.
 */
export function ReviewSession({ cards, newWordsLeft }: { cards: ReviewCard[]; newWordsLeft: number }) {
  const [queue, setQueue] = useState(cards);
  const [intervals, setIntervals] = useState<Record<Grade, string> | null>(null);
  const [reviewed, setReviewed] = useState(0);
  const [failed, setFailed] = useState(false);
  const [writing, setWriting] = useState<"writing" | "done" | "failed">(newWordsLeft > 0 ? "writing" : "done");
  const saving = useRef(Promise.resolve());
  const asked = useRef(false);
  const card = queue[0];

  // Today's new words are written on the first visit of the day, then join the end of the queue.
  useEffect(() => {
    if (newWordsLeft <= 0 || asked.current) return;
    asked.current = true;
    fetch("/api/deck/new", { method: "POST" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error);
        setQueue((q) => [...q, ...(data.cards as ReviewCard[])]);
        setWriting("done");
      })
      .catch(() => setWriting("failed"));
  }, [newWordsLeft]);

  function reveal() {
    if (!card || intervals) return;
    setIntervals(previewIntervals(card.fsrs, new Date()));
  }

  function rate(grade: Grade) {
    if (!card || !intervals) return;
    const now = new Date();
    const next = schedule(card.fsrs, grade, now);
    const soon = new Date(next.fsrs.due).getTime() - now.getTime() < SAME_SESSION_MS;
    setQueue((q) => (soon ? [...q.slice(1), { ...card, fsrs: next.fsrs, isNew: false }] : q.slice(1)));
    setIntervals(null);
    setReviewed((n) => n + 1);
    saving.current = saving.current.then(async () => {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: card.id, rating: grade }),
      }).catch(() => null);
      if (!res?.ok) setFailed(true);
    });
  }

  // Anki's keys: space or enter shows the answer, 1 to 4 rate it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.key === " " || e.key === "Enter") && !intervals) {
        e.preventDefault();
        reveal();
        return;
      }
      const match = GRADES.find((g) => g.key === e.key);
      if (match && intervals) rate(match.grade);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <>
      <header className="flex items-baseline justify-between">
        <Link href="/" className="text-sm font-semibold text-muted hover:text-ink">
          Home
        </Link>
        <span className="text-sm tabular-nums text-muted" aria-live="polite">
          {queue.length > 0 && `${queue.length} left`}
          {writing === "writing" && `${queue.length > 0 ? " · " : ""}writing new words`}
        </span>
      </header>

      {!card ? (
        writing === "writing" ? (
          <div className="flex flex-1 flex-col justify-center" aria-label="Writing today's new words">
            <div className="animate-pulse rounded-3xl border border-line bg-card px-6 py-10">
              <div className="mx-auto h-3 w-28 rounded bg-line" />
              <div className="mx-auto mt-5 h-7 w-4/5 rounded bg-line" />
              <div className="mx-auto mt-3 h-7 w-3/5 rounded bg-line" />
            </div>
            <p className="mt-4 text-center text-sm text-muted">Writing today&rsquo;s {newWordsLeft} new words at your level…</p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col justify-center">
            <p className="text-2xl font-extrabold">{reviewed ? "All caught up." : "Nothing due."}</p>
            <p className="mt-2 max-w-sm leading-relaxed text-muted">
              {reviewed ? `${reviewed} ${reviewed === 1 ? "review" : "reviews"} done. ` : ""}
              Cards come back here just before you would forget them.
            </p>
            {writing === "failed" && (
              <p role="alert" className="mt-3 text-sm font-semibold text-tomato-ink">
                Today&rsquo;s new words could not be written. Open this page again to retry.
              </p>
            )}
            <Link href="/" className={`${buttonClass("primary")} mt-6 self-start`}>
              Back home
            </Link>
          </div>
        )
      ) : (
        <div className="flex flex-1 flex-col justify-center py-8">
          <Surface className="px-6 py-8 text-center">
            <Eyebrow>
              {card.isNew && <span className="text-basil-ink">New · </span>}
              {card.label}
            </Eyebrow>
            <div className="mt-3">
              <Side italian={card.promptIsItalian} text={card.prompt} word={card.word} muted={card.promptIsWrong} large={!card.promptIsItalian} />
            </div>
            {intervals ? (
              <div className="rise mt-6 border-t border-line pt-6">
                <Side italian={card.answerIsItalian} text={card.answer} word={card.word} large />
                {card.note && <p className="mx-auto mt-3 max-w-sm leading-relaxed text-muted">{card.note}</p>}
              </div>
            ) : (
              <p className="mt-6 text-sm text-muted">Say it out loud first, then check.</p>
            )}
          </Surface>

          {intervals ? (
            <div className="mt-5 grid grid-cols-4 gap-2" role="group" aria-label="How well did you remember it?">
              {GRADES.map(({ grade, name, key }) => (
                <Button
                  key={grade}
                  size="tight"
                  variant={grade === Rating.Good ? "primary" : "secondary"}
                  onClick={() => rate(grade)}
                  aria-keyshortcuts={key}
                  aria-label={`${name}, back in ${intervals[grade]}`}
                  className="flex-col gap-0.5"
                >
                  <span>{name}</span>
                  <span className="text-xs font-medium tabular-nums">{intervals[grade]}</span>
                </Button>
              ))}
            </div>
          ) : (
            <Button variant="primary" onClick={reveal} aria-keyshortcuts="Space" className="mt-5 w-full">
              Show answer
            </Button>
          )}

          {failed && (
            <p role="alert" className="mt-4 text-center text-sm font-semibold text-tomato-ink">
              A rating didn&rsquo;t save. Reload to see where you really are.
            </p>
          )}
        </div>
      )}

      <p className="mt-6 text-center text-xs leading-relaxed text-muted">
        New words follow how often they are used in Italian film and TV subtitles, from{" "}
        <a href="https://github.com/hermitdave/FrequencyWords" className="underline underline-offset-2 hover:text-ink">
          FrequencyWords
        </a>{" "}
        (CC BY-SA 4.0).
      </p>
    </>
  );
}
