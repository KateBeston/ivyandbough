import { NextResponse } from "next/server";
import { isHuman } from "@/lib/guard";
import { allowed } from "@/lib/limits";
import { stripeCustomer } from "@/lib/payments";
import { OFFER_COLUMNS, offerPrice, type OfferFields } from "@/lib/pricing";
import { checkCode, reserveCode, type Checked } from "@/lib/promotions";
import { admin, stripe, userFrom } from "@/lib/server";
import { cleanItems, quoteDelivery } from "@/lib/shipping";
import { supabase } from "@/lib/supabase";

type Row = OfferFields & { id: string; sku: string; name: string; product_images: { url: string; sort_order: number }[] };

const STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

export async function POST(request: Request) {
  const client = stripe();
  if (!client) return NextResponse.json({ error: "Checkout isn't switched on yet." }, { status: 503 });
  if (!(await allowed(request, "checkout", 15, 600))) return NextResponse.json({ error: "Please try again in a few minutes." }, { status: 429 });
  const body = await request.json().catch(() => null);
  if (body?.company) return NextResponse.json({ error: "That didn't go through. Please try again." }, { status: 400 });
  if (!(await isHuman(body?.token, request))) return NextResponse.json({ error: "We couldn't confirm you're human. Please refresh the page and try again." }, { status: 403 });
  const items = cleanItems(body?.items);
  if (!items.length) return NextResponse.json({ error: "Your basket is empty." }, { status: 400 });
  const text = (value: unknown, max = 120) => String(value ?? "").trim().slice(0, max);
  const delivery = { name: text(body?.delivery?.name), phone: text(body?.delivery?.phone, 30), line1: text(body?.delivery?.line1, 200), line2: text(body?.delivery?.line2, 200), city: text(body?.delivery?.city), state: text(body?.delivery?.state, 3), postcode: text(body?.delivery?.postcode, 4) };
  if (!delivery.name || !delivery.line1 || !delivery.city || !STATES.includes(delivery.state) || !/^\d{4}$/.test(delivery.postcode) || !/^\+614\d{8}$/.test(delivery.phone)) return NextResponse.json({ error: "Please check your delivery details." }, { status: 400 });

  // Prices always come from the database, never from the browser.
  const { data, error } = await supabase.from("products").select(`id,sku,name,price_cents,${OFFER_COLUMNS},product_images(url,sort_order)`).in("id", items.map((i) => String(i.id)));
  if (error) return NextResponse.json({ error: "Checkout isn't available right now." }, { status: 500 });
  const rows = (data ?? []) as Row[];
  const origin = new URL(request.url).origin;
  const lines = items.flatMap((item) => {
    const row = rows.find((r) => r.id === item.id);
    const offer = row ? offerPrice(row) : null;
    return row && offer?.cents ? [{ row, quantity: item.quantity, cents: offer.cents, onSale: offer.label !== "" }] : [];
  });
  if (lines.length !== items.length) return NextResponse.json({ error: "Something in your basket is no longer available." }, { status: 400 });

  let quote;
  try {
    quote = await quoteDelivery(supabase, items, delivery.postcode);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Delivery can't be calculated right now." }, { status: 422 });
  }

  const cart = /^[0-9a-f-]{36}$/i.test(String(body?.sessionId)) ? String(body.sessionId) : crypto.randomUUID();
  const db = admin();
  let promo: Extract<Checked, { ok: true }> | null = null;
  const promoCode = String(body?.promoCode ?? "").trim();
  if (promoCode) {
    if (!db) return NextResponse.json({ error: "Codes aren't available right now." }, { status: 503 });
    const checked = await checkCode(db, promoCode, lines.map((l) => ({ id: l.row.id, cents: l.cents, quantity: l.quantity, onSale: l.onSale })), cart);
    if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
    if (!(await reserveCode(db, checked.code, cart))) return NextResponse.json({ error: "That code is already being used at checkout." }, { status: 409 });
    // Going back to the basket leaves the earlier payment page open, so it's closed here.
    if (checked.code.reserved_session) await client.checkout.sessions.expire(checked.code.reserved_session).catch(() => null);
    promo = checked;
  }
  const coupon = promo ? await client.coupons.create({ amount_off: promo.discountCents, currency: "aud", duration: "once", max_redemptions: 1, name: promo.label }) : null;
  const payable = quote.subtotalCents - (promo?.discountCents ?? 0) + quote.deliveryCents;

  const user = await userFrom(request);
  const customer = user ? await stripeCustomer(client, user).catch(() => null) : null;
  const session = await client.checkout.sessions.create({
    mode: "payment",
    currency: "aud",
    line_items: lines.map(({ row, quantity, cents }) => {
      const url = [...row.product_images].sort((a, b) => a.sort_order - b.sort_order)[0]?.url;
      return { quantity, price_data: { currency: "aud", unit_amount: cents, product_data: { name: row.name, images: url ? [url.startsWith("/") ? `${origin}${url}` : url] : undefined, metadata: { product_id: row.id, sku: row.sku } } } };
    }),
    ...(coupon ? { discounts: [{ coupon: coupon.id }], expires_at: Math.floor(Date.now() / 1000) + 31 * 60 } : {}),
    shipping_options: [{ shipping_rate_data: { display_name: quote.deliveryCents ? "Delivery" : "Free delivery", type: "fixed_amount", fixed_amount: { amount: quote.deliveryCents, currency: "aud" } } }],
    payment_intent_data: { shipping: { name: delivery.name, phone: delivery.phone, address: { line1: delivery.line1, line2: delivery.line2 || undefined, city: delivery.city, state: delivery.state, postal_code: delivery.postcode, country: "AU" } } },
    custom_text: { submit: { message: `Total includes GST of $${(payable / 1100).toFixed(2)}. By placing your order, you agree to the Ivy & Bough Terms of Sale and Privacy Policy.` } },
    ...(customer ? { customer, saved_payment_method_options: { payment_method_save: "enabled" as const } } : { customer_email: user?.email }),
    metadata: { user_id: user?.id ?? "", cart_session: cart, promo_code: promo?.code.code ?? "", ship_name: delivery.name, ship_phone: delivery.phone, ship_line1: delivery.line1, ship_line2: delivery.line2, ship_city: delivery.city, ship_state: delivery.state, ship_postcode: delivery.postcode, ship_zone: quote.zone, sms_updates: body?.delivery?.smsUpdates === true ? "yes" : "no", marketing: body?.delivery?.marketing === true ? "yes" : "no" },
    success_url: `${origin}/order/thanks`,
    cancel_url: `${origin}/basket`,
  });
  if (promo && db) await db.from("promo_codes").update({ reserved_session: session.id }).eq("id", promo.code.id);
  return NextResponse.json({ url: session.url });
}
