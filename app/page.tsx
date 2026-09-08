"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import type { Critique } from "@/lib/critique";
import { Reminders } from "./reminders";

type Phase = "idle" | "connecting" | "live" | "thinking" | "done" | "error";

export default function Page() {
  return (
    <ConversationProvider>
      <Citofono />
    </ConversationProvider>
  );
}

function Citofono() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [problem, setProblem] = useState<string | null>(null);
  const [due, setDue] = useState<string[]>([]);
  const [report, setReport] = useState<Critique | null>(null);
  const conversationId = useRef<string | null>(null);

  const conversation = useConversation({
    onDisconnect: () => finish(),
    onError: (message: string) => {
      setProblem(typeof message === "string" ? message : "The connection dropped.");
      setPhase("error");
    },
  });
  const { status, isSpeaking, startSession, endSession, getId } = conversation;

  // Today's due items, shown before the call and refreshed after it.
  const loadDue = useCallback(async () => {
    try {
      const res = await fetch("/api/session/start?lang=it");
      if (res.ok) setDue((await res.json()).due ?? []);
    } catch {
      /* the list is context, not the point of the screen */
    }
  }, []);
  useEffect(() => { void loadDue(); }, [loadDue]);

  // Capture the id while connected: it is gone once the session tears down.
  useEffect(() => {
    if (status === "connected") {
      conversationId.current = getId();
      setPhase("live");
    }
  }, [status, getId]);

  async function finish() {
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
      setPhase("done");
      void loadDue();
    } catch (err) {
      setProblem((err as Error).message);
      setPhase("error");
    }
  }

  async function ring() {
    setProblem(null);
    setReport(null);
    setPhase("connecting");
    try {
      // Ask for the microphone here so a refusal is reported plainly rather than as a
      // connection failure.
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

  const live = phase === "live";
  const stateLabel =
    phase === "connecting" ? "sto chiamando" :
    live && isSpeaking ? "parla lei" :
    live ? "ti ascolta" :
    phase === "thinking" ? "sto scrivendo" :
    phase === "error" ? "linea caduta" :
    "libero";

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <header className="flex items-baseline justify-between border-b border-panel-line pb-3">
        <span className="engraved text-[0.65rem] text-brass">Tutto Passa</span>
        <Link href="/history" className="engraved text-[0.65rem] text-sage transition-colors hover:text-plaster">
          Storico
        </Link>
      </header>

      {/* The citofono: the street-door plate you press to call up. */}
      <section className="mt-10 sm:mt-14">
        <div className="plate relative mx-auto w-full max-w-sm rounded-[3px] px-6 py-7">
          <Screw className="left-2.5 top-2.5" />
          <Screw className="right-2.5 top-2.5" />
          <Screw className="bottom-2.5 left-2.5" />
          <Screw className="bottom-2.5 right-2.5" />
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-display text-[2.6rem] leading-none tracking-tight text-[#241c0c]">Giulia</p>
              <p className="engraved mt-2 text-[0.6rem] text-[#2b2109]">Testaccio · Roma</p>
            </div>
            <span
              className={`mt-2 size-2.5 shrink-0 rounded-full ${live ? "is-live bg-sienna" : "bg-[#7a5f28]"}`}
              aria-hidden
            />
          </div>

          <div className="my-6 h-px bg-[#8a6c31]" />

          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={live || phase === "connecting" ? () => endSession() : ring}
              disabled={phase === "thinking"}
              data-pressed={live || phase === "connecting"}
              aria-label={live ? "End the call with Giulia" : "Call Giulia"}
              className="buzzer grid size-[72px] shrink-0 place-items-center rounded-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className={`size-3.5 rounded-full ${live ? "bg-sienna" : "bg-brass-bright"}`} aria-hidden />
            </button>

            <div className="min-w-0">
              <p className="engraved text-[0.62rem] text-[#2b2109]" aria-live="polite">{stateLabel}</p>
              <p className="mt-1 text-sm text-[#241c0c]">
                {live ? "Premi per riattaccare" : phase === "thinking" ? "Un attimo" : "Premi per suonare"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {problem && (
        <p role="alert" className="mx-auto mt-6 max-w-sm text-center text-sm text-sienna">{problem}</p>
      )}

      {report ? <Report report={report} /> : <DueList items={due} />}

      <div className="mt-14">
        <Reminders />
      </div>
    </main>
  );
}

function Screw({ className }: { className: string }) {
  return <span aria-hidden className={`screw absolute size-[7px] rounded-full ${className}`} />;
}

function DueList({ items }: { items: string[] }) {
  return (
    <section className="mt-12">
      <h2 className="engraved text-[0.62rem] text-sage">
        Da ripassare {items.length > 0 && <span className="text-brass">· {items.length}</span>}
      </h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-sage">
          Niente in scadenza. Suona e vediamo cosa viene fuori.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item} className="flex gap-3 text-sm text-plaster/90">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-brass" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* The aftermath is paper: a slip from the Testaccio market, not another dark panel. */
export function Report({ report }: { report: Critique }) {
  return (
    <article className="mt-12 rounded-[2px] bg-plaster px-6 py-7 text-[#2b2118] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)]">
      <h2 className="engraved text-[0.6rem] text-[#8a6c31]">Dopo la chiamata</h2>
      <p className="mt-3 font-display text-lg leading-snug">{report.summary}</p>

      {report.corrections.length > 0 && (
        <section className="mt-7">
          <h3 className="engraved text-[0.6rem] text-[#8a6c31]">Correzioni</h3>
          <ul className="mt-3 space-y-4">
            {report.corrections.map((c, i) => (
              <li key={`${c.item_key}-${i}`} className="border-t border-[#d3c4aa] pt-3 first:border-0 first:pt-0">
                <p className="text-sm line-through decoration-[#b4552f]/50">{c.you_said}</p>
                <p className="mt-1 text-sm font-medium">{c.correct_form}</p>
                <p className="mt-1.5 text-[0.82rem] leading-relaxed text-[#5c5044]">{c.explanation}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {report.new_vocab.length > 0 && (
        <section className="mt-7">
          <h3 className="engraved text-[0.6rem] text-[#8a6c31]">Parole nuove</h3>
          <dl className="mt-3 space-y-1.5">
            {report.new_vocab.map((v) => (
              <div key={v.item_key} className="flex gap-3 text-sm">
                <dt className="font-medium">{v.word}</dt>
                <dd className="text-[#5c5044]">{v.meaning}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {report.focus_next.length > 0 && (
        <section className="mt-7 border-t border-[#d3c4aa] pt-5">
          <h3 className="engraved text-[0.6rem] text-[#8a6c31]">La prossima volta</h3>
          <ul className="mt-3 space-y-1.5">
            {report.focus_next.map((f) => (
              <li key={f} className="text-sm leading-relaxed">{f}</li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
