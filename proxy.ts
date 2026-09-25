import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, passwordToken, sameToken } from "@/lib/password";

/**
 * Locks a deployed copy behind APP_PASSWORD. Unset, it does nothing, so local development and
 * copies that are kept private work as before. The cron route has its own secret and the files
 * the Home Screen app needs before signing in are public (see the matcher).
 */
export async function proxy(request: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();

  const cookie = request.cookies.get(AUTH_COOKIE)?.value ?? "";
  if (sameToken(cookie, await passwordToken(password))) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!login|api/cron/|_next/|manifest.json|sw.js|favicon.ico|icon|apple-touch-icon).*)"],
};
