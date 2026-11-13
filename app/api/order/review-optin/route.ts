import { NextResponse } from "next/server";
import { getPreorderSettings } from "@/lib/catalogue";
import { afterCutoff } from "@/lib/preorder";
import { admin, stripe } from "@/lib/server";

// Details for the Google Customer Reviews opt-in on the order thanks page.
// Google emails the survey after the estimated delivery date, so it must not be too early.
const TRANSIT_BUSINESS_DAYS = 8; // longest courier leg (matches the shipping details in lib/seo.ts)

function addBusinessDays(from: Date, days: number) {
  const d = new Date(from);
  let left = days;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) left--;
  }
  return d;
}

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id") ?? "";
  const client = stripe();
  const db = admin();
  if (!sessionId.startsWith("cs_") || !client || !db) return NextResponse.json({ ok: false });
  try {
    const session = await client.checkout.sessions.retrieve(sessionId);
    const email = session.customer_details?.email ?? session.customer_email ?? "";
    if (session.payment_status !== "paid" || !email) return NextResponse.json({ ok: false });

    const { data: items } = await client.checkout.sessions.listLineItems(sessionId, { limit: 100, expand: ["data.price.product"] });
    const ids = items.map((i) => (i.price?.product as { metadata?: Record<string, string> } | undefined)?.metadata?.product_id).filter(Boolean) as string[];
    const { data: products } = ids.length ? await db.from("products").select("id,dispatch_days,availability").in("id", ids) : { data: [] };

    const hasPreorder = (products ?? []).some((p) => p.availability === "Pre-order");
    let handling = Math.max(3, ...(products ?? []).map((p) => Number(p.dispatch_days) || 0));
    let start = new Date();
    if (hasPreorder) {
      const pre = await getPreorderSettings();
      if (afterCutoff(pre)) start = new Date(`${new Date().getUTCFullYear() + 1}-01-15T00:00:00Z`);
      else handling = Math.max(handling, pre.max);
    }
    const eta = addBusinessDays(start, handling + TRANSIT_BUSINESS_DAYS);

    const { data: order } = await db.from("orders").select("order_number").eq("stripe_session_id", sessionId).maybeSingle();
    return NextResponse.json({
      ok: true,
      order_id: order?.order_number ?? sessionId,
      email,
      delivery_country: "AU",
      estimated_delivery_date: eta.toISOString().slice(0, 10),
    });
  } catch (e) {
    console.warn("Review opt-in unavailable", e);
    return NextResponse.json({ ok: false });
  }
}
