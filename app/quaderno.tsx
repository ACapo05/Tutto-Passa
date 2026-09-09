"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import type { Critique } from "@/lib/critique";
import type { Item, Past } from "./page";
import { Reminders } from "./reminders";
import { Section, Surface, Stat, Empty } from "@/components/ui";

type Phase = "idle" | "connecting" | "live" | "thinking" | "error";
type Stats = { streak: number; tracked: number; minutes: number };
type Props = { due: Item[]; later: Item[]; past: Past[]; memory: string | null; stats: Stats };

export function Quaderno(props: Props) {
  return (
    <ConversationProvider>
      <Page {...props} />
    </ConversationProvider>
  );
}

function Page({ due, later, past, memory, stats }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [problem, setProblem] = useState<string | null>(null);
  const [report, setReport] = useState<Critique | null>(null);
  const [seconds, setSeconds] = useState(0);
  const conversationId = useRef<string | null>(null);

  const conversation = useConversation({
    onConnect: () => {
      conversationId.current = getId();
      setSeconds(0);
    },
    onDisconnect: () => void finish(),
    onError: (message: string) => {
      setProblem(typeof message === "string" ? message : "The connection dropped.");
      setPhase("error");
    },
  });
  const { status, isSpeaking, startSession, endSession, getId } = conversation;

  // The connection is owned by the SDK, so read it rather than copying it into state.
  const live = status === "connected";
  const shown: Phase = live ? "live" : phase;

  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [live]);

  const finish = useCallback(async () => {
    const id = conversationId.current;
    conversationId.current = null;
    if (!id) { setPhase("idle"); return; }

    setPhase("thinking");
    try {
      const res = await fetch("/api/session/end", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId: id, language: "it" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The report could not be written.");
      setReport(data.report);
      setPhase("idle");
      router.refresh(); // the notebook below now has new corrections and new due dates
    } catch (err) {
      setProblem((err as Error).message);
      setPhase("error");
    }
  }, [router]);

  async function ring() {
    setProblem(null);
    setReport(null);
    setPhase("connecting");
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setProblem("Roma non ti sente. Allow microphone access in your browser, then buzz again.");
      setPhase("error");
      return;
    }
    try {
      const res = await fetch("/api/session/start?lang=it");
      if (!res.ok) throw new Error("Could not reach the door.");
      const { overrides } = await res.json();
      startSession({
        agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID!,
        connectionType: "webrtc",
        overrides,
      });
    } catch (err) {
      setProblem((err as Error).message);
      setPhase("error");
    }
  }

  const state =
    shown === "connecting" ? "sto chiamando" :
    live && isSpeaking ? "parla lei" :
    live ? "ti ascolta" :
    shown === "thinking" ? "sto scrivendo" :
    shown === "error" ? "linea caduta" :
    "libero";

  return (
    <>
      {/* The notebook. Dimmed while she is on the line so it does not compete with listening. */}
      <main
        className={`mx-auto w-full max-w-2xl px-5 pb-40 pt-[max(1.5rem,env(safe-area-inset-top))] transition-opacity duration-500 ${
          live ? "opacity-40" : "opacity-100"
        }`}
      >
        <header className="border-b border-panel-line pb-5">
          <div className="flex items-baseline justify-between">
            <span className="engraved text-[0.65rem] text-brass">Tutto Passa</span>
            <a
              href="/stile"
              className="engraved text-[0.55rem] text-sage transition-colors hover:text-plaster"
            >
              Stile
            </a>
          </div>
          <div className="mt-5 flex gap-8">
            <Stat value={stats.streak} label={stats.streak === 1 ? "giorno" : "giorni di fila"} accent={stats.streak > 0} />
            <Stat value={due.length} label="da ripassare" />
            <Stat value={stats.tracked} label="in totale" />
            <Stat value={stats.minutes} label="minuti" />
          </div>
        </header>

        {report && <ReportSlip report={report} />}

        {memory && !report && (
          <Section title="Giulia si ricorda">
            <p className="font-display text-xl leading-snug text-plaster">{memory}</p>
          </Section>
        )}

        <Section title="Oggi" count={due.length}>
          {due.length === 0 ? (
            <Empty>
              {past.length
                ? "Niente in scadenza. Chiama lo stesso — quello che viene fuori, viene fuori."
                : "Ancora niente. Suona il citofono e vediamo come te la cavi."}
            </Empty>
          ) : (
            <ul className="space-y-3">
              {due.map((i) => <Card key={i.id} item={i} />)}
            </ul>
          )}
        </Section>

        {later.length > 0 && (
          <Section title="Più avanti">
            <ul className="divide-y divide-panel-line">
              {later.map((i) => (
                <li key={i.id} className="flex items-baseline justify-between gap-4 py-2.5">
                  <span className="truncate text-sm text-plaster/80">{i.correct_form ?? i.item_key}</span>
                  <span className="engraved shrink-0 text-[0.55rem] text-sage">fra {i.interval_days}g</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {past.length > 0 && (
          <Section title="Più indietro">
            <ul className="space-y-4">
              {past.map((p) => (
                <li key={p.id} className="border-t border-panel-line pt-3 first:border-0 first:pt-0">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-sm text-plaster/90">
                      {new Date(p.created_at).toLocaleDateString("it-IT", { day: "numeric", month: "long" })}
                    </span>
                    <span className="engraved shrink-0 text-[0.55rem] text-sage">
                      {p.duration_secs ? `${Math.round(p.duration_secs / 60)} min` : "—"}
                    </span>
                  </div>
                  {p.memory && p.memory !== memory && (
                    <p className="mt-1 text-sm leading-relaxed text-sage">{p.memory}</p>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        <div className="mt-14">
          <Reminders />
        </div>
      </main>

      {/* The citofono, now a plate bolted to the bottom of the page. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {problem && (
          <p role="alert" className="pointer-events-auto mx-auto mb-3 max-w-md rounded-[2px] bg-persiana-dark/95 px-4 py-2 text-center text-sm text-sienna">
            {problem}
          </p>
        )}
        <div className="plate pointer-events-auto relative mx-auto flex max-w-md items-center gap-4 rounded-[3px] px-5 py-4">
          <Screw className="left-1.5 top-1.5" />
          <Screw className="right-1.5 top-1.5" />
          <Screw className="bottom-1.5 left-1.5" />
          <Screw className="bottom-1.5 right-1.5" />

          <button
            type="button"
            onClick={live || shown === "connecting" ? () => endSession() : ring}
            disabled={shown === "thinking"}
            data-pressed={live || shown === "connecting"}
            aria-label={live ? "Riattacca" : "Chiama Giulia"}
            className="buzzer grid size-12 shrink-0 place-items-center rounded-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className={`size-2.5 rounded-full ${live ? "is-live bg-sienna" : "bg-brass-bright"}`} aria-hidden />
          </button>

          <div className="min-w-0 flex-1">
            <p className="font-display text-xl leading-none text-engraved-deep">Giulia</p>
            <p className="engraved mt-1.5 text-[0.58rem] text-engraved" aria-live="polite">
              {state}{live && ` · ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function Screw({ className }: { className: string }) {
  return <span aria-hidden className={`screw absolute size-[6px] rounded-full ${className}`} />;
}

/** A due item, shown as the correction it came from rather than a bare label. */
function Card({ item }: { item: Item }) {
  return (
    <li>
      <Surface>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[0.95rem] font-medium text-plaster">{item.correct_form ?? item.item_key}</span>
        {item.recurrence_count > 1 && (
          <span className="engraved shrink-0 text-[0.55rem] text-sienna">×{item.recurrence_count}</span>
        )}
      </div>
      {item.you_said && <p className="mt-1 text-sm text-sage line-through">{item.you_said}</p>}
      {item.note && <p className="mt-1.5 text-[0.82rem] leading-relaxed text-plaster/60">{item.note}</p>}
      </Surface>
    </li>
  );
}

/** The fresh report: paper, at the top, above everything it just changed. */
function ReportSlip({ report }: { report: Critique }) {
  return (
    <article className="mt-8 rounded-[2px] bg-plaster px-5 py-6 text-ink shadow-slip">
      <h2 className="engraved text-[0.6rem] text-brass-dark">Dopo la chiamata</h2>
      <p className="mt-3 font-display text-lg leading-snug">{report.summary}</p>

      {report.corrections.length > 0 && (
        <ul className="mt-6 space-y-4">
          {report.corrections.map((c, i) => (
            <li key={`${c.item_key}-${i}`} className="border-t border-paper-line pt-3 first:border-0 first:pt-0">
              <p className="text-sm line-through decoration-sienna/50">{c.you_said}</p>
              <p className="mt-1 text-sm font-medium">{c.correct_form}</p>
              <p className="mt-1.5 text-[0.82rem] leading-relaxed text-ink-soft">{c.explanation}</p>
            </li>
          ))}
        </ul>
      )}

      {report.new_vocab.length > 0 && (
        <section className="mt-6 border-t border-paper-line pt-4">
          <h3 className="engraved text-[0.58rem] text-brass-dark">Parole nuove</h3>
          <dl className="mt-2.5 space-y-1.5">
            {report.new_vocab.map((v) => (
              <div key={v.item_key} className="flex gap-3 text-sm">
                <dt className="font-medium">{v.word}</dt>
                <dd className="text-ink-soft">{v.meaning}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {report.focus_next.length > 0 && (
        <section className="mt-6 border-t border-paper-line pt-4">
          <h3 className="engraved text-[0.58rem] text-brass-dark">La prossima volta</h3>
          <ul className="mt-2.5 space-y-1.5">
            {report.focus_next.map((f) => <li key={f} className="text-sm leading-relaxed">{f}</li>)}
          </ul>
        </section>
      )}
    </article>
  );
}
