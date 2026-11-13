import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { SITE_URL, sendMessage } from "@/lib/comms";
import { reviewToken } from "@/lib/reviews";
import { admin } from "@/lib/server";

const DAY = 86400000;
const AFTER_DAYS = 5; // after the last parcel is delivered
const FALLBACK_DAYS = 14; // after the last item was shipped, for parcels without delivery scans
const MAX_PER_RUN = 100;

function authorised(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return Boolean(secret) && given.length === expected.length && timingSafeEqual(given, expected);
}

// Sends one review request per order, about five days after everything has arrived.
export async function GET(request: Request) {
  if (!authorised(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const db = admin();
  if (!db) return NextResponse.json({ ok: false }, { status: 503 });
  const now = Date.now();

  const { data: orders } = await db.from("orders")
    .select("id,status,shipping_name,customer_email,paid_at,order_items(shipping_status,shipped_on),parcels(status,delivered_at)")
    .not("paid_at", "is", null).gt("paid_at", new Date(now - 60 * DAY).toISOString()).limit(1000);
  const { data: sent } = await db.from("review_requests").select("order_id");
  const done = new Set((sent ?? []).map((r) => r.order_id));

  type Row = { id: string; status: string; shipping_name: string | null; customer_email: string | null; order_items: { shipping_status: string | null; shipped_on: string | null }[]; parcels: { status: string | null; delivered_at: string | null }[] };
  const due = ((orders ?? []) as unknown as Row[]).filter((o) => {
    if (done.has(o.id) || !o.customer_email || /cancel|refund/i.test(o.status ?? "")) return false;
    const items = o.order_items.filter((i) => !/cancel|refund/i.test(i.shipping_status ?? ""));
    if (!items.length) return false;
    if (o.parcels.length) {
      if (o.parcels.some((p) => !p.delivered_at)) return false;
      const last = Math.max(...o.parcels.map((p) => new Date(p.delivered_at!).getTime()));
      return now - last >= AFTER_DAYS * DAY;
    }
    if (items.some((i) => !i.shipped_on)) return false;
    const last = Math.max(...items.map((i) => new Date(i.shipped_on!).getTime()));
    return now - last >= FALLBACK_DAYS * DAY;
  });

  let count = 0;
  for (const o of due.slice(0, MAX_PER_RUN)) {
    const first = String(o.shipping_name ?? "").trim().split(/\s+/)[0] || "there";
    const review_url = `${SITE_URL}/review?o=${o.id}&t=${reviewToken(o.id)}`;
    const result = await sendMessage({ slug: "review-request", orderId: o.id, data: { first_name: first, review_url } });
    if (result.ok) { count += 1; await db.from("review_requests").insert({ order_id: o.id }); }
  }
  return NextResponse.json({ ok: true, sent: count });
}
