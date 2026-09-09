"use client";

import { useEffect, useState } from "react";

type State = "unsupported" | "needs-home-screen" | "off" | "on" | "blocked" | "working";

/** base64url VAPID key -> Uint8Array, the format PushManager.subscribe expects. */
function toKey(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const view = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return view;
}

/**
 * On iOS, push works only in a Home Screen web app on iOS 16.4+, and only when the request
 * comes from a real tap. Both conditions are handled here: the button is the tap, and an
 * iOS browser tab is told what to do instead of failing silently.
 */
async function detect(): Promise<State> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    // Safari on iOS only exposes PushManager once the app runs from the Home Screen.
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ? "needs-home-screen" : "unsupported";
  }
  if (Notification.permission === "denied") return "blocked";
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ? "on" : "off";
}

export function Reminders() {
  const [state, setState] = useState<State>("off");

  useEffect(() => {
    let cancelled = false;
    detect().then((s) => { if (!cancelled) setState(s); });
    return () => { cancelled = true; };
  }, []);

  async function enable() {
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setState("blocked"); return; }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toKey(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(subscription),
      });
      setState(res.ok ? "on" : "off");
    } catch {
      setState("off");
    }
  }

  const line = {
    on: "Ti scrivo ogni mattina.",
    off: null,
    working: "Un attimo…",
    blocked: "Notifications are blocked. Turn them back on for this app in your browser settings.",
    unsupported: "This browser cannot send reminders.",
    "needs-home-screen": "Add this to your Home Screen first, then open it from the icon to turn on reminders.",
  }[state];

  return (
    <div className="border-t border-panel-line pt-5">
      <h2 className="engraved text-[0.62rem] text-sage">Promemoria</h2>
      {state === "off" || state === "working" ? (
        <button
          type="button"
          onClick={enable}
          disabled={state === "working"}
          className="mt-3 rounded-[2px] border border-brass/50 px-4 py-2 text-sm text-brass-bright transition-colors hover:bg-brass/10 disabled:opacity-50"
        >
          {state === "working" ? "Un attimo…" : "Ricordamelo ogni giorno"}
        </button>
      ) : null}
      {line && <p className="mt-3 max-w-sm text-sm text-sage">{line}</p>}
    </div>
  );
}
