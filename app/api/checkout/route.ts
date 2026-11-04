import { NextResponse } from "next/server";
import { stripe, userFrom } from "@/lib/server";
import { cleanItems, quoteDelivery } from "@/lib/shipping";
import { supabase } from "@/lib/supabase";

type Row = { id: string; name: string; price_cents: number | null; product_images: { url: string; sort_order: number }[] };

const STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

export async function POST(request: Request) {
  const client = stripe();
  if (!client) return NextResponse.json({ error: "Checkout isn't switched on yet." }, { status: 503 });
  const body = await request.json().catch(() => null);
  const items = cleanItems(body?.items);
  if (!items.length) return NextResponse.json({ error: "Your basket is empty." }, { status: 400 });
  const text = (value: unknown, max = 120) => String(value ?? "").trim().slice(0, max);
  const delivery = { name: text(body?.delivery?.name), phone: text(body?.delivery?.phone, 30), line1: text(body?.delivery?.line1, 200), line2: text(body?.delivery?.line2, 200), city: text(body?.delivery?.city), state: text(body?.delivery?.state, 3), postcode: text(body?.delivery?.postcode, 4) };
  if (!delivery.name || !delivery.line1 || !delivery.city || !STATES.includes(delivery.state) || !/^\d{4}$/.test(delivery.postcode) || delivery.phone.replace(/\D/g, "").length < 8) return NextResponse.json({ error: "Please check your delivery details." }, { status: 400 });

  // Prices always come from the database, never from the browser.
  const { data, error } = await supabase.from("products").select("id,name,price_cents,product_images(url,sort_order)").in("id", items.map((i) => String(i.id)));
  if (error) return NextResponse.json({ error: "Checkout isn't available right now." }, { status: 500 });
  const rows = (data ?? []) as Row[];
  const origin = new URL(request.url).origin;
  const lines = items.flatMap((item) => {
    const row = rows.find((r) => r.id === item.id);
    return row && row.price_cents !== null ? [{ row, quantity: item.quantity }] : [];
  });
  if (lines.length !== items.length) return NextResponse.json({ error: "Something in your basket is no longer available." }, { status: 400 });

  let quote;
  try {
    quote = await quoteDelivery(supabase, items, delivery.postcode);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Delivery can't be calculated right now." }, { status: 422 });
  }
  const user = await userFrom(request);
  const session = await client.checkout.sessions.create({
    mode: "payment",
    currency: "aud",
    line_items: lines.map(({ row, quantity }) => {
      const url = [...row.product_images].sort((a, b) => a.sort_order - b.sort_order)[0]?.url;
      return { quantity, price_data: { currency: "aud", unit_amount: row.price_cents!, product_data: { name: row.name, images: url ? [url.startsWith("/") ? `${origin}${url}` : url] : undefined, metadata: { product_id: row.id } } } };
    }),
    shipping_options: [{ shipping_rate_data: { display_name: quote.deliveryCents ? "Delivery" : "Free delivery", type: "fixed_amount", fixed_amount: { amount: quote.deliveryCents, currency: "aud" } } }],
    payment_intent_data: { shipping: { name: delivery.name, phone: delivery.phone, address: { line1: delivery.line1, line2: delivery.line2 || undefined, city: delivery.city, state: delivery.state, postal_code: delivery.postcode, country: "AU" } } },
    custom_text: { submit: { message: "By placing your order, you agree to the Ivy & Bough Terms of Sale and Privacy Policy." } },
    customer_email: user?.email,
    metadata: { user_id: user?.id ?? "", cart_session: String(body?.sessionId ?? "").slice(0, 60), ship_name: delivery.name, ship_phone: delivery.phone, ship_line1: delivery.line1, ship_line2: delivery.line2, ship_city: delivery.city, ship_state: delivery.state, ship_postcode: delivery.postcode, ship_zone: quote.zone },
    success_url: `${origin}/order/thanks`,
    cancel_url: `${origin}/basket`,
  });
  return NextResponse.json({ url: session.url });
}
