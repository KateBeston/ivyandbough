import { createHmac, timingSafeEqual } from "crypto";
import { sendMessage } from "./comms";
import type { admin } from "./server";

type Db = NonNullable<ReturnType<typeof admin>>;
const API = "https://api.aftership.com/tracking/2025-07";
const PORTAL = process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://ivy-and-bough-portal.vercel.app";

// AfterShip courier codes. Anything not listed is left for AfterShip to detect.
const SLUGS: Record<string, string> = { "australia post": "australia-post", startrack: "star-track", couriersplease: "couriers-please", sendle: "sendle", dhl: "dhl" };

export const STATUS: Record<string, string> = {
  Pending: "Waiting for first scan", InfoReceived: "Label created", InTransit: "In transit", OutForDelivery: "Out for delivery",
  AttemptFail: "Delivery attempt failed", Delivered: "Delivered", AvailableForPickup: "Ready to collect", Exception: "Delivery problem", Expired: "Tracking expired",
};
// What each tracking status means for the order item.
const ITEM_STATUS: Record<string, string> = { InfoReceived: "Shipped", InTransit: "In transit", OutForDelivery: "Out for delivery", Delivered: "Delivered", AttemptFail: "Delivery problem", Exception: "Delivery problem", AvailableForPickup: "Delivery problem", Expired: "Delivery problem" };
const ALERT = new Set(["AttemptFail", "Exception", "Expired", "AvailableForPickup"]);

const key = () => process.env.AFTERSHIP_API_KEY;
const headers = () => ({ "as-api-key": key() ?? "", "Content-Type": "application/json" });

export function verifiedAftership(raw: string, signature: string | null) {
  const secret = process.env.AFTERSHIP_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(raw).digest("base64"));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

type Parcel = { id: string; order_id: string; carrier: string; tracking_number: string; notified: Record<string, string>; tag: string };

export async function registerParcel(db: Db, parcel: Parcel, orderNumber: string) {
  if (!key()) return { ok: false, error: "AFTERSHIP_API_KEY is not set." };
  const slug = SLUGS[parcel.carrier.trim().toLowerCase()];
  const res = await fetch(`${API}/trackings`, { method: "POST", headers: headers(), body: JSON.stringify({ tracking_number: parcel.tracking_number, ...(slug ? { slug } : {}), order_id: parcel.order_id, order_number: orderNumber, title: orderNumber }), signal: AbortSignal.timeout(15000) }).catch(() => null);
  const body = await res?.json().catch(() => null);
  const code = body?.meta?.code;
  // 4003 means AfterShip already follows this parcel, which is fine.
  if (!res || (!res.ok && code !== 4003)) {
    const error = String(body?.meta?.message ?? "AfterShip could not be reached.").slice(0, 300);
    await db.from("parcels").update({ register_error: error, updated_at: new Date().toISOString() }).eq("id", parcel.id);
    return { ok: false, error };
  }
  const t = body?.data?.tracking ?? body?.data ?? {};
  await db.from("parcels").update({ aftership_id: String(t.id ?? ""), registered_at: new Date().toISOString(), register_error: "", tracking_link: String(t.courier_tracking_link ?? t.tracking_link ?? ""), updated_at: new Date().toISOString() }).eq("id", parcel.id);
  if (t.tag) await applyUpdate(db, t);
  return { ok: true };
}

export async function registerPending(db: Db, orderId?: string) {
  let q = db.from("parcels").select("id,order_id,carrier,tracking_number,notified,tag,orders(order_number)").is("registered_at", null).limit(20);
  if (orderId) q = q.eq("order_id", orderId);
  else q = q.or(`register_error.eq.,updated_at.lt."${new Date(Date.now() - 6 * 3600000).toISOString()}"`);
  const { data } = await q;
  const results = [];
  for (const p of (data ?? []) as unknown as (Parcel & { orders: { order_number: string } | null })[]) results.push(await registerParcel(db, p, p.orders?.order_number ?? ""));
  return results;
}

