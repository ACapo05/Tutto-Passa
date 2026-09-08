import { NextResponse } from "next/server";
import webpush from "web-push";
import { supabase } from "@/lib/supabase";
import { toDateString } from "@/lib/srs";

/**
 * Daily reminder. Vercel calls this on the schedule in vercel.json.
 * On the Hobby plan a cron fires once a day with up to 59 minutes of drift, so an 08:00
 * schedule can arrive at 08:59. That is expected, not a fault.
 */
export async function GET(request: Request) {
  // Vercel sends this header when CRON_SECRET is set. Without the check the endpoint is
  // public and anyone could spam the notification.
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  webpush.setVapidDetails(
    "mailto:acapolongo05@gmail.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const today = toDateString(new Date());

  // Already practised today: say nothing. A reminder for something you have done is noise.
  const { count: todaysSessions } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .gte("created_at", `${today}T00:00:00`);
  if (todaysSessions) return NextResponse.json({ skipped: "already practised today" });

  const { count: dueCount } = await supabase
    .from("items")
    .select("id", { count: "exact", head: true })
    .lte("next_due", today);

  const { data: subs } = await supabase.from("push_subscriptions").select("endpoint, subscription");
  if (!subs?.length) return NextResponse.json({ sent: 0, note: "no subscriptions stored" });

  const payload = JSON.stringify({
    title: "Dieci minuti?",
    body: dueCount ? `Giulia ti aspetta. ${dueCount} cose da ripassare.` : "Giulia ti aspetta.",
    url: "/",
  });

  let sent = 0;
  for (const row of subs) {
    try {
      await webpush.sendNotification(row.subscription as webpush.PushSubscription, payload);
      sent++;
    } catch (err) {
      // 404 or 410 means the subscription is dead: the browser was reinstalled or reset.
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", row.endpoint);
      }
    }
  }

  return NextResponse.json({ sent, dueCount });
}
