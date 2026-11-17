import { createHash } from "crypto";

// Meta Conversions API: the server-side copy of a purchase, sent only when the shopper accepted all cookies.
// It uses the same event id as the browser pixel (the Stripe session id), so Meta counts each sale once,
// and still records sales the pixel misses (ad blockers, closed tabs). Needs META_CAPI_TOKEN; without it nothing is sent.
type Line = { id: string; name: string; price: number; quantity: number };
const PIXEL = process.env.META_PIXEL_ID || "3833433373475898";
const norm = (v: string) => v.trim().toLowerCase();
const sha = (v: string) => createHash("sha256").update(v).digest("hex");
const hashed = (v?: string, clean: (s: string) => string = norm) => { const c = v ? clean(v) : ""; return c ? [sha(c)] : undefined; };
// Australian numbers to international format without the plus: 0412 345 678 -> 61412345678.
const phoneClean = (p: string) => { const d = p.replace(/\D/g, ""); return d.startsWith("61") ? d : d.startsWith("0") ? `61${d.slice(1)}` : d; };

export async function metaPurchase(o: {
  eventId: string; orderId: string; email: string; phone?: string; name?: string; city?: string; state?: string; postcode?: string;
  externalId?: string; ip?: string; ua?: string; fbp?: string; fbc?: string; value: number; lines: Line[];
}) {
  const token = process.env.META_CAPI_TOKEN;
  if (!token) return { skipped: "META_CAPI_TOKEN missing" };
  const [first, ...rest] = (o.name ?? "").trim().split(/\s+/);
  const user_data: Record<string, unknown> = {
    em: hashed(o.email), ph: hashed(o.phone, phoneClean),
    fn: hashed(first), ln: hashed(rest.join(" ")),
    ct: hashed(o.city, (s) => norm(s).replace(/[^a-z]/g, "")), st: hashed(o.state), zp: hashed(o.postcode, (s) => s.replace(/\s/g, "")), country: hashed("au"),
    external_id: hashed(o.externalId), client_ip_address: o.ip || undefined, client_user_agent: o.ua || undefined, fbp: o.fbp || undefined, fbc: o.fbc || undefined,
  };
  for (const k of Object.keys(user_data)) if (user_data[k] === undefined) delete user_data[k];
  const event = {
    event_name: "Purchase", event_time: Math.floor(Date.now() / 1000), event_id: o.eventId, action_source: "website",
    event_source_url: "https://ivyandbough.com/order/thanks", user_data,
    custom_data: { currency: "AUD", value: Number(o.value.toFixed(2)), order_id: o.orderId, content_type: "product", content_ids: o.lines.map((l) => l.id), contents: o.lines.map((l) => ({ id: l.id, quantity: l.quantity, item_price: Number(l.price.toFixed(2)) })), num_items: o.lines.reduce((n, l) => n + l.quantity, 0) },
  };
  const body: Record<string, unknown> = { data: [event] };
  if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE;
  const res = await fetch(`https://graph.facebook.com/v21.0/${PIXEL}/events?access_token=${encodeURIComponent(token)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Meta ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}
