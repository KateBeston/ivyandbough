import { randomInt } from "crypto";
import { sendMessage } from "./comms";
import { OFFER_COLUMNS, offerPrice, offerText } from "./pricing";
import { admin } from "./server";

type Db = NonNullable<ReturnType<typeof admin>>;
export type Code = { id: string; code: string; email: string; discount_type: string; discount_value: number; min_order: number; applies_to_sale: boolean; expires_at: string; used_at: string | null; reserved_until: string | null; reserved_cart: string | null; reserved_session: string | null };
export type PricedLine = { id: string; cents: number; quantity: number; onSale: boolean };
export type Checked = { ok: true; code: Code; discountCents: number; label: string } | { ok: false; error: string };

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () => `WELCOME-${Array.from({ length: 8 }, () => LETTERS[randomInt(LETTERS.length)]).join("")}`;
// sarah+shop@example.com is the same person as sarah@example.com.
const emailKey = (email: string) => email.toLowerCase().trim().replace(/\+[^@]*@/, "@");
const expiry = (date: string) => new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Brisbane" }).format(new Date(date));
export const codeTerms = (c: Pick<Code, "expires_at" | "applies_to_sale">) => `It can be used once, on your first order, and expires on ${expiry(c.expires_at)}.${c.applies_to_sale ? "" : " It can't be used on sale or clearance items."}`;

async function hasOrdered(db: Db, email: string) {
  const { count } = await db.from("orders").select("id", { count: "exact", head: true }).eq("customer_email", email.toLowerCase());
  return Boolean(count);
}

// One welcome offer per person, whichever way they join, and only before a first order.
export async function issueWelcome(email: string, trigger: "Account sign-up" | "Newsletter sign-up") {
  const db = admin();
  if (!db) return false;
  const address = email.toLowerCase().trim();
  const key = emailKey(address);
  const { data: existing } = await db.from("promo_codes").select("id").eq("email_key", key).maybeSingle();
  if (existing || await hasOrdered(db, address)) return false;
  const { data: promo } = await db.from("promotions").select("id,discount_type,discount_value,min_order,valid_days,applies_to_sale").eq("trigger", trigger).eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!promo) return false;
  const expires_at = new Date(Date.now() + promo.valid_days * 86400000).toISOString();
  const { data: code, error } = await db.from("promo_codes").insert({ promotion_id: promo.id, code: newCode(), email: address, email_key: key, source: trigger, discount_type: promo.discount_type, discount_value: promo.discount_value, min_order: promo.min_order, applies_to_sale: promo.applies_to_sale, expires_at }).select("*").single();
  if (error) return false;
  await sendMessage({ slug: "welcome-offer", to: address, consented: true, data: { promo_code: code.code, offer: offerText(code), offer_terms: codeTerms(code) } }).catch(() => null);
  return true;
}

export async function unusedCode(email: string) {
  const db = admin();
  if (!db) return null;
  const { data } = await db.from("promo_codes").select("*").eq("email_key", emailKey(email)).is("used_at", null).gt("expires_at", new Date().toISOString()).maybeSingle();
  return data as Code | null;
}

export async function priceLines(db: Db, items: { id: string; quantity: number }[]) {
  const { data } = await db.from("products").select(`id,price_cents,${OFFER_COLUMNS}`).in("id", items.map((i) => i.id));
  return items.flatMap((item) => {
    const row = (data ?? []).find((r) => r.id === item.id);
    const offer = row ? offerPrice(row) : null;
    return offer?.cents ? [{ id: item.id, cents: offer.cents, quantity: item.quantity, onSale: offer.label !== "" }] : [];
  });
}

export async function checkCode(db: Db, input: string, lines: PricedLine[], cart: string): Promise<Checked> {
  const value = input.trim().toUpperCase();
  if (!/^[A-Z0-9-]{4,30}$/.test(value)) return { ok: false, error: "That code isn't valid." };
  const { data } = await db.from("promo_codes").select("*").eq("code", value).maybeSingle();
  const code = data as Code | null;
  if (!code) return { ok: false, error: "That code isn't valid." };
  if (code.used_at) return { ok: false, error: "That code has already been used." };
  if (new Date(code.expires_at) <= new Date()) return { ok: false, error: "That code has expired." };
  if (await hasOrdered(db, code.email)) return { ok: false, error: "That code is for a first order." };
  if (code.reserved_until && new Date(code.reserved_until) > new Date() && code.reserved_cart !== cart) return { ok: false, error: "That code is already being used at checkout." };
  const subtotal = lines.reduce((n, l) => n + l.cents * l.quantity, 0);
  const base = lines.filter((l) => code.applies_to_sale || !l.onSale).reduce((n, l) => n + l.cents * l.quantity, 0);
  if (!base) return { ok: false, error: "That code can't be used on sale or clearance items." };
  const min = Math.round(Number(code.min_order) * 100);
  if (base < min) return { ok: false, error: `Spend ${new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(min / 100)} or more${code.applies_to_sale ? "" : " on full-priced items"} to use this code.` };
  const off = code.discount_type === "Percent" ? Math.round(base * Number(code.discount_value) / 100) : Math.min(Math.round(Number(code.discount_value) * 100), base);
  // Stripe needs something left to charge.
  const discountCents = Math.min(off, subtotal - 100);
  if (discountCents <= 0) return { ok: false, error: "That code can't be used on this order." };
  return { ok: true, code, discountCents, label: "Welcome offer" };
}

// Held for the life of the Stripe session, so one code can't be paid for twice.
export async function reserveCode(db: Db, code: Code, cart: string) {
  const now = new Date();
  const { data } = await db.from("promo_codes").update({ reserved_until: new Date(now.getTime() + 35 * 60000).toISOString(), reserved_cart: cart, reserved_session: null }).eq("id", code.id).is("used_at", null).or(`reserved_until.is.null,reserved_until.lt.${now.toISOString()},reserved_cart.eq.${cart}`).select("id");
  return Boolean(data?.length);
}
