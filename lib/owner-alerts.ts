import { sendMessage } from "@/lib/comms";
import { CONTACT_EMAIL } from "@/lib/requests";
import type { admin } from "@/lib/server";

type Db = NonNullable<ReturnType<typeof admin>>;
const money = (n: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

// The owner's mobile for shop alerts. It lives only in the private settings table, never in the code.
export async function alertMobile(db: Db) {
  const { data } = await db.from("app_secrets").select("value").eq("key", "alert_mobile").maybeSingle();
  return String(data?.value ?? "").trim();
}

// A short text to the owner. Skipped quietly when no alert mobile has been saved.
export async function textOwner(db: Db, slug: string, data: Record<string, string>) {
  const to = await alertMobile(db);
  if (!to) return;
  const res = await sendMessage({ slug, to, data });
  if (!res.ok) console.warn("Owner text not sent", slug, res.error);
}

// Lets us know the moment an order is paid: an email with what to order from whom, and a text.
export async function alertNewOrder(db: Db, orderId: string) {
  const { data: order } = await db.from("orders").select("order_number,total,is_test,shipping_address,order_items(name,sku,quantity,product_id)").eq("id", orderId).single();
  if (!order) return;
  const items = (order.order_items ?? []) as { name: string; sku: string; quantity: number; product_id: string | null }[];
  const ids = items.map((i) => i.product_id).filter(Boolean) as string[];
  const { data: links } = ids.length ? await db.from("supplier_items").select("product_id,suppliers(name)").in("product_id", ids) : { data: [] };
  const supplierOf = new Map(((links ?? []) as unknown as { product_id: string; suppliers: { name: string } | null }[]).map((l) => [l.product_id, l.suppliers?.name ?? ""]));
  const lines = items.map((i) => `${i.quantity} x ${i.name}${i.sku ? ` (${i.sku})` : ""}: ${supplierOf.get(i.product_id ?? "") || "no supplier on file"}`);
  const state = (String(order.shipping_address ?? "").match(/\b(QLD|NSW|VIC|SA|WA|TAS|NT|ACT)\b/) ?? [""])[0];
  const count = items.reduce((n, i) => n + (Number(i.quantity) || 1), 0);
  const test = order.is_test ? " (test)" : "";
  const email = await sendMessage({ slug: "new-order-alert", to: CONTACT_EMAIL, orderId, data: { supplier_lines: lines.join("\n"), delivery_state: state || "see order", test_note: test } });
  if (!email.ok) console.warn("New order email not sent", email.error);
  await textOwner(db, "new-order-sms", { order_number: order.order_number + test, order_total: money(Number(order.total)), item_count: `${count} ${count === 1 ? "item" : "items"}`, delivery_state: state || "Australia" });
}
