import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { generateReceipt, sendMessage } from "@/lib/comms";
import { admin, stripe } from "@/lib/server";

type Address = { line1?: string | null; line2?: string | null; city?: string | null; state?: string | null; postal_code?: string | null };
const addressText = (a?: Address | null) => (a ? [a.line1, a.line2, [a.city, a.state, a.postal_code].filter(Boolean).join(" ")].filter(Boolean).join(", ") : "");

async function paymentDetails(client: Stripe, intentId: string | null) {
  if (!intentId) return { chargeId: null, method: "" };
  try {
    const intent = await client.paymentIntents.retrieve(intentId, { expand: ["latest_charge"] });
    const charge = intent.latest_charge && typeof intent.latest_charge !== "string" ? intent.latest_charge : null;
    const card = charge?.payment_method_details?.card;
    const brand = card?.brand ? card.brand[0].toUpperCase() + card.brand.slice(1) : "Card";
    return { chargeId: charge?.id ?? null, method: card?.last4 ? `${brand} ending ${card.last4}` : "" };
  } catch (e) {
    console.warn("Payment details unavailable", intentId, e);
    return { chargeId: null, method: "" };
  }
}

async function saveItems(client: Stripe, db: NonNullable<ReturnType<typeof admin>>, sessionId: string, orderId: string) {
  const { data: items } = await client.checkout.sessions.listLineItems(sessionId, { limit: 100, expand: ["data.price.product"] });
  const { error } = await db.from("order_items").insert(items.map((i) => {
    const product = i.price?.product as Stripe.Product | undefined;
    const quantity = i.quantity ?? 1;
    return { order_id: orderId, product_id: product?.metadata?.product_id || null, name: i.description ?? product?.name ?? "", quantity, unit_price: i.amount_total / quantity / 100 };
  }));
  if (error) throw error;
}

async function recordOrder(client: Stripe, session: Stripe.Checkout.Session) {
  const db = admin();
  if (!db) throw new Error("SUPABASE_SECRET_KEY is missing");
  const { data: existing } = await db.from("orders").select("id").eq("stripe_session_id", session.id).maybeSingle();
  if (existing) return;

  const email = (session.customer_details?.email ?? session.customer_email ?? "").toLowerCase();
  const shipping = (session as unknown as { collected_information?: { shipping_details?: { name?: string; address?: Address } }; shipping_details?: { name?: string; address?: Address } });
  const details = shipping.collected_information?.shipping_details ?? shipping.shipping_details;
  const ship = session.metadata ?? {};
  const address = ship.ship_line1 ? addressText({ line1: ship.ship_line1, line2: ship.ship_line2, city: ship.ship_city, state: ship.ship_state, postal_code: ship.ship_postcode }) : addressText(details?.address ?? session.customer_details?.address);
  const name = ship.ship_name || details?.name || session.customer_details?.name || "";
  const phone = ship.ship_phone || session.customer_details?.phone || "";
  const userId = session.metadata?.user_id || null;

  const { data: known } = await db.from("customers").select("id").ilike("email", email.replace(/[%_]/g, "\\$&")).maybeSingle();
  let customerId = known?.id as string | undefined;
  if (customerId) await db.from("customers").update({ address, phone, ...(userId ? { auth_user_id: userId } : {}) }).eq("id", customerId);
  else {
    const { data: created, error } = await db.from("customers").insert({ name, email, phone, address, auth_user_id: userId }).select("id").single();
    if (error) throw error;
    customerId = created.id;
  }

  const intentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  const payment = await paymentDetails(client, intentId);

  const total = (session.amount_total ?? 0) / 100;
  const delivery = (session.total_details?.amount_shipping ?? 0) / 100;
  const { data: order, error } = await db.from("orders").insert({ customer_id: customerId, customer_email: email, auth_user_id: userId, stripe_session_id: session.id, payment_intent_id: intentId, payment_charge_id: payment.chargeId, payment_method: payment.method, paid_at: new Date().toISOString(), status: "Paid", total, subtotal: total - delivery, shipping_total: delivery, gst_total: Math.round((total / 11) * 100) / 100, shipping_name: name, shipping_address: address, shipping_phone: phone, delivery_zone: ship.ship_zone ?? "" }).select("id").single();
  if (error) {
    if (error.code === "23505") return; // Stripe delivered this event twice at once.
    throw error;
  }

  try {
    await saveItems(client, db, session.id, order.id);
  } catch (e) {
    // Remove the half-saved order so Stripe's retry can record it whole.
    await db.from("orders").delete().eq("id", order.id);
    throw e;
  }


  if (session.metadata?.cart_session) await db.from("cart_items").update({ status: "Converted" }).eq("session_id", session.metadata.cart_session).eq("status", "In cart");
  if (userId) await db.from("cart_items").update({ status: "Converted" }).eq("auth_user_id", userId).eq("status", "In cart");

  // The order is safe by this point. Either step can be repeated from the portal.
  await generateReceipt(order.id).catch((e) => console.error("Receipt could not be created", order.id, e));
  await sendMessage({ slug: "order-confirmation", orderId: order.id, to: email }).catch(() => null);
}

export async function POST(request: Request) {
  const client = stripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!client || !secret) return NextResponse.json({ ok: false }, { status: 503 });
  let event: Stripe.Event;
  try {
    event = client.webhooks.constructEvent(await request.text(), request.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid") await recordOrder(client, session);
  }
  return NextResponse.json({ ok: true });
}
