"use client";

import { startTransition, useCallback, useEffect, useRef, useState, ViewTransition } from "react";
import { useRouter } from "next/navigation";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import type { Critique } from "@/lib/critique";
import type { Mission } from "@/lib/languages";
import { saidPhrase } from "@/lib/phrases";
import type { Item, Past } from "./page";
import { Reminders } from "./reminders";
import { Ticket } from "./ticket";
import { DailyThree, PlanLine, type PlanView, type TodayView } from "./today";
import { Avatar } from "@/components/avatar";
import { CallScreen, type CallView, type Turn } from "@/components/call-screen";
import { Button, Eyebrow, Section, Surface } from "@/components/ui";
import { LanguagePicker, useLanguage } from "@/components/language";
import type { LanguageView } from "@/lib/languages";

type Phase = "idle" | "connecting" | "live" | "thinking" | "error";
type Stats = { streak: number; tracked: number; minutes: number };
type Props = {
  due: Item[];
  later: Item[];
  past: Past[];
  memory: string | null;
  mission: Mission;
  stats: Stats;
  plan: PlanView;
  today: TodayView;
};

/* LiveKit plays her audio a little after its timing data arrives. Raise if subtitles run ahead of her voice. */
const PLAYBACK_DELAY_MS = 120;

/* The ticket shows the due items she steers toward first. The list is already sorted that way. */
const PHRASES_ON_TICKET = 3;

/* The expressive voice model writes stage directions like [warmly] into its text. They are not spoken. */
const spoken = (text: string) => text.replace(/\[[^\]]*\]\s*/g, "").trim();

/** What time it is where the partner lives, and what they are probably doing. */
function whereAreThey({ timeZone, routine }: LanguageView["partner"]) {
  const time = new Date().toLocaleTimeString("en-GB", { timeZone, hour: "2-digit", minute: "2-digit" });
  const hour = Number(time.slice(0, 2));
  const place = (routine.find(([until]) => hour < until) ?? routine.at(-1)!)[1];
  return { time, place };
}

export function Quaderno(props: Props) {
  return (
    <ConversationProvider>
      <Page {...props} />
    </ConversationProvider>
  );
}

