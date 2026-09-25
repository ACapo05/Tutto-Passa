"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, passwordToken, sameToken } from "@/lib/password";
import { LANGUAGES } from "@/lib/languages";
import { LANGUAGE_COOKIE } from "@/lib/current-language";

/** The language picker. Setting the cookie re-renders the page in the new language. */
export async function chooseLanguage(form: FormData) {
  const code = String(form.get("lang"));
  if (!LANGUAGES[code]) return;
  (await cookies()).set(LANGUAGE_COOKIE, code, { maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}

/** The login form. Only a path on this site is accepted as `next`, so the form cannot send anyone elsewhere. */
export async function logIn(form: FormData) {
  const password = process.env.APP_PASSWORD;
  const next = String(form.get("next") ?? "/");
  const safeNext = /^\/(?![/\\])/.test(next) ? next : "/";
  if (!password) redirect(safeNext);

  const token = await passwordToken(password);
  if (!sameToken(await passwordToken(String(form.get("password") ?? "")), token)) {
    redirect(`/login?wrong=1&next=${encodeURIComponent(safeNext)}`);
  }
  (await cookies()).set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect(safeNext);
}
