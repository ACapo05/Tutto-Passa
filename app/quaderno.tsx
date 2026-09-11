"use client";

import { startTransition, useCallback, useEffect, useRef, useState, ViewTransition } from "react";
import { useRouter } from "next/navigation";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import type { Critique } from "@/lib/critique";
import type { Mission } from "@/lib/languages";
import type { Item, Past } from "./page";
import { Reminders } from "./reminders";
import { DailyThree, PlanLine, type PlanView, type TodayView } from "./today";
import { Avatar } from "@/components/avatar";
import { CallScreen, type CallView, type Turn } from "@/components/call-screen";
import { Button, Empty, Eyebrow, Section, Surface } from "@/components/ui";

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

/* The expressive voice model writes stage directions like [warmly] into its text. They are not spoken. */
const spoken = (text: string) => text.replace(/\[[^\]]*\]\s*/g, "").trim();

/** Where she probably is right now, by the clock in Rome. */
function whereIsGiulia() {
  const time = new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" });
  const hour = Number(time.slice(0, 2));
  const place =
    hour < 7 ? "asleep, probably" :
    hour < 10 ? "having a cornetto before work" :
    hour < 13 ? "at the bookshop" :
    hour < 16 ? "on a long lunch" :
    hour < 20 ? "back at the bookshop" :
    "home with Nerone";
  return `${time} in Rome, ${place}`;
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
  const [phase, setPhase] = useState<Phase>("idle");
  const [problem, setProblem] = useState<string | null>(null);
  const [report, setReport] = useState<Critique | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [where] = useState(whereIsGiulia);
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
      if (text) setTurns((t) => [...t.slice(-11), { who: role === "user" ? "you" : "giulia", text }]);
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
        body: JSON.stringify({ conversationId: id, language: "it" }),
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
      setPhase("connecting");
    });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // This only asks for permission. Release the mic so the call's own capture is the only one open.
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setProblem("Giulia can't hear you. Allow microphone access in your browser, then call again.");
      go("error");
      return;
    }
    try {
      const res = await fetch("/api/session/start?lang=it");
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
      <main className="mx-auto w-full max-w-lg px-5 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <header className="flex items-baseline justify-between">
          <span className="text-lg font-extrabold tracking-tight text-basil-ink">tutto passa</span>
          <span className="text-sm font-semibold tabular-nums text-muted">
            {stats.streak > 0 ? `${stats.streak}-day streak` : "No streak yet"}
          </span>
        </header>

        <section className="mt-8 flex items-center gap-5">
          {inCall ? (
            <div className="size-24 shrink-0 sm:size-28" aria-hidden />
          ) : (
            <ViewTransition name="giulia" share="morph" default="none">
              <Avatar className="size-24 shrink-0 sm:size-28" />
            </ViewTransition>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold leading-tight">Giulia</h1>
            <p className="mt-0.5 text-muted">Bookseller in Trastevere</p>
            <p className="mt-0.5 text-sm text-muted" suppressHydrationWarning>{where}</p>
          </div>
        </section>

        <PlanLine plan={plan} />

        {report ? (
          <ReportView report={report} next={report.next_mission ?? mission} onCall={ring} busy={inCall} />
        ) : (
          <Surface className="mt-7">
            <Eyebrow>Today</Eyebrow>
            <p className="mt-2 text-xl font-bold leading-snug">{mission.title}</p>
            <p className="mt-1 text-muted">{mission.why}</p>
            <Button variant="primary" onClick={ring} disabled={inCall} className="mt-5 w-full">
              Call Giulia
            </Button>
            {memory && (
              <p className="mt-4 border-t border-line pt-4 text-[0.95rem] text-muted">
                <span className="font-semibold text-ink">She remembers:</span> {memory}
              </p>
            )}
          </Surface>
        )}

        <DailyThree today={today} />

        <Section title="Coming up in today's call" count={due.length}>
          {due.length === 0 ? (
            <Empty>
              {past.length
                ? "Nothing due. Whatever you get wrong today shows up here tomorrow."
                : "Nothing yet. Anything you get wrong in a call shows up here, and Giulia works it into the next one."}
            </Empty>
          ) : (
            <>
              <p className="text-sm text-muted">She steers toward the ones you miss most. She never quizzes you.</p>
              <ul className="mt-1 divide-y divide-line">
                {due.map((i) => <Due key={i.id} item={i} />)}
              </ul>
            </>
          )}
        </Section>

        {later.length > 0 && (
          <Section title="Later">
            <ul className="divide-y divide-line">
              {later.map((i) => (
                <li key={i.id} className="flex items-baseline justify-between gap-4 py-2.5">
                  <span lang="it" className="truncate font-voice text-lg">{i.correct_form ?? i.item_key}</span>
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
            <p className="text-sm text-muted">
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

      {inCall && (
        <ViewTransition enter="call-in" exit="call-out" default="none">
          <CallScreen
            view={view}
            clock={clock}
            mission={mission}
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
          className="rise fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 mx-auto max-w-md rounded-2xl border border-tomato bg-tomato-soft px-4 py-3 text-center font-semibold text-tomato-ink"
        >
          {problem}
        </p>
      )}
    </>
  );
}

/** A due item, shown as the right form first and the slip beneath it. */
function Due({ item }: { item: Item }) {
  return (
    <li className="py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <p lang="it" className="font-voice text-xl leading-snug">{item.correct_form ?? item.item_key}</p>
        {item.recurrence_count > 1 && (
          <span className="shrink-0 text-sm font-semibold tabular-nums text-tomato-ink">{item.recurrence_count} times</span>
        )}
      </div>
      {item.you_said && <p lang="it" className="text-sm text-muted line-through">{item.you_said}</p>}
      {item.note && <p className="mt-1 text-[0.95rem] leading-relaxed">{item.note}</p>}
    </li>
  );
}

/** The fresh report, in place of today's mission, above everything it just changed. */
function ReportView({ report, next, onCall, busy }: { report: Critique; next: Mission; onCall: () => void; busy: boolean }) {
  return (
    <Surface className="mt-7">
      <Eyebrow>After the call</Eyebrow>
      <p className="mt-2 text-lg leading-snug">{report.summary}</p>

      {report.corrections.length > 0 && (
        <ul className="mt-4 divide-y divide-line">
          {report.corrections.map((c, i) => (
            <li key={`${c.item_key}-${i}`} className="py-3">
              <p lang="it" className="font-voice text-xl leading-snug text-basil-ink">{c.correct_form}</p>
              <p lang="it" className="text-sm text-muted line-through decoration-tomato">{c.you_said}</p>
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
                <dt lang="it" className="font-voice text-lg">{v.word}</dt>
                <dd className="text-muted">{v.meaning}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="mt-5 border-t border-line pt-4">
        <Eyebrow>Next time</Eyebrow>
        <p className="mt-1 font-semibold">{next.title}</p>
        <Button variant="primary" onClick={onCall} disabled={busy} className="mt-4 w-full">
          Call Giulia again
        </Button>
      </div>
    </Surface>
  );
}
