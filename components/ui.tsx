/**
 * The interface vocabulary. Every screen is built from these, and /stile renders this same
 * file, so the style guide cannot drift from the product.
 *
 * Server-safe: no hooks, no "use client". Client screens import them freely.
 */
import type { ReactNode } from "react";

/* Small uppercase label above a block. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">{children}</p>;
}

/* Sections are separated by space and a heading, not boxes. */
export function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="flex items-baseline gap-2 text-lg font-bold">
        {title}
        {count !== undefined && count > 0 && <span className="text-sm font-semibold tabular-nums text-muted">{count}</span>}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/* The one raised sheet on a screen: where the next action lives. Never nested. */
export function Surface({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-line bg-card p-5 ${className}`}>{children}</div>;
}

const BUTTON = {
  primary: "bg-basil text-card [--edge:var(--color-basil-edge)]",
  secondary: "border border-line bg-card text-ink [--edge:var(--color-line)]",
  danger: "bg-tomato text-card [--edge:var(--color-tomato-edge)]",
};

/* Size lives here, not in className: two padding utilities on one element fight over which wins. */
const SIZE = {
  md: "px-4 py-3 text-base",
  sm: "px-3 py-1.5 text-sm",
  /* Narrow columns, e.g. four rating buttons side by side. */
  tight: "px-1 py-2.5 text-base",
};

/** The button look, for links that should look like buttons. */
export function buttonClass(variant: keyof typeof BUTTON = "secondary", size: keyof typeof SIZE = "md") {
  return `chunky inline-flex items-center justify-center whitespace-nowrap rounded-2xl font-bold disabled:cursor-not-allowed disabled:opacity-50 ${SIZE[size]} ${BUTTON[variant]}`;
}

export function Button({
  children,
  variant = "secondary",
  size = "md",
  className = "",
  ...rest
}: {
  children: ReactNode;
  variant?: keyof typeof BUTTON;
  size?: keyof typeof SIZE;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={`${buttonClass(variant, size)} ${className}`}
    >
      {children}
    </button>
  );
}

/* Says what happens next, never just that a list is empty. */
export function Empty({ children }: { children: ReactNode }) {
  return <p className="max-w-md leading-relaxed text-muted">{children}</p>;
}

/* Holds the layout still while the page loads. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-line ${className}`} aria-hidden />;
}
