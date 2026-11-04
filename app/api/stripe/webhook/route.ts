import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { admin, stripe } from "@/lib/server";

type Address = { line1?: string | null; line2?: string | null; city?: string | null; state?: string | null; postal_code?: string | null };
const addressText = (a?: Address | null) => (a ? [a.line1, a.line2, [a.city, a.state, a.postal_code].filter(Boolean).join(" ")].filter(Boolean).join(", ") : "");

async function recordOrder(client: Stripe, session: Stripe.Checkout.Session) {
  const db = admin();
  if (!db) throw new Error("SUPABASE_SECRET_KEY is missing");
  const { data: existing } = await db.from("orders").select("id").eq("stripe_session_id", session.id).maybeSingle();
  if (existing) return;

  const email = (session.customer_details?.email ?? session.customer_email ?? "").toLowerCase();
  const shipping = (session as unknown as { collected_information?: { shipping_details?: { name?: string; address?: Address } }; shipping_details?: { name?: string; address?: Address } });
  const details = shipping.collected_information?.shipping_details ?? shipping.shipping_details;
  const address = addressText(details?.address ?? session.customer_details?.address);
  const name = details?.name ?? session.customer_details?.name ?? "";
  const userId = session.metadata?.user_id || null;

  const { data: known } = await db.from("customers").select("id").ilike("email", email.replace(/[%_]/g, "\\$&")).maybeSingle();
  let customerId = known?.id as string | undefined;
  if (customerId) await db.from("customers").update({ address, phone: session.customer_details?.phone ?? "" }).eq("id", customerId);
  else {
    const { data: created, error } = await db.from("customers").insert({ name, email, phone: session.customer_details?.phone ?? "", address, auth_user_id: userId }).select("id").single();
    if (error) throw error;
    customerId = created.id;
  }

  const total = (session.amount_total ?? 0) / 100;
  const delivery = (session.total_details?.amount_shipping ?? 0) / 100;
  const { data: order, error } = await db.from("orders").insert({ customer_id: customerId, customer_email: email, auth_user_id: userId, stripe_session_id: session.id, status: "Paid", total, subtotal: total - delivery, shipping_total: delivery, gst_total: Math.round((total / 11) * 100) / 100, shipping_name: name, shipping_address: address }).select("id").single();
  if (error) throw error;

  const { data: items } = await client.checkout.sessions.listLineItems(session.id, { limit: 100, expand: ["data.price.product"] });
  const { error: itemError } = await db.from("order_items").insert(items.map((i) => {
    const product = i.price?.product as Stripe.Product | undefined;
    const quantity = i.quantity ?? 1;
    return { order_id: order.id, product_id: product?.metadata?.product_id || null, name: i.description ?? product?.name ?? "", quantity, unit_price: i.amount_total / quantity / 100 };
  }));
  if (itemError) throw itemError;

  if (session.metadata?.cart_session) await db.from("cart_items").update({ status: "Converted" }).eq("session_id", session.metadata.cart_session).eq("status", "In cart");
  if (userId) await db.from("cart_items").update({ status: "Converted" }).eq("auth_user_id", userId).eq("status", "In cart");
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
