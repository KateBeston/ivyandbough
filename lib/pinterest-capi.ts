import { createHash } from "crypto";

// Pinterest Conversions API: the server-side copy of a purchase, sent only when the shopper accepted all cookies.
// Needs PINTEREST_CONVERSIONS_TOKEN and PINTEREST_AD_ACCOUNT_ID; without them nothing is sent.
type Line = { id: string; name: string; price: number; quantity: number };
const sha = (v: string) => createHash("sha256").update(v.trim().toLowerCase()).digest("hex");

export async function pinterestCheckout(o: { eventId: string; orderId: string; email: string; ip?: string; ua?: string; clickId?: string; value: number; lines: Line[] }) {
  const token = process.env.PINTEREST_CONVERSIONS_TOKEN;
  const account = process.env.PINTEREST_AD_ACCOUNT_ID;
  if (!token || !account) return;
  const user_data: Record<string, unknown> = {};
  if (o.email) user_data.em = [sha(o.email)];
  if (o.ip) user_data.client_ip_address = o.ip;
  if (o.ua) user_data.client_user_agent = o.ua;
  if (o.clickId) user_data.click_id = o.clickId;
  const event = {
    event_name: "checkout", action_source: "web", event_time: Math.floor(Date.now() / 1000), event_id: o.eventId,
    event_source_url: "https://ivyandbough.com/order/thanks", user_data,
    custom_data: { currency: "AUD", value: o.value.toFixed(2), order_id: o.orderId, num_items: o.lines.reduce((n, l) => n + l.quantity, 0), content_ids: o.lines.map((l) => l.id), contents: o.lines.map((l) => ({ id: l.id, item_name: l.name, item_price: l.price.toFixed(2), quantity: l.quantity })) },
  };
  const test = process.env.PINTEREST_CAPI_TEST === "true" ? "?test=true" : "";
  const res = await fetch(`https://api.pinterest.com/v5/ad_accounts/${account}/events${test}`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ data: [event] }) });
  if (!res.ok) throw new Error(`Pinterest ${res.status}: ${(await res.text()).slice(0, 300)}`);
}
