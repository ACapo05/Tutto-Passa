/**
 * The interface vocabulary. Every screen is built from these, and /stile renders this same
 * file — so the style guide cannot drift from the product.
 *
 * Server-safe: no hooks, no "use client". Client screens import them freely.
 */
import type { ReactNode } from "react";

/* Small engraved label above a block. Uppercase and letterspaced, like a brass nameplate. */
export function Eyebrow({ children, count }: { children: ReactNode; count?: number }) {
  return (
    <h2 className="engraved text-[0.62rem] text-sage">
      {children}
      {count !== undefined && count > 0 && <span className="text-brass"> · {count}</span>}
    </h2>
  );
}

export function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="mt-12">
      <Eyebrow count={count}>{title}</Eyebrow>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/* A raised block on the dark ground. The only container in the system. */
export function Surface({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[2px] border border-panel-line bg-panel/60 px-4 py-3 ${className}`}>
      {children}
    </div>
  );
}

/* One number and its label. Used in the strip under the header. */
export function Stat({ value, label, accent = false }: { value: string | number; label: string; accent?: boolean }) {
  return (
    <div className="min-w-0">
      <p className={`font-display text-2xl leading-none ${accent ? "text-brass-bright" : "text-plaster"}`}>
        {value}
      </p>
      <p className="engraved mt-1.5 truncate text-[0.52rem] text-sage">{label}</p>
    </div>
  );
}

/* Secondary action. The buzzer on the call bar is the only primary action in the app. */
export function Button({
  children,
  ...rest
}: { children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className="rounded-[2px] border border-brass/50 px-4 py-2 text-sm text-brass-bright transition-colors hover:bg-brass/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

/* Says what to do next, never just that a list is empty. */
export function Empty({ children }: { children: ReactNode }) {
  return <p className="max-w-md text-sm leading-relaxed text-sage">{children}</p>;
}

/* Grey blocks that hold the layout still while the notebook loads. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[2px] bg-panel ${className}`} aria-hidden />;
}
