import { NextResponse } from "next/server";
import { requireAdmin, sendMessage } from "@/lib/comms";
import { admin, stripe } from "@/lib/server";

// A pre-order piece the supplier has sold out of: refund that line, mark it cancelled and tell the customer.
export async function POST(request: Request) {
  if (!(await requireAdmin(request))) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { itemId?: string; refundShipping?: boolean } | null;
  if (!body?.itemId) return NextResponse.json({ error: "Choose an item." }, { status: 400 });
  const db = admin(), client = stripe();
  if (!db || !client) return NextResponse.json({ error: "Payments aren't set up on the server." }, { status: 500 });

  const { data: item } = await db.from("order_items").select("id,order_id,name,quantity,unit_price,shipping_status,refunded_amount,orders(id,payment_intent_id,shipping_total,discount_total,subtotal)").eq("id", body.itemId).maybeSingle();
  if (!item) return NextResponse.json({ error: "That item wasn't found." }, { status: 404 });
  if (item.shipping_status === "Cancelled") return NextResponse.json({ error: "This item has already been cancelled and refunded." }, { status: 409 });
  const order = item.orders as unknown as { id: string; payment_intent_id: string | null; shipping_total: number; discount_total: number; subtotal: number };
  if (!order?.payment_intent_id) return NextResponse.json({ error: "This order has no card payment to refund." }, { status: 422 });

  // What the customer actually paid for this line: its price, less its share of any discount.
  const line = Number(item.unit_price) * item.quantity;
  const share = Number(order.subtotal) > 0 ? (Number(order.discount_total) || 0) * (line / Number(order.subtotal)) : 0;
  let amount = Math.round((line - share) * 100);
  if (body.refundShipping) amount += Math.round(Number(order.shipping_total || 0) * 100);
  if (amount <= 0) return NextResponse.json({ error: "There's nothing to refund for this item." }, { status: 422 });

  try {
    await client.refunds.create({ payment_intent: order.payment_intent_id, amount, reason: "requested_by_customer", metadata: { order_item_id: item.id, why: "Supplier sold out" } }, { idempotencyKey: `unavailable-${item.id}` });
  } catch (e) {
    return NextResponse.json({ error: `Stripe didn't accept the refund: ${e instanceof Error ? e.message : "unknown error"}` }, { status: 502 });
  }
  const dollars = amount / 100;
  await db.from("order_items").update({ shipping_status: "Cancelled", refunded_amount: dollars, cancelled_reason: "Supplier sold out" }).eq("id", item.id);

  const money = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(dollars);
  const sent = await sendMessage({ slug: "item-unavailable", orderId: order.id, data: { details: `${item.quantity} x ${item.name}, refunded ${money}` } });
  return NextResponse.json({ refunded: dollars, emailed: sent.ok, emailError: sent.ok ? undefined : sent.error });
}
