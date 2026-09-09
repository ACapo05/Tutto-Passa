import Link from "next/link";
import { Eyebrow, Section, Surface, Stat, Button, Empty, Skeleton } from "@/components/ui";

export const metadata = { title: "Stile · Tutto Passa" };

/**
 * A living style guide: it imports components/ui.tsx, the same module every screen uses,
 * so it cannot drift from the product. Colours are read from the CSS variables at render
 * time for the same reason.
 */

const COLORS = [
  { token: "persiana-dark", use: "Page ground, behind everything" },
  { token: "persiana", use: "The green the page fades to" },
  { token: "panel", use: "Raised surfaces" },
  { token: "panel-line", use: "Hairlines and dividers" },
  { token: "brass", use: "The metal. Labels and rules" },
  { token: "brass-bright", use: "Lit brass. Focus rings, secondary actions" },
  { token: "plaster", use: "Body text, and the paper of the report" },
  { token: "sage", use: "Secondary text. Never below 14px on panel" },
  { token: "sienna", use: "Live call, repeat count, failure. Used sparingly" },
];

/* The report slip is the one light surface, so it has its own ink. */
const PAPER = [
  { token: "ink", use: "Text on the report slip" },
  { token: "ink-soft", use: "Explanations under a correction" },
  { token: "paper-line", use: "Dividers on paper" },
  { token: "engraved", use: "Labels cut into the brass plate" },
  { token: "engraved-deep", use: "Her name on the plate" },
  { token: "brass-dark", use: "Labels on paper, and the hairline on the plate" },
];

export default function Stile() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-24 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <header className="border-b border-panel-line pb-5">
        <div className="flex items-baseline justify-between">
          <span className="engraved text-[0.65rem] text-brass">Stile</span>
          <Link href="/" className="engraved text-[0.55rem] text-sage transition-colors hover:text-plaster">
            Quaderno
          </Link>
        </div>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-sage">
          The interface is a brass citofono on a Roman shutter. Metal and plaster are the only
          two materials; everything else is the green behind them.
        </p>
      </header>

      <Section title="Colore">
        <ul className="space-y-2">
          {COLORS.map((c) => (
            <li key={c.token} className="flex items-center gap-4">
              <span
                className="size-9 shrink-0 rounded-[2px] border border-panel-line"
                style={{ background: `var(--color-${c.token})` }}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="engraved text-[0.58rem] text-plaster">{c.token}</p>
                <p className="mt-0.5 truncate text-[0.8rem] text-sage">{c.use}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Ottone e carta">
        <ul className="space-y-2">
          {PAPER.map((c) => (
            <li key={c.token} className="flex items-center gap-4">
              <span
                className="size-9 shrink-0 rounded-[2px] border border-panel-line"
                style={{ background: `var(--color-${c.token})` }}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="engraved text-[0.58rem] text-plaster">{c.token}</p>
                <p className="mt-0.5 truncate text-[0.8rem] text-sage">{c.use}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Carattere">
        <div className="space-y-6">
          <div>
            <p className="font-display text-3xl leading-none text-plaster">Giulia</p>
            <p className="mt-2 text-[0.8rem] text-sage">
              Bodoni Moda — an Italian face for an Italian tool. Names, numbers, and the one
              line she remembers about you. Never for body copy.
            </p>
          </div>
          <div>
            <p className="text-base text-plaster">Andare takes essere, not avere.</p>
            <p className="mt-2 text-[0.8rem] text-sage">Archivo — everything you actually read.</p>
          </div>
          <div>
            <p className="engraved text-[0.62rem] text-brass">Da ripassare</p>
            <p className="mt-2 text-[0.8rem] text-sage">
              Archivo Narrow, uppercase, letterspaced, with a hairline highlight under the
              stroke. This is engraving on metal, so it is only ever a label — never a sentence.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Numeri">
        <div className="flex gap-8">
          <Stat value={7} label="giorni di fila" accent />
          <Stat value={3} label="da ripassare" />
          <Stat value={41} label="in totale" />
        </div>
        <p className="mt-4 text-[0.8rem] text-sage">
          Brass marks a live streak. A stat is never decoration: each one comes from the
          database, and a zero is shown honestly rather than hidden.
        </p>
      </Section>

      <Section title="Superfici">
        <Surface>
          <p className="text-[0.95rem] font-medium text-plaster">sono andato a Napoli</p>
          <p className="mt-1 text-sm text-sage line-through">io ho andato a Napoli</p>
          <p className="mt-1.5 text-[0.82rem] leading-relaxed text-plaster/60">
            Andare takes essere, not avere.
          </p>
        </Surface>
        <p className="mt-4 text-[0.8rem] text-sage">
          One container, 2px radius, hairline border. A correction always shows the right form
          first and the wrong one struck through beneath it — never the mistake alone.
        </p>
      </Section>

      <Section title="Azioni">
        <div className="flex flex-wrap items-center gap-4">
          <div className="plate relative flex items-center gap-3 rounded-[3px] px-4 py-3">
            <span className="buzzer grid size-12 place-items-center rounded-full">
              <span className="size-2.5 rounded-full bg-brass-bright" aria-hidden />
            </span>
            <span className="engraved text-[0.58rem] text-engraved">libero</span>
          </div>
          <Button>Riprova</Button>
        </div>
        <p className="mt-4 text-[0.8rem] text-sage">
          The buzzer is the only primary action in the application. Everything else is an
          outlined brass button. Its state is always written next to it in words — libero, sto
          chiamando, ti ascolta, parla lei, sto scrivendo, linea caduta.
        </p>
      </Section>

      <Section title="Stati">
        <div className="space-y-5">
          <div>
            <Eyebrow>Vuoto</Eyebrow>
            <div className="mt-2">
              <Empty>Ancora niente. Suona il citofono e vediamo come te la cavi.</Empty>
            </div>
          </div>
          <div>
            <Eyebrow>In caricamento</Eyebrow>
            <div className="mt-2 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
          <div>
            <Eyebrow>Errore</Eyebrow>
            <p className="mt-2 text-sm text-sienna">Roma non ti sente.</p>
          </div>
        </div>
        <p className="mt-4 text-[0.8rem] text-sage">
          An empty screen says what to do next, never that a list is empty. Errors say what
          broke and how to fix it, and they do not apologise.
        </p>
      </Section>

      <Section title="Lingua">
        <ul className="space-y-2 text-[0.85rem] leading-relaxed text-sage">
          <li>
            <span className="text-plaster">Italian for the interface</span> — you are in her
            world before the call starts. Short, spoken, lowercase where she would say it.
          </li>
          <li>
            <span className="text-plaster">English for the teaching</span> — the report exists
            to be understood, so it never shows off.
          </li>
          <li>
            <span className="text-plaster">Never the word &ldquo;AI&rdquo;</span>, never
            &ldquo;assistant&rdquo;, never &ldquo;practice session&rdquo;. She is a person and
            you are calling her.
          </li>
        </ul>
      </Section>

      <Section title="Regole">
        <ul className="space-y-2 text-[0.85rem] leading-relaxed text-sage">
          <li>Text on brass uses the engraved tokens. Anything lighter fails contrast on the plate.</li>
          <li>Radius is 2px, and 3px on the plate. Nothing else is rounded except the buzzer.</li>
          <li>Motion is a slow filament glow and the press of the buzzer. Nothing else moves,
            and both stop under prefers-reduced-motion.</li>
          <li>Sections are separated by space, not by boxes. Only a correction gets a surface.</li>
        </ul>
      </Section>
    </main>
  );
}
