"use client";

import { createContext, use } from "react";
import type { LanguageView } from "@/lib/languages";
import { chooseLanguage } from "@/app/actions";

type Value = { language: LanguageView; choices: { code: string; nativeName: string }[] };

const Language = createContext<Value | null>(null);

/** Set once in the root layout from the cookie, so any client component can name the partner or the language. */
export function LanguageProvider({ value, children }: { value: Value; children: React.ReactNode }) {
  return <Language value={value}>{children}</Language>;
}

export function useLanguage(): LanguageView {
  const value = use(Language);
  if (!value) throw new Error("useLanguage needs the LanguageProvider from app/layout.tsx.");
  return value.language;
}

/** A plain select that saves on change. Hidden when only one language is set up. */
export function LanguagePicker({ className = "" }: { className?: string }) {
  const value = use(Language);
  if (!value || value.choices.length < 2) return null;
  return (
    <form action={chooseLanguage} className={className}>
      <label>
        <span className="sr-only">Language</span>
        <select
          name="lang"
          defaultValue={value.language.code}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="rounded-full border border-line bg-card px-3 py-1 text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-basil"
        >
          {value.choices.map((c) => (
            <option key={c.code} value={c.code} lang={c.code}>
              {c.nativeName}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
