import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { toDateString } from "@/lib/srs";

export const dynamic = "force-dynamic";

export default async function History() {
  const today = toDateString(new Date());

  const [{ data: sessions }, { data: items }] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, created_at, duration_secs, memory, report")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("items")
      .select("id, kind, item_key, correct_form, you_said, note, next_due, interval_days, recurrence_count")
      .order("next_due", { ascending: true }),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-20 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <header className="flex items-baseline justify-between border-b border-panel-line pb-3">
        <span className="engraved text-[0.65rem] text-brass">Storico</span>
        <Link href="/" className="engraved text-[0.65rem] text-sage transition-colors hover:text-plaster">
          Chiama
        </Link>
      </header>

      <section className="mt-10">
        <h2 className="engraved text-[0.62rem] text-sage">Chiamate</h2>
        {!sessions?.length ? (
          <p className="mt-3 text-sm text-sage">Ancora nessuna chiamata. Suona il citofono.</p>
        ) : (
          <ul className="mt-4 space-y-5">
            {sessions.map((s) => (
              <li key={s.id} className="border-t border-panel-line pt-4 first:border-0 first:pt-0">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-display text-lg">
                    {new Date(s.created_at).toLocaleDateString("it-IT", { day: "numeric", month: "long" })}
                  </span>
                  <span className="engraved text-[0.58rem] text-sage">
                    {s.duration_secs ? `${Math.round(s.duration_secs / 60)} min` : "—"}
                  </span>
                </div>
                {s.memory && <p className="mt-1.5 text-sm leading-relaxed text-plaster/80">{s.memory}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-14">
        <h2 className="engraved text-[0.62rem] text-sage">
          Da ripassare {items?.length ? <span className="text-brass">· {items.length}</span> : null}
        </h2>
        {!items?.length ? (
          <p className="mt-3 text-sm text-sage">Niente ancora. Le correzioni arrivano dopo la prima chiamata.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {items.map((i) => {
              const due = i.next_due <= today;
              return (
                <li key={i.id} className="border-t border-panel-line pt-4 first:border-0 first:pt-0">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-sm font-medium">{i.correct_form ?? i.item_key}</span>
                    <span className={`engraved shrink-0 text-[0.58rem] ${due ? "text-brass" : "text-sage"}`}>
                      {due ? "oggi" : `fra ${i.interval_days}g`}
                    </span>
                  </div>
                  {i.you_said && <p className="mt-1 text-sm text-sage line-through">{i.you_said}</p>}
                  {i.note && <p className="mt-1 text-[0.82rem] leading-relaxed text-plaster/70">{i.note}</p>}
                  {i.recurrence_count > 1 && (
                    <p className="engraved mt-1.5 text-[0.55rem] text-sienna">
                      sbagliato {i.recurrence_count} volte
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
