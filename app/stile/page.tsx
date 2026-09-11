import Link from "next/link";
import { Eyebrow, Section, Surface, Button, Empty, Skeleton } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { CallScreenDemo } from "@/components/call-screen";

export const metadata = { title: "Style · Tutto Passa" };

/**
 * A living style guide: it renders the same components every screen uses, so it cannot drift
 * from the product. Swatches use literal class names so Tailwind always emits them.
 */

const COLORS = [
  { swatch: "bg-ground", token: "ground", use: "Home. Limewash in lamplight" },
  { swatch: "bg-card", token: "card", use: "The one raised sheet on a screen, and text on basil or tomato" },
  { swatch: "bg-line", token: "line", use: "Hairlines and button edges" },
  { swatch: "bg-ink", token: "ink", use: "Text. Leans brown, never black" },
  { swatch: "bg-muted", token: "muted", use: "Secondary text, 5:1 on ground" },
  { swatch: "bg-basil", token: "basil", use: "The thing to press. One per screen" },
  { swatch: "bg-basil-ink", token: "basil-ink", use: "The right form in a correction, and the wordmark" },
  { swatch: "bg-tomato", token: "tomato", use: "Hang up, repeat counts, errors" },
  { swatch: "bg-wall", token: "wall", use: "The call: a sunlit wall in Trastevere" },
  { swatch: "bg-wall-ink", token: "wall-ink", use: "Secondary text on the wall, and words she has not said yet" },
  { swatch: "bg-sky", token: "sky", use: "Focus ring" },
];

const FACES = ["idle", "listening", "thinking", "speaking"] as const;

export default function Stile() {
  return (
    <main className="mx-auto w-full max-w-lg px-5 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="flex items-baseline justify-between">
        <span className="text-lg font-extrabold tracking-tight text-basil-ink">style</span>
        <Link href="/" className="text-sm font-semibold text-muted hover:text-ink">Home</Link>
      </header>
      <p className="mt-4 leading-relaxed text-muted">
        Warm, grown-up, quietly Roman. Home is calm so Giulia can carry the warmth, and the call
        gets the most craft because the call is the product.
      </p>

      <Section title="Colour">
        <ul className="space-y-2.5">
          {COLORS.map((c) => (
            <li key={c.token} className="flex items-center gap-4">
              <span className={`size-10 shrink-0 rounded-xl border border-line ${c.swatch}`} aria-hidden />
              <div className="min-w-0">
                <p className="font-semibold">{c.token}</p>
                <p className="text-sm text-muted">{c.use}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Two voices">
        <p lang="it" className="font-voice text-2xl leading-snug">Ieri sei andato al mare?</p>
        <p className="mt-1 text-sm text-muted">Newsreader, for the Italian Giulia says: subtitles, corrections, words.</p>
        <p className="mt-5 text-lg font-semibold">Did you go to the sea yesterday?</p>
        <p className="mt-1 text-sm text-muted">Figtree, for everything that helps you.</p>
      </Section>

      <Section title="Giulia">
        <div className="grid grid-cols-4 gap-4">
          {FACES.map((mode) => (
            <div key={mode} className="text-center">
              <Avatar mode={mode} className="w-full" />
              <p className="mt-3 text-sm text-muted">{mode}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          In a call her mouth is shaped by the spectrum of her voice, she nods while you speak,
          glances away while she thinks, and blinks at uneven intervals. The green ring follows
          your microphone: if it moves but your words never appear, the mic works and
          recognition does not.
        </p>
      </Section>

      <Section title="The call">
        <CallScreenDemo />
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Subtitles, never chat bubbles. Her words light up as she says them and every word can be
          tapped for English. Help is text only. Opening a call morphs her portrait from Home while
          the wall opens around her.
        </p>
      </Section>

      <Section title="Actions">
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Call Giulia</Button>
          <Button>Mute</Button>
          <Button variant="danger">Hang up</Button>
          <Button disabled>Help</Button>
        </div>
      </Section>

      <Section title="States">
        <div className="space-y-6">
          <Surface>
            <Eyebrow>Today</Eyebrow>
            <p className="mt-2 text-xl font-bold leading-snug">Tell Giulia about your weekend</p>
            <p className="mt-1 text-muted">Practises the passato prossimo with essere.</p>
          </Surface>
          <div>
            <Eyebrow>Empty</Eyebrow>
            <div className="mt-2">
              <Empty>Nothing yet. Anything you get wrong in a call shows up here, and Giulia works it into the next one.</Empty>
            </div>
          </div>
          <div>
            <Eyebrow>Loading</Eyebrow>
            <div className="mt-2 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
          <div>
            <Eyebrow>Error</Eyebrow>
            <p className="mt-2 rounded-2xl border border-tomato bg-tomato-soft px-4 py-3 font-semibold text-tomato-ink">
              Giulia can&rsquo;t hear you. Allow microphone access in your browser, then call again.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Rules">
        <ul className="list-disc space-y-2 pl-5 leading-relaxed text-muted">
          <li><span className="text-ink">English helps, Italian stays.</span> Anything you hear is Italian; any help is English text.</li>
          <li><span className="text-ink">One raised sheet per screen,</span> where the next action lives. Lists sit on the ground with hairlines.</li>
          <li><span className="text-ink">Honest numbers.</span> Every figure comes from real speech. No points, no badges.</li>
          <li><span className="text-ink">Motion conveys state:</span> the call opening, her face, a panel arriving. All of it calms down under reduced motion.</li>
          <li><span className="text-ink">Never &ldquo;AI&rdquo;, never &ldquo;assistant&rdquo;.</span> She is a person and you are calling her.</li>
        </ul>
      </Section>
    </main>
  );
}
