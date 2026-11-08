import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { SITE_URL, sendMessage } from "@/lib/comms";
import { admin } from "@/lib/server";

export const maxDuration = 60;

function authorised(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return Boolean(secret) && given.length === expected.length && timingSafeEqual(given, expected);
}

type Row = { id: string; email: string; products: { name: string; slug: string; status: string; availability: string } | null };

// Emails everyone waiting on a product once it can be bought, once only.
export async function GET(request: Request) {
  if (!authorised(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const db = admin();
  if (!db) return NextResponse.json({ ok: false }, { status: 503 });
  const { data } = await db.from("product_interest").select("id,email,products(name,slug,status,availability)").is("notified_at", null).limit(200);
  const ready = ((data ?? []) as unknown as Row[]).filter((r) => r.products?.status === "active" && !["Coming soon", "Sold out"].includes(r.products.availability));
  let sent = 0;
  for (const r of ready) {
    const ok = await sendMessage({ slug: "product-available", to: r.email, data: { first_name: "there", product_name: r.products!.name, product_url: `${SITE_URL}/products/${r.products!.slug}` } }).then((res) => res.ok).catch(() => false);
    if (ok) { await db.from("product_interest").update({ notified_at: new Date().toISOString() }).eq("id", r.id); sent++; }
  }
  return NextResponse.json({ waiting: ready.length, sent });
}