type Checkpoint = { checkpoint_time?: string; message?: string; location?: string; city?: string; state?: string; tag?: string };
type Tracking = { tracking_number?: string; order_id?: string; tag?: string; subtag_message?: string; checkpoints?: Checkpoint[]; courier_tracking_link?: string; courier_estimated_delivery_date?: { estimated_delivery_date?: string }; aftership_estimated_delivery_date?: { estimated_delivery_date?: string }; expected_delivery?: string; shipment_delivery_date?: string };

export async function applyUpdate(db: Db, t: Tracking) {
  const number = String(t.tracking_number ?? "").trim();
  if (!number) return;
  let q = db.from("parcels").select("id,order_id,carrier,tracking_number,notified,tag").eq("tracking_number", number);
  if (t.order_id && /^[0-9a-f-]{36}$/i.test(t.order_id)) q = q.eq("order_id", t.order_id);
  const { data: parcels } = await q;
  const tag = String(t.tag ?? "Pending");
  const points = (t.checkpoints ?? []).slice(-40);
  const last = points.at(-1);
  const expected = t.courier_estimated_delivery_date?.estimated_delivery_date ?? t.aftership_estimated_delivery_date?.estimated_delivery_date ?? t.expected_delivery ?? null;
  for (const p of (parcels ?? []) as Parcel[]) {
    await db.from("parcels").update({
      tag, status: STATUS[tag] ?? tag, subtag_message: String(t.subtag_message ?? "").slice(0, 200),
      last_event: String(last?.message ?? "").slice(0, 300), last_location: [last?.city, last?.state].filter(Boolean).join(", ") || String(last?.location ?? "").slice(0, 120),
      last_event_at: last?.checkpoint_time ?? null, expected_delivery: expected ? String(expected).slice(0, 10) : null,
      delivered_at: tag === "Delivered" ? (t.shipment_delivery_date ?? last?.checkpoint_time ?? new Date().toISOString()) : null,
      checkpoints: points.map((c) => ({ at: c.checkpoint_time, message: c.message, location: [c.city, c.state].filter(Boolean).join(", ") || c.location || "", tag: c.tag })),
      ...(t.courier_tracking_link ? { tracking_link: t.courier_tracking_link } : {}), updated_at: new Date().toISOString(),
    }).eq("id", p.id);
    if (ITEM_STATUS[tag]) await db.from("order_items").update({ shipping_status: ITEM_STATUS[tag] }).eq("order_id", p.order_id).eq("tracking_number", p.tracking_number);
    await notify(db, p, tag);
  }
}

// Each customer message and alert goes once per parcel.
async function notify(db: Db, p: Parcel, tag: string) {
  const done = { ...(p.notified ?? {}) };
  const mark = async (k: string) => { done[k] = new Date().toISOString(); await db.from("parcels").update({ notified: done }).eq("id", p.id); };
  if (tag === "OutForDelivery" && !done.out) {
    await mark("out");
    await sendMessage({ slug: "order-out-for-delivery", orderId: p.order_id }).catch(() => null);
    await sendMessage({ slug: "order-out-for-delivery-sms", orderId: p.order_id }).catch(() => null);
  }
  if (tag === "Delivered" && !done.delivered) {
    // Wait until every parcel in the order has arrived before saying it's delivered.
    const { data: open } = await db.from("parcels").select("id").eq("order_id", p.order_id).neq("tag", "Delivered").neq("id", p.id).limit(1);
    if (!open?.length) {
      await mark("delivered");
      await sendMessage({ slug: "order-delivered", orderId: p.order_id }).catch(() => null);
      await sendMessage({ slug: "order-delivered-sms", orderId: p.order_id }).catch(() => null);
    }
  }
  if (ALERT.has(tag) && !done[`alert-${tag}`]) {
    await mark(`alert-${tag}`);
    const { data: order } = await db.from("orders").select("order_number").eq("id", p.order_id).maybeSingle();
    await sendMessage({ slug: "parcel-alert", to: "hello@ivyandbough.com", data: { order_number: order?.order_number ?? "", parcel_status: STATUS[tag] ?? tag, carrier: p.carrier || "Carrier", tracking_number: p.tracking_number, portal_url: PORTAL } }).catch(() => null);
    await db.from("parcels").update({ alerted_at: new Date().toISOString() }).eq("id", p.id);
  }
}
