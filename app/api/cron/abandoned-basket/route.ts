import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { SITE_URL, sendMessage } from "@/lib/comms";
import { admin } from "@/lib/server";

const DAY = 86400000;
const REPEAT_AFTER_DAYS = 14;
const MAX_PER_RUN = 100;

function authorised(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return Boolean(secret) && given.length === expected.length && timingSafeEqual(given, expected);
}

// Sends one reminder for a basket left for a day. The send path decides who may
// receive it, so only subscribers who haven't opted out get an email.
export async function GET(request: Request) {
  if (!authorised(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const db = admin();
  if (!db) return NextResponse.json({ ok: false }, { status: 503 });

  const now = Date.now();
  const { data } = await db.from("cart_items")
    .select("customer_email,quantity,products(name,slug,status)")
    .eq("status", "In cart").neq("customer_email", "")
    .lt("created_at", new Date(now - DAY).toISOString()).gt("created_at", new Date(now - 7 * DAY).toISOString()).limit(2000);
  const rows = (data ?? []) as unknown as { customer_email: string; quantity: number; products: { name: string; slug: string; status: string } | null }[];

  const baskets = new Map<string, string[]>();
  for (const row of rows) {
    if (row.products?.status !== "active") continue;
    const email = row.customer_email.toLowerCase();
    baskets.set(email, [...(baskets.get(email) ?? []), `${row.quantity} x [${row.products.name.replace(/[[\]]/g, "")}](${SITE_URL}/products/${row.products.slug})`]);
  }

  const { data: recent } = await db.from("basket_reminders").select("email").gt("last_sent_at", new Date(now - REPEAT_AFTER_DAYS * DAY).toISOString()).in("email", [...baskets.keys()]);
  for (const r of recent ?? []) baskets.delete(r.email);

  let sent = 0;
  for (const [email, lines] of [...baskets].slice(0, MAX_PER_RUN)) {
    const { data: customer } = await db.from("customers").select("name").eq("email", email).maybeSingle();
    const first = String(customer?.name ?? "").split(" ")[0] || "there";
    const result = await sendMessage({ slug: "abandoned-basket", to: email, data: { first_name: first, basket_items: lines.join("\n") } });
    if (result.ok) {
      sent += 1;
      await db.from("basket_reminders").upsert({ email, last_sent_at: new Date().toISOString() });
    }
  }
  return NextResponse.json({ ok: true, sent });
}
