import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/** Stores the browser's push subscription. Keyed on endpoint, so re-subscribing is harmless. */
export async function POST(request: Request) {
  const subscription = await request.json();
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: "A push subscription is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({ endpoint: subscription.endpoint, subscription }, { onConflict: "endpoint" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
