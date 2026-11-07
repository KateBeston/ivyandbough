import { NextResponse } from "next/server";
import { requireAdmin, sendMessage } from "@/lib/comms";
import { admin } from "@/lib/server";

const BLIND = "Please ship this order without prices, invoices or your own marketing in the parcel, and show Ivy & Bough as the sender where you can.";

const poText = (lines: { quantity: number; name: string; sku: string; unit_cost: number }[]) => lines.map((l) => `${l.quantity} x ${l.name}${l.sku ? ` (${l.sku})` : ""}, $${Number(l.unit_cost).toFixed(2)} each`).join("\n");

export async function POST(request: Request) {
  if (!(await requireAdmin(request))) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  const id = String((await request.json().catch(() => null))?.id ?? "");
  const db = admin();
  if (!db || !id) return NextResponse.json({ error: "Choose a purchase order." }, { status: 400 });
  const { data: po } = await db.from("purchase_orders").select("*,suppliers(name,email,order_email,blind_ship),orders(id,status,shipping_name,shipping_address,shipping_phone,authority_to_leave,delivery_instructions),purchase_order_items(name,sku,quantity,unit_cost,order_item_id)").eq("id", id).maybeSingle();
  if (!po) return NextResponse.json({ error: "That purchase order wasn't found." }, { status: 404 });
  const supplier = po.suppliers as unknown as { email: string; order_email: string; blind_ship: boolean };
  const order = po.orders as unknown as { id: string; status: string; shipping_name: string; shipping_address: string; shipping_phone: string; authority_to_leave: boolean; delivery_instructions: string };
  const lines = po.purchase_order_items as { name: string; sku: string; quantity: number; unit_cost: number; order_item_id: string }[];
  const to = supplier.order_email || supplier.email;
  if (!to) return NextResponse.json({ error: "This supplier has no ordering email. Add one under Trade terms." }, { status: 422 });
  const notes = [supplier.blind_ship ? BLIND : "", po.notes].filter(Boolean).join("\n\n");
  const result = await sendMessage({ slug: "purchase-order", to, data: { po_number: po.po_number, po_items: poText(lines), delivery_name: order.shipping_name, delivery_address: [order.shipping_address, order.authority_to_leave ? "Authority to leave: yes, leave in a safe place if no one is home" : "Authority to leave: no", order.delivery_instructions ? `Delivery instructions: ${order.delivery_instructions}` : ""].filter(Boolean).join("\n"), delivery_phone: order.shipping_phone ?? "", po_notes: notes } });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });
  await db.from("purchase_orders").update({ status: "Sent", sent_at: new Date().toISOString(), sent_to: to }).eq("id", id);
  await db.from("order_items").update({ shipping_status: "With supplier" }).in("id", lines.map((l) => l.order_item_id));
  if (order.status === "New" || order.status === "Paid") await db.from("orders").update({ status: "With supplier" }).eq("id", order.id);
  return NextResponse.json({ ok: true, to });
}
