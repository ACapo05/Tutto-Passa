/**
 * The optional password on a deployed copy. With APP_PASSWORD set, proxy.ts turns away anyone
 * without this cookie, so a stranger with your address cannot use your accounts or write into
 * your database. Web Crypto only, so the proxy and the login action share it.
 */
export const AUTH_COOKIE = "tp_auth";

/* ponytail: the cookie holds a hash of the password, so changing APP_PASSWORD signs everyone out. Sign a session id instead if you ever need per-device sign-out. */
export async function passwordToken(password: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`tutto-passa:${password}`));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Compares in constant time, so response timing does not give the token away. */
export function sameToken(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
