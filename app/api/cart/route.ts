import { NextResponse, after } from "next/server";
import { sendMessage } from "@/lib/comms";
import { allowed } from "@/lib/limits";
import { CONTACT_EMAIL } from "@/lib/requests";
import { admin, userFrom } from "@/lib/server";

const ALERT_GAP = 12 * 3600000;

export async function POST(request: Request) {
  const db = admin();
  if (!db) return new NextResponse(null, { status: 204 });
  const body = await request.json().catch(() => null);
  const sessionId = String(body?.sessionId ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return NextResponse.json({ ok: false }, { status: 400 });
  if (!(await allowed(request, "cart", 120, 600))) return NextResponse.json({ ok: false }, { status: 429 });
  const lines = Array.isArray(body?.lines) ? (body.lines as { id: string; quantity: number }[]).slice(0, 50) : [];
  const user = await userFrom(request);

  const { count: before } = await db.from("cart_items").select("id", { count: "exact", head: true }).eq("session_id", sessionId).eq("status", "In cart");
  await db.from("cart_items").delete().eq("session_id", sessionId).eq("status", "In cart");
  if (user) await db.from("cart_items").delete().eq("auth_user_id", user.id).eq("status", "In cart");
  if (lines.length) {
    await db.from("cart_items").insert(lines.map((l) => ({ product_id: String(l.id), quantity: Math.min(20, Math.max(1, Math.round(Number(l.quantity)) || 1)), session_id: sessionId, auth_user_id: user?.id ?? null, customer_email: user?.email ?? "" })));
  }
  // Lets us know when a shopper starts a basket: once per visit, at most every 12 hours.
  if (lines.length && !before) after(() => alertNewBasket(db, sessionId, lines, user?.email ?? "").catch((e) => console.warn("Basket alert failed", e)));
  return NextResponse.json({ ok: true });
}

async function alertNewBasket(db: NonNullable<ReturnType<typeof admin>>, sessionId: string, lines: { id: string; quantity: number }[], email: string) {
  const { data: last } = await db.from("basket_alerts").select("alerted_at").eq("session_id", sessionId).maybeSingle();
  if (last && Date.now() - new Date(last.alerted_at).getTime() < ALERT_GAP) return;
  await db.from("basket_alerts").upsert({ session_id: sessionId, alerted_at: new Date().toISOString() });
  const { data: products } = await db.from("products").select("id,name,sku,price_cents").in("id", lines.map((l) => String(l.id)));
  const byId = new Map((products ?? []).map((p) => [p.id, p]));
  let cents = 0;
  const items = lines.map((l) => {
    const p = byId.get(String(l.id));
    cents += (p?.price_cents ?? 0) * (Number(l.quantity) || 1);
    return `${Number(l.quantity) || 1} x ${p?.name ?? "Unknown item"}${p?.sku ? ` (${p.sku})` : ""}`;
  });
  const value = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(cents / 100);
  await sendMessage({ slug: "basket-started", to: CONTACT_EMAIL, data: { shopper: email ? `${email} (signed in)` : "Guest (not signed in)", basket_value: value, basket_items: items.join("\n") } });
}