function Page({ due, later, past, memory, mission, stats, plan, today }: Props) {
  const router = useRouter();
  const language = useLanguage();
  const { partner } = language;
  const [phase, setPhase] = useState<Phase>("idle");
  const [problem, setProblem] = useState<string | null>(null);
  const [report, setReport] = useState<Critique | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [turns, setTurns] = useState<Turn[]>([]);
  // Everything you said this call. Turns keep only the latest few; the phrase checks need all of it.
  const [heard, setHeard] = useState("");
  const [where] = useState(() => whereAreThey(partner));
  const conversationId = useRef<string | null>(null);
  // The persona, when the agent refuses it as an override. Sent once the call is connected.
  const context = useRef<string | null>(null);
  // When each character of her current line starts playing, for the karaoke subtitles.
  const align = useRef({ starts: [] as number[], said: 0, cursor: 0, reset: true });
  const speaking = useRef(false);

  // Only transitions animate a <ViewTransition>, so every change that opens or closes the call goes through one.
  const go = useCallback((next: Phase) => startTransition(() => setPhase(next)), []);

  const conversation = useConversation({
    onConnect: () => {
      conversationId.current = getId();
      setSeconds(0);
    },
    onDisconnect: (details) => {
      // A refused session (e.g. an override the agent does not allow) closes at once with the
      // reason attached. Show it: asking for a report on a call that never happened hides it.
      if (details.reason === "error") {
        conversationId.current = null;
        setProblem(details.closeReason || details.message);
        go("error");
        return;
      }
      void finish();
    },
    onError: (message: string) => {
      setProblem(typeof message === "string" ? message : "The connection dropped.");
      go("error");
    },
    onMessage: ({ role, message }) => {
      const text = role === "user" ? message.trim() : spoken(message);
      if (!text) return;
      if (role === "user") setHeard((h) => `${h} ${text}`);
      setTurns((t) => [...t.slice(-11), { who: role === "user" ? "you" : "partner", text }]);
    },
    onAudioAlignment: ({ chars, char_start_times_ms, char_durations_ms }) => {
      const s = align.current;
      const now = performance.now() + PLAYBACK_DELAY_MS;
      if (s.reset) {
        s.starts = [];
        s.said = 0;
        s.cursor = now;
        s.reset = false;
      }
      // Chunks arrive faster than they play, so each one starts where the previous one ends.
      const base = Math.max(s.cursor, now);
      for (let i = 0; i < chars.length; i++) s.starts.push(base + char_start_times_ms[i]);
      const last = chars.length - 1;
      if (last >= 0) s.cursor = base + char_start_times_ms[last] + char_durations_ms[last];
    },
  });
  const {
    status, isSpeaking, isMuted, setMuted, startSession, endSession, sendContextualUpdate, getId,
    getInputVolume, getOutputByteFrequencyData,
  } = conversation;

  // The connection is owned by the SDK, so read it rather than copying it into state.
  const live = status === "connected";
  const shown: Phase = live ? "live" : phase;
  const inCall = shown === "connecting" || shown === "live" || shown === "thinking";
  const lastTurn = turns[turns.length - 1];
  const view: CallView =
    shown === "connecting" ? "ringing" :
    shown === "thinking" ? "ended" :
    isSpeaking ? "speaking" :
    isMuted ? "muted" :
    lastTurn?.who === "you" ? "thinking" :
    "listening";
  const phrases = due.slice(0, PHRASES_ON_TICKET).map((i) => i.correct_form ?? i.item_key);

  useEffect(() => {
    if (!live || !context.current) return;
    sendContextualUpdate(context.current);
    context.current = null;
  }, [live, sendContextualUpdate]);

  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [live]);

  // Her next line starts a fresh timeline once she stops talking.
  useEffect(() => {
    speaking.current = isSpeaking;
    if (!isSpeaking) align.current.reset = true;
  }, [isSpeaking]);

  const spokenChars = useCallback(() => {
    const s = align.current;
    if (!speaking.current || !s.starts.length) return null;
    const now = performance.now();
    while (s.said < s.starts.length && s.starts[s.said] <= now) s.said++;
    return s.said;
  }, []);

  const finish = useCallback(async () => {
    const id = conversationId.current;
    conversationId.current = null;
    if (!id) { go("idle"); return; }

    setPhase("thinking");
    try {
      const res = await fetch("/api/session/end", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `The report could not be written (${res.status}).`);
      startTransition(() => {
        setReport(data.report);
        setPhase("idle");
      });
      router.refresh(); // the lists below now have new corrections, due dates and a new mission
    } catch (err) {
      setProblem((err as Error).message);
      go("error");
    }
  }, [router, go]);

  async function ring() {
    setProblem(null);
    startTransition(() => {
      setReport(null);
      setTurns([]);
      setHeard("");
      setPhase("connecting");
    });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // This only asks for permission. Release the mic so the call's own capture is the only one open.
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setProblem(`${partner.name} can't hear you. Allow microphone access in your browser, then call again.`);
      go("error");
      return;
    }
    try {
      const res = await fetch("/api/session/start");
      if (!res.ok) throw new Error("Could not start the call.");
      const { overrides, context: persona } = await res.json();
      context.current = persona ?? null;
      startSession({
        agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID!,
        connectionType: "webrtc",
        overrides,
      });
    } catch (err) {
      setProblem((err as Error).message);
      go("error");
    }
  }

  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <>
      <main className="mx-auto w-full max-w-lg px-5 pb-32 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <header className="flex items-baseline justify-between">
          <span className="text-lg font-extrabold tracking-tight text-basil-ink">tutto passa</span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tabular-nums text-muted">
              {stats.streak > 0 ? `${stats.streak}-day streak` : "No streak yet"}
            </span>
            <LanguagePicker />
          </div>
        </header>

        <section className="mt-8 flex items-center gap-5">
          {inCall ? (
            <div className="size-24 shrink-0 sm:size-28" aria-hidden />
          ) : (
            <ViewTransition name="partner" share="morph" default="none">
              <Avatar className="size-24 shrink-0 sm:size-28" />
            </ViewTransition>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold leading-tight">{partner.name}</h1>
            <p className="mt-0.5 text-muted">{partner.role}</p>
            <p className="mt-0.5 text-sm text-muted" suppressHydrationWarning>Right now: {where.place}</p>
          </div>
        </section>

        <PlanLine plan={plan} />

        {report ? (
          <ReportView report={report} next={report.next_mission ?? mission} />
        ) : (
          <Ticket
            className="mt-7"
            lang={language.code}
            mission={mission}
            phrases={phrases}
            time={where.time}
            empty={
              past.length
                ? "Nothing due. Talk about anything; whatever you get wrong shows up here tomorrow."
                : `Nothing yet. Anything you get wrong in a call shows up here, and ${partner.name} works it into the next one.`
            }
          />
        )}

        <DailyThree today={today} />

        {due.length > 0 && (
          <details className="group mt-12">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
              <h2 className="flex items-baseline gap-2 text-lg font-bold">
                Her notes for today
                <span className="text-sm font-semibold tabular-nums text-muted">{due.length}</span>
              </h2>
              <svg
                viewBox="0 0 16 16"
                aria-hidden
                className="size-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-90 motion-reduce:transition-none"
              >
                <path d="M6 3.5L10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <p className="mt-3 text-sm text-muted">She steers toward the ones you miss most. She never quizzes you.</p>
            <ul className="mt-1 divide-y divide-line">
              {due.map((i) => <Due key={i.id} item={i} />)}
            </ul>
          </details>
        )}

        {later.length > 0 && (
          <Section title="Later">
            <ul className="divide-y divide-line">
              {later.map((i) => (
                <li key={i.id} className="flex items-baseline justify-between gap-4 py-2.5">
                  <span lang={language.code} className="truncate font-voice text-lg">{i.correct_form ?? i.item_key}</span>
                  <span className="shrink-0 text-sm tabular-nums text-muted">
                    {i.days === 1 ? "tomorrow" : `in ${i.days} days`}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {past.length > 0 && (
          <Section title="Past calls">
            {memory && (
              <p className="leading-relaxed">
                <span className="font-semibold">She remembers:</span> <span className="text-muted">{memory}</span>
              </p>
            )}
            <p className={`text-sm text-muted ${memory ? "mt-3" : ""}`}>
              {stats.minutes === 0 ? "Under a minute" : `${stats.minutes} ${stats.minutes === 1 ? "minute" : "minutes"}`} spoken,{" "}
              {stats.tracked} {stats.tracked === 1 ? "thing" : "things"} tracked.
            </p>
            <ul className="mt-1 divide-y divide-line">
              {past.map((p) => (
                <li key={p.id} className="py-3">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-semibold" suppressHydrationWarning>
                      {new Date(p.created_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long" })}
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-muted">
                      {p.duration_secs ? `${Math.max(1, Math.round(p.duration_secs / 60))} min` : ""}
                    </span>
                  </div>
                  {p.memory && p.memory !== memory && <p className="mt-1 text-[0.95rem] text-muted">{p.memory}</p>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        <div className="mt-12">
          <Reminders />
        </div>

        <a href="/stile" className="mt-10 inline-block text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
          Design system
        </a>
      </main>

      {/* The call is always one tap away, however far down the notebook you are. */}
      {!inCall && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-ground px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <div className="mx-auto max-w-lg">
            <Button variant="primary" onClick={ring} className="w-full">
              {report ? `Call ${partner.name} again` : `Call ${partner.name}`}
            </Button>
          </div>
        </div>
      )}

      {inCall && (
        <ViewTransition enter="call-in" exit="call-out" default="none">
          <CallScreen
            view={view}
            clock={clock}
            mission={mission}
            phrases={phrases.map((text) => ({ text, said: saidPhrase(heard, text) }))}
            turns={turns}
            spokenChars={spokenChars}
            isMuted={isMuted}
            onMute={() => setMuted(!isMuted)}
            onHangUp={() => endSession()}
            inputVolume={getInputVolume}
            outputFrequencies={getOutputByteFrequencyData}
          />
        </ViewTransition>
      )}

      {problem && !inCall && (
        <p
          role="alert"
          className="rise fixed inset-x-4 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+4.75rem)] z-30 mx-auto max-w-md rounded-2xl border border-tomato bg-tomato-soft px-4 py-3 text-center font-semibold text-tomato-ink"
        >
          {problem}
        </p>
      )}
    </>
  );
}

/** A due item, shown as the right form first and the slip beneath it. */
function Due({ item }: { item: Item }) {
  const language = useLanguage();
  return (
    <li className="py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <p lang={language.code} className="font-voice text-xl leading-snug">{item.correct_form ?? item.item_key}</p>
        {item.recurrence_count > 1 && (
          <span className="shrink-0 text-sm font-semibold tabular-nums text-tomato-ink">{item.recurrence_count} times</span>
        )}
      </div>
      {item.you_said && <p lang={language.code} className="text-sm text-muted line-through">{item.you_said}</p>}
      {item.note && <p className="mt-1 text-[0.95rem] leading-relaxed">{item.note}</p>}
    </li>
  );
}

/** The fresh report, in place of today's ticket, above everything it just changed. */
function ReportView({ report, next }: { report: Critique; next: Mission }) {
  const language = useLanguage();
  return (
    <Surface className="mt-7">
      <Eyebrow>After the call</Eyebrow>
      <p className="mt-2 text-lg leading-snug">{report.summary}</p>

      {report.corrections.length > 0 && (
        <ul className="mt-4 divide-y divide-line">
          {report.corrections.map((c, i) => (
            <li key={`${c.item_key}-${i}`} className="py-3">
              <p lang={language.code} className="font-voice text-xl leading-snug text-basil-ink">{c.correct_form}</p>
              <p lang={language.code} className="text-sm text-muted line-through decoration-tomato">{c.you_said}</p>
              <p className="mt-1 text-[0.95rem] leading-relaxed">{c.explanation}</p>
            </li>
          ))}
        </ul>
      )}

      {report.new_vocab.length > 0 && (
        <div className="mt-4 border-t border-line pt-4">
          <Eyebrow>New words</Eyebrow>
          <dl className="mt-2 space-y-1">
            {report.new_vocab.map((v) => (
              <div key={v.item_key} className="flex items-baseline gap-3">
                <dt lang={language.code} className="font-voice text-lg">{v.word}</dt>
                <dd className="text-muted">{v.meaning}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="mt-5 border-t border-line pt-4">
        <Eyebrow>Next time</Eyebrow>
        <p className="mt-1 font-semibold">{next.title}</p>
      </div>
    </Surface>
  );
}
