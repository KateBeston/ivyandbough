import { SOCIAL_LINKS } from "./seo";
import { createClient } from "@supabase/supabase-js";
import type { InvoiceData } from "./invoice";
import { buildPdf, ensureReceipt } from "./receipts";
import { admin } from "./server";
import { trackingUrl } from "./tracking";
import { key, url } from "./supabase";

// Every email and text leaves through this file, so the unsubscribe check,
// the send and the log cannot be skipped. Provider keys stay on the server.

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ivy-and-bough.vercel.app";
const FROM = "Ivy & Bough <hello@ivyandbough.com>";
const BROADCAST_STREAM = process.env.POSTMARK_BROADCAST_STREAM ?? "broadcast";

export type Channel = "Email" | "SMS";
export type MessageClass = "Transactional" | "Marketing";
export type Draft = { channel: Channel; message_class: MessageClass; subject: string; preheader: string; body: string; media_url?: string };
type Db = NonNullable<ReturnType<typeof admin>>;
type Result = { ok: true; id: string } | { ok: false; error: string };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const money = (n: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
const clean = (s: unknown) => String(s ?? "").replace(/[[\]]/g, "");

export function toE164(input: string) {
  const raw = input.replace(/[^\d+]/g, "");
  if (/^\+\d{8,15}$/.test(raw)) return raw;
  if (/^0\d{9}$/.test(raw)) return `+61${raw.slice(1)}`;
  return /^61\d{9}$/.test(raw) ? `+${raw}` : null;
}

export function normalise(channel: Channel, address: string) {
  if (channel === "SMS") return toE164(address);
  const email = address.trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && email.length <= 254 ? email : null;
}

export const SAMPLE: Record<string, string> = {
  flags: "Below Winter Wares' $300 minimum (this order is $120.00)", portal_url: "https://ivy-and-bough-portal.vercel.app",
  document_title: "Supplier Terms of Purchase", signer_name: "Sarah", supplier_name: "Winter Wares", sign_url: "https://ivyandbough.com/sign/sample", expires_on: "5 December 2026", version_id: "SUPPLIER-TERMS-v1", signed_on: "6 November 2026", pdf_url: "https://ivyandbough.com/api/sign/pdf", request_number: "SIG-1001",
  po_number: "PO-1001", po_items: "2 x Velvet Bow (IVB-10001), $18.00 each", delivery_phone: "+61 400 000 000", po_notes: "",
  first_name: "Sarah", customer_name: "Sarah Smith", order_number: "IB-1001", items: "1 x Dark velvet Christmas tree bow, $49.00", order_total: "$63.95", delivery_total: "$14.95", gst_total: "$5.81",
  delivery_name: "Sarah Smith", delivery_address: "1 Example Street, Brisbane QLD 4000", tracking: "Dark velvet Christmas tree bow: Australia Post, [track your parcel](https://auspost.com.au/mypost/track/#/details/123456789)", details: "$63.95", dispatch_estimate: "Most items are dispatched within 3 business days.",
  basket_items: "1 x [Dark velvet Christmas tree bow](https://ivy-and-bough.vercel.app/shop)",
  promo_code: "WELCOME-SAMPLE12", offer: "$10 off your first order of $50 or more", offer_terms: "It can be used once, on your first order, and expires on 5 December 2026. It can't be used on sale or clearance items.",
};

const links = () => ({ site_url: SITE_URL, account_url: `${SITE_URL}/account` });

// These two are built here from cleaned values, because they contain links.
const RAW = new Set(["tracking", "basket_items", "order_details"]);

export function merge(text: string, data: Record<string, string>) {
  const missing = new Set<string>();
  const out = text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, name: string) => {
    if (data[name] === undefined) { missing.add(name); return ""; }
    return RAW.has(name) ? data[name] : clean(data[name]);
  });
  return { text: out, missing: [...missing] };
}

export type OrderSummary = {
  number: string; date: string; payment: string; name: string; address: string;
  items: { name: string; sku: string; collection: string; quantity: number; amount: number; image: string }[];
  subtotal: number; discount?: number; delivery: number; gst: number; total: number;
};

const SUMMARY_MARK = "@@ORDER_DETAILS@@";
const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "Arial,Helvetica,sans-serif";

export const SAMPLE_SUMMARY: OrderSummary = {
  number: "IB-1001", date: "5 Nov 2026", payment: "Visa ending 4242", name: "Sarah Smith", address: "1 Example Street, Brisbane QLD 4000",
  items: [
    { name: "Dark velvet Christmas tree bow", sku: "IVB-10001", collection: "Bordeaux Glamour", quantity: 1, amount: 49, image: `${SITE_URL}/email/collection-bordeaux-glamour.jpg` },
    { name: "Gold leaf glass bauble set", sku: "IVB-10002", collection: "Traditional", quantity: 2, amount: 179, image: `${SITE_URL}/email/collection-traditional.jpg` },
    { name: "Frosted pine tabletop tree", sku: "IVB-10003", collection: "Winter Wonderland", quantity: 1, amount: 89, image: `${SITE_URL}/email/collection-winter-wonderland.jpg` },
  ],
  subtotal: 317, delivery: 0, gst: 28.82, total: 317,
};

export function summaryHtml(o: OrderSummary) {
  const stat = (label: string, value: string) => `<td style="padding:12px 14px;font-family:${SANS};font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#6A6156">${label}<div style="padding-top:3px;font-family:${SERIF};font-size:13px;letter-spacing:0;text-transform:none;color:#2F2C27">${esc(value)}</div></td>`;
  const heading = (label: string, align = "left") => `<th align="${align}" style="padding:0 8px 7px 0;border-bottom:1px solid #C4A265;font-family:${SANS};font-size:10px;font-weight:400;letter-spacing:1px;text-transform:uppercase;color:#6A6156;white-space:nowrap">${label}</th>`;
  const cell = (content: string, align = "left", extra = "") => `<td align="${align}" valign="middle" style="padding:7px 8px 7px 0;border-bottom:1px solid #E0D8CC;font-family:${SANS};font-size:12px;line-height:1.3;color:#2F2C27;${extra}">${content}</td>`;
  const row = (i: OrderSummary["items"][number]) => `<tr>${cell(esc(i.sku), "left", "white-space:nowrap;color:#6A6156;font-size:11px")}${cell(`<table role="presentation" cellpadding="0" cellspacing="0"><tr>${i.image ? `<td width="46" valign="middle" style="padding-right:8px"><img src="${esc(i.image)}" width="38" height="38" alt="" style="display:block;width:38px;height:38px;object-fit:cover;border:0"></td>` : ""}<td valign="middle" style="font-family:${SERIF};font-size:12px;line-height:1.3;color:#2F2C27">${esc(i.name)}${i.collection ? `<div style="padding-top:2px;font-family:${SANS};font-size:11px;color:#6A6156">${esc(i.collection)}</div>` : ""}</td></tr></table>`)}${cell(String(i.quantity), "center")}${cell(money(i.amount), "right", "padding-right:0;white-space:nowrap")}</tr>`;
  const line = (label: string, value: string) => `<tr><td style="padding:4px 0;font-family:${SANS};font-size:13px;color:#2F2C27">${label}</td><td align="right" style="padding:4px 0;font-family:${SANS};font-size:13px;color:#2F2C27">${value}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3EEE5;margin:28px 0 14px"><tr>${stat("Order", o.number)}${stat("Date", o.date)}${stat("Paid", o.payment || "Card")}</tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px"><tr>${heading("Item code")}${heading("Description")}${heading("Qty", "center")}${heading("Amount", "right").replace("padding:0 8px 7px 0", "padding:0 0 7px")}</tr>${o.items.map(row).join("")}</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px"><tr><td width="42%"></td><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${line("Subtotal", money(o.subtotal))}${o.discount ? line("Discount", `-${money(o.discount)}`) : ""}${line("Delivery", o.delivery ? money(o.delivery) : "Free")}<tr><td colspan="2" style="padding:6px 0 4px"><div style="height:1px;background:#C4A265;font-size:0;line-height:0">&nbsp;</div></td></tr><tr><td style="padding:5px 0;font-family:${SERIF};font-size:17px;color:#2F2C27">Total paid</td><td align="right" style="padding:5px 0;font-family:${SERIF};font-size:17px;color:#2F2C27">${money(o.total)}</td></tr><tr><td colspan="2" align="right" style="font-family:${SANS};font-size:11px;color:#6A6156">Includes ${money(o.gst)} GST</td></tr></table></td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 22px;border-top:1px solid #E0D8CC"><tr><td valign="top" style="padding:18px 0 0;font-family:${SANS};font-size:13px;line-height:1.6;color:#2F2C27"><div style="padding-bottom:6px;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#6A6156">Delivering to</div>${esc(o.name)}<br>${esc(o.address)}</td></tr></table>`;
}

function summaryText(o: OrderSummary) {
  return [`Order ${o.number}, ${o.date}`, ...o.items.map((i) => `${i.quantity} x ${i.name}${i.sku ? ` (${i.sku})` : ""}, ${money(i.amount)}`), "", `Subtotal: ${money(o.subtotal)}`, ...(o.discount ? [`Discount: -${money(o.discount)}`] : []), `Delivery: ${o.delivery ? money(o.delivery) : "Free"}`, `Total paid: ${money(o.total)} (includes ${money(o.gst)} GST)`, "", `Delivering to: ${o.name}, ${o.address}`].join("\n");
}

export const summaryValue = { order_details: SUMMARY_MARK };

export function toText(body: string, summary?: OrderSummary | null) {
  if (summary) body = body.replace(SUMMARY_MARK, summaryText(summary));
  return plainLinks(body.replace(/\[([^\]]+)\]\(mailto:[^)\s]+\)/g, "$1")).replace(/^#{1,2} /gm, "");
}

function plainLinks(body: string) {
  return body.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1: $2");
}

function paragraph(block: string) {
  if (block.trim() === SUMMARY_MARK) return SUMMARY_MARK;
  if (block.startsWith("## ")) return `<h2 style="margin:28px 0 8px;font-family:${SANS};font-size:10px;font-weight:400;letter-spacing:1px;text-transform:uppercase;color:#6A6156">${esc(block.slice(3).trim())}</h2>`;
  if (block.startsWith("# ")) return `<h1 style="margin:0 0 14px;font-family:${SERIF};font-size:22px;font-weight:400;line-height:1.25;color:#2F2C27">${esc(block.slice(2).trim())}</h1>`;
  const button = block.trim().match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
  if (button) return `<p style="margin:26px 0 8px"><a href="${esc(button[2])}" style="display:inline-block;padding:13px 24px;background:#2F2C27;color:#ffffff;font-size:12px;letter-spacing:2px;text-decoration:none;text-transform:uppercase">${esc(button[1])}</a></p>`;
  const html = esc(block).replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^)\s]+)\)/g, '<a href="$2" style="color:#6B1F2B">$1</a>').replace(/\n/g, "<br>");
  return `<p style="margin:0 0 16px">${html}</p>`;
}

// Spam filters penalise very long HTML lines, so every tag starts on its own line.
export function renderEmail(draft: Pick<Draft, "message_class" | "preheader">, body: string, summary?: OrderSummary | null) {
  return emailHtml(draft, body, summary).replace(/></g, ">\n<");
}

function emailHtml(draft: Pick<Draft, "message_class" | "preheader">, body: string, summary?: OrderSummary | null) {
  const marketing = draft.message_class === "Marketing";
  let content = body.split(/\n\s*\n/).map(paragraph).join("");
  if (summary) content = content.replace(SUMMARY_MARK, summaryHtml(summary)).replace('<p style="margin:26px 0 8px">', '<p style="margin:30px 0 30px;text-align:center">');
  const link = (label: string, path: string) => `<a href="${SITE_URL}${path}" style="color:#E9E3D8;text-decoration:none">${label}</a>`;
  const nav = (label: string, path: string) => `<a href="${SITE_URL}${path}" style="display:inline-block;padding:2px 9px;color:#2F2C27;text-decoration:none">${label}</a>`;
  const tile = (name: string, slug: string) => `<td width="33.33%" valign="top" style="padding:0 5px"><a href="${SITE_URL}/collections/${slug}" style="color:#2F2C27;text-decoration:none"><img src="${SITE_URL}/email/collection-${slug}.jpg" width="170" alt="" style="display:block;width:100%;height:auto;border:0"><div style="padding-top:8px;font-family:Georgia,'Times New Roman',serif;font-size:13px;line-height:1.3;text-align:center">${name}</div></a></td>`;
  const collections = `<tr><td style="padding:0 27px 34px"><div style="padding-bottom:14px;font-family:Georgia,'Times New Roman',serif;font-size:15px;letter-spacing:3px;text-align:center;text-transform:uppercase;color:#2F2C27">Explore the collections</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${tile("Traditional", "traditional")}${tile("Bordeaux Glamour", "bordeaux-glamour")}${tile("Winter Wonderland", "winter-wonderland")}</tr></table></td></tr>`;
  const why = marketing ? "You're receiving this because you joined the Ivy &amp; Bough email list." : "You're receiving this email about your order or enquiry with Ivy &amp; Bough.";
  const unsubscribe = marketing ? ' &nbsp;&middot;&nbsp; <a href="{{{ pm:unsubscribe }}}" style="color:#C4A265">Unsubscribe</a>' : "";
  return `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F3EEE5">
<div style="display:none;max-height:0;overflow:hidden">${esc(draft.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3EEE5"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FBF8F2;border:1px solid #E0D8CC">
<tr><td style="padding:0;background:#2B2925;font-family:Georgia,'Times New Roman',serif;font-size:24px;letter-spacing:5px;line-height:1.4;color:#FBF8F2;text-align:center"><a href="${SITE_URL}" style="color:#FBF8F2;text-decoration:none"><img src="${SITE_URL}/email/header-banner.jpg" width="600" alt="Ivy &amp; Bough" style="display:block;width:100%;max-width:600px;height:auto;border:0"></a></td></tr>
<tr><td align="center" style="padding:13px 12px;border-bottom:1px solid #E0D8CC;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1.5px;text-transform:uppercase">${nav("Shop", "/shop")}${nav("Collections", "/collections")}${nav("The Christmas Edit", "/the-christmas-edit")}</td></tr>
<tr><td style="padding:44px 36px 36px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.65;color:#2F2C27">${content}</td></tr>${marketing ? collections : ""}
<tr><td align="center" style="padding:30px 28px 28px;background:#2B2925;font-family:Arial,Helvetica,sans-serif;color:#E9E3D8">
<div style="padding-bottom:18px"><img src="${SITE_URL}/email/wordmark-cream.png" width="130" alt="Ivy &amp; Bough" style="display:inline-block;width:130px;height:auto;border:0"></div>
<div style="padding-bottom:16px">${SOCIAL_LINKS.map((s) => `<a href="${s.url}" style="display:inline-block;padding:0 9px;text-decoration:none"><img src="${SITE_URL}/email/social-${s.id}.png" width="20" height="20" alt="${s.name}" style="display:inline-block;width:20px;height:20px;border:0"></a>`).join("")}</div>
<div style="font-size:12px;line-height:2;padding-bottom:16px">${link("Shop", "/shop")} &nbsp;&middot;&nbsp; ${link("Collections", "/collections")} &nbsp;&middot;&nbsp; ${link("The Christmas Edit", "/the-christmas-edit")}<br>${link("Delivery", "/delivery")} &nbsp;&middot;&nbsp; ${link("Returns", "/returns")} &nbsp;&middot;&nbsp; ${link("FAQs", "/faq")} &nbsp;&middot;&nbsp; ${link("Contact", "/contact")}</div>
<div style="height:1px;background:#4A463F;font-size:0;line-height:0">&nbsp;</div>
<div style="font-size:11px;line-height:1.7;color:#B9B1A4;padding-top:16px">${why}<br>Ivy &amp; Bough is a trading name of Aurella Group Pty Ltd, ABN 70 649 742 423.<br><a href="mailto:hello@ivyandbough.com" style="color:#C4A265">hello@ivyandbough.com</a> &nbsp;&middot;&nbsp; <a href="${SITE_URL}/privacy" style="color:#C4A265">Privacy Policy</a>${unsubscribe}</div>
</td></tr>
</table>
</td></tr></table></body></html>`;
}

export function smsSegments(text: string) {
  const unicode = /[^\n\r\x20-\x7E£¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ¡ÄÖÑÜ§¿äöñüà€]/.test(text);
  const single = unicode ? 70 : 160;
  const part = unicode ? 67 : 153;
  return text.length <= single ? 1 : Math.ceil(text.length / part);
}

async function orderData(db: Db, orderId: string) {
  const { data } = await db.from("orders").select("order_number,placed_on,paid_at,payment_intent_id,payment_method,customer_email,subtotal,discount_total,promo_code,total,shipping_total,gst_total,shipping_name,shipping_address,shipping_phone,customers(name,phone,customer_number),order_items(name,sku,quantity,unit_price,carrier,tracking_number,products(dispatch_days,themes(name),product_images(url,sort_order)))").eq("id", orderId).single();
  if (!data) return null;
  const order = data as unknown as { order_number: string; placed_on: string; paid_at: string | null; payment_intent_id: string | null; payment_method: string; customer_email: string; subtotal: number; discount_total: number; promo_code: string; total: number; shipping_total: number; gst_total: number; shipping_name: string; shipping_address: string; shipping_phone: string; customers: { name: string; phone: string; customer_number: string } | null; order_items: { name: string; sku: string; quantity: number; unit_price: number; carrier: string; tracking_number: string; products: { dispatch_days: number | null; themes: { name: string } | null; product_images: { url: string; sort_order: number }[] } | null }[] };
  const name = order.customers?.name || order.shipping_name || "";
  const dispatchDays = order.order_items.flatMap((i) => (i.products?.dispatch_days ? [i.products.dispatch_days] : []));
  const tracked = order.order_items.filter((i) => i.tracking_number).map((i) => {
    const link = trackingUrl(i.carrier, i.tracking_number);
    return `${clean(i.name)}: ${[clean(i.carrier), link ? `[track your parcel](${link})` : `tracking ${clean(i.tracking_number)}`].filter(Boolean).join(", ")}`;
  });
  return {
    email: order.customer_email,
    phone: order.shipping_phone || order.customers?.phone || "",
    summary: {
      number: order.order_number, date: new Date(order.paid_at ?? `${order.placed_on}T12:00:00`).toLocaleDateString("en-AU", { timeZone: "Australia/Brisbane", day: "numeric", month: "short", year: "numeric" }),
      payment: order.payment_method, name: order.shipping_name, address: order.shipping_address,
      items: order.order_items.map((i) => ({ name: i.name, sku: i.sku, collection: i.products?.themes?.name ?? "", quantity: i.quantity, amount: Number(i.unit_price) * i.quantity, image: [...(i.products?.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? "" })),
      subtotal: Number(order.subtotal), discount: Number(order.discount_total), delivery: Number(order.shipping_total), gst: Number(order.gst_total), total: Number(order.total),
    } as OrderSummary,
    invoice: {
      number: order.order_number, date: new Date(order.paid_at ?? `${order.placed_on}T12:00:00`).toLocaleDateString("en-AU", { timeZone: "Australia/Brisbane", day: "numeric", month: "long", year: "numeric" }),
      customerId: order.customers?.customer_number ?? "", transaction: order.payment_intent_id ?? "", paymentMethod: order.payment_method,
      billName: name, billEmail: order.customer_email, deliverName: order.shipping_name, deliverAddress: order.shipping_address,
      items: order.order_items.map((i) => ({ name: i.name, sku: i.sku, quantity: i.quantity, unitPrice: Number(i.unit_price) })),
      subtotal: Number(order.subtotal), discount: Number(order.discount_total), promoCode: order.promo_code, delivery: Number(order.shipping_total), gst: Number(order.gst_total), total: Number(order.total),
    } as InvoiceData,
    data: {
      first_name: name.split(" ")[0] || "there", customer_name: name || "there", order_number: order.order_number,
      items: order.order_items.map((i) => `${i.quantity} x ${i.name}, ${money(Number(i.unit_price) * i.quantity)}`).join("\n"),
      order_total: money(Number(order.total)), delivery_total: Number(order.shipping_total) ? money(Number(order.shipping_total)) : "Free", gst_total: money(Number(order.gst_total)),
      delivery_name: order.shipping_name, delivery_address: order.shipping_address,
      tracking: tracked.join("\n") || "You can check your order in your account.",
      dispatch_estimate: dispatchDays.length ? `Your order is usually dispatched within ${Math.max(...dispatchDays)} business ${Math.max(...dispatchDays) === 1 ? "day" : "days"}.` : "Dispatch times are shown on each product page.",
    } as Record<string, string>,
  };
}

async function blocked(db: Db, channel: Channel, address: string, messageClass: MessageClass, forOrder: boolean, consented = false) {
  const { data: stopped, error } = await db.from("message_suppressions").select("reason,scope").eq("channel", channel).eq("address", address).is("released_at", null);
  if (error) return `Could not check the unsubscribe list, so nothing was sent: ${error.message}`;
  const stop = (stopped ?? []).find((s) => s.scope === "All" || messageClass === "Marketing");
  if (stop) return `${address} is on the do-not-contact list (${stop.reason}).`;
  // consented: the customer asked for this one message when they signed up for the offer.
  if (messageClass === "Marketing" && !consented) {
    if (channel === "Email") {
      const { data } = await db.from("subscribers").select("id").ilike("email", address.replace(/[%_\\]/g, "\\$&")).not("confirmed_at", "is", null).limit(1);
      if (!data?.length) return `${address} hasn't confirmed a subscription, so marketing can't be sent to them.`;
    } else {
      const { data } = await db.from("message_consents").select("granted").eq("channel", "SMS").eq("address", address).eq("purpose", "Marketing").order("occurred_at", { ascending: false }).limit(1);
      if (!data?.[0]?.granted) return `${address} hasn't agreed to marketing texts.`;
    }
  }
  if (channel === "SMS" && messageClass === "Transactional" && forOrder) {
    const { data } = await db.from("message_consents").select("granted").eq("channel", "SMS").eq("address", address).eq("purpose", "Service").order("occurred_at", { ascending: false }).limit(1);
    if (!data?.[0]?.granted) return `${address} hasn't agreed to order updates by text.`;
  }
  return null;
}

type Attachment = { Name: string; Content: string; ContentType: string };

const SAMPLE_INVOICE: InvoiceData = { number: "IB-1001", date: "5 November 2026", customerId: "IBC-1001", transaction: "pi_3SampleTransaction000000", paymentMethod: "Visa ending 4242", billName: "Sarah Smith", billEmail: "sarah@example.com", deliverName: "Sarah Smith", deliverAddress: "1 Example Street, Brisbane QLD 4000", items: [{ name: "Dark velvet Christmas tree bow", quantity: 1, unitPrice: 49 }], subtotal: 49, delivery: 14.95, gst: 5.81, total: 63.95 };

const attachment = (data: InvoiceData, bytes: Uint8Array): Attachment[] => [{ Name: `Ivy-and-Bough-tax-invoice-${data.number}.pdf`, Content: Buffer.from(bytes).toString("base64"), ContentType: "application/pdf" }];

export async function generateReceipt(orderId: string, regenerate = false) {
  const db = admin();
  if (!db) throw new Error("SUPABASE_SECRET_KEY is not set.");
  const order = await orderData(db, orderId);
  if (!order) throw new Error("That order wasn't found.");
  return (await ensureReceipt(db, orderId, order.invoice, { regenerate })).path;
}

async function postmark(to: string, subject: string, html: string, text: string, marketing: boolean, attachments?: Attachment[]): Promise<{ id?: string; error?: string }> {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  if (!token) return { error: "Email isn't connected yet. POSTMARK_SERVER_TOKEN is not set." };
  try {
    const res = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "X-Postmark-Server-Token": token },
      body: JSON.stringify({ ...emailPayload(to, subject, html, text, marketing), ...(attachments?.length ? { Attachments: attachments } : {}) }),
    });
    const json = (await res.json().catch(() => ({}))) as { MessageID?: string; Message?: string };
    return res.ok ? { id: json.MessageID } : { error: json.Message ?? `Postmark returned ${res.status}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not reach Postmark." };
  }
}

const emailPayload = (to: string, subject: string, html: string, text: string, marketing: boolean) => ({
  From: FROM, ReplyTo: "hello@ivyandbough.com", To: to, Subject: subject, HtmlBody: html, TextBody: text,
  MessageStream: marketing ? BROADCAST_STREAM : "outbound", TrackOpens: marketing, TrackLinks: marketing ? "HtmlOnly" : "None",
});

const OPT_OUT = "Reply STOP to opt out.";
export const withOptOut = (text: string, marketing: boolean) => (marketing && !/reply stop/i.test(text) ? `${text.trim()} ${OPT_OUT}` : text);

async function twilio(to: string, body: string, opts: { marketing?: boolean; mediaUrl?: string } = {}): Promise<{ id?: string; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const service = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || (!service && !from)) return { error: "Texts aren't connected yet. The Twilio settings are not set." };
  const form = new URLSearchParams({ To: to, Body: body, StatusCallback: `${SITE_URL}/api/webhooks/twilio` });
  // Replies and pictures need a real Australian mobile number, not a sender name.
  const needsNumber = opts.marketing || Boolean(opts.mediaUrl);
  if (needsNumber && !from) return { error: "Marketing texts and MMS need an Australian Twilio mobile number. TWILIO_FROM_NUMBER is not set." };
  if (service && !needsNumber) form.set("MessagingServiceSid", service);
  else form.set("From", from!);
  if (opts.mediaUrl) form.set("MediaUrl", opts.mediaUrl);
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}` },
      body: form.toString(),
    });
    const json = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
    return res.ok ? { id: json.sid } : { error: json.message ?? `Twilio returned ${res.status}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not reach Twilio." };
  }
}

export async function getDraft(db: Db, slug: string) {
  const { data } = await db.from("message_templates").select("id,slug,channel,message_class,subject,preheader,body,media_url,is_active").eq("slug", slug).maybeSingle();
  return data as (Draft & { id: string; slug: string; is_active: boolean }) | null;
}

export async function sendMessage(opts: { slug?: string; draft?: Draft; to?: string; orderId?: string | null; isTest?: boolean; consented?: boolean; data?: Record<string, string> }): Promise<Result> {
  const db = admin();
  if (!db) return { ok: false, error: "SUPABASE_SECRET_KEY is not set." };
  const template = opts.slug ? await getDraft(db, opts.slug) : null;
  if (opts.slug && !template) return { ok: false, error: `There is no template called ${opts.slug}.` };
  if (template && !template.is_active && !opts.isTest) return { ok: false, error: `${opts.slug} is switched off.` };
  const draft = template ?? opts.draft;
  if (!draft) return { ok: false, error: "There's nothing to send." };

  const order = opts.orderId ? await orderData(db, opts.orderId) : null;
  if (opts.orderId && !order) return { ok: false, error: "That order wasn't found." };
  const to = normalise(draft.channel, opts.to || (draft.channel === "SMS" ? order?.phone : order?.email) || "");
  if (!to) return { ok: false, error: draft.channel === "SMS" ? "There's no valid mobile number for this message." : "There's no valid email address for this message." };

  const summary = order?.summary ?? (opts.isTest ? SAMPLE_SUMMARY : null);
  const values = { ...(opts.isTest ? SAMPLE : {}), ...links(), ...(order?.data ?? {}), ...(summary ? summaryValue : {}), ...(opts.data ?? {}) };
  const subject = merge(draft.subject, values);
  const preheader = merge(draft.preheader, values);
  const body = merge(draft.body, values);
  const missing = [...new Set([...subject.missing, ...preheader.missing, ...body.missing])];
  if (missing.length) return { ok: false, error: `This message needs ${missing.join(", ")}, which isn't available here.` };
  if (draft.channel === "Email" && !subject.text.trim()) return { ok: false, error: "This email needs a subject." };
  if (!body.text.trim()) return { ok: false, error: "This message has no content." };

  const log = { template_id: template?.id ?? null, template_slug: template?.slug ?? "", channel: draft.channel, message_class: draft.message_class, order_id: opts.orderId ?? null, to_address: to, subject: subject.text, body: toText(body.text, summary), is_test: Boolean(opts.isTest) };
  const stop = opts.isTest ? null : await blocked(db, draft.channel, to, draft.message_class, Boolean(opts.orderId), opts.consented);
  if (stop) {
    await db.from("message_sends").insert({ ...log, status: "Suppressed", error: stop });
    return { ok: false, error: stop };
  }

  const title = opts.isTest ? `[Test] ${subject.text}` : subject.text;
  let attachments: Attachment[] | undefined;
  if (template?.slug === "order-confirmation") {
    // The email still goes if the PDF can't be made. The order page shows it's missing.
    try {
      if (order && opts.orderId) attachments = attachment(order.invoice, (await ensureReceipt(db, opts.orderId, order.invoice)).bytes);
      else if (opts.isTest) attachments = attachment(SAMPLE_INVOICE, await buildPdf(SAMPLE_INVOICE));
    } catch (e) {
      console.error("Receipt could not be attached", opts.orderId, e);
    }
  }
  const marketing = draft.message_class === "Marketing";
  const plain = draft.channel === "SMS" ? withOptOut(toText(body.text, summary), marketing) : toText(body.text, summary);
  const sent = draft.channel === "SMS"
    ? await twilio(to, plain, { marketing, mediaUrl: draft.media_url || undefined })
    : await postmark(to, title, renderEmail({ message_class: draft.message_class, preheader: preheader.text }, body.text, summary), plain, draft.message_class === "Marketing", attachments);
  const { data: row, error } = await db.from("message_sends").insert({ ...log, status: sent.error ? "Failed" : "Sent", provider_id: sent.id ?? null, error: sent.error ?? null, segments: draft.channel === "SMS" ? smsSegments(plain) : null }).select("id").single();
  if (sent.error) return { ok: false, error: sent.error };
  if (attachments?.length && opts.orderId && !opts.isTest) await db.from("order_receipts").update({ emailed_at: new Date().toISOString(), emailed_to: to }).eq("order_id", opts.orderId);
  return { ok: true, id: row?.id ?? error?.message ?? "" };
}

// Latest choice per mobile wins, so an opt-out always beats an earlier opt-in.
export async function smsAudience(db: Db) {
  const [{ data: consents }, { data: stopped }] = await Promise.all([
    db.from("message_consents").select("address,granted").eq("channel", "SMS").eq("purpose", "Marketing").order("occurred_at", { ascending: false }).limit(50000),
    db.from("message_suppressions").select("address").eq("channel", "SMS").is("released_at", null).limit(50000),
  ]);
  const stop = new Set((stopped ?? []).map((s) => String(s.address)));
  const latest = new Map<string, boolean>();
  for (const row of consents ?? []) if (!latest.has(row.address)) latest.set(row.address, row.granted);
  return [...latest].filter(([address, granted]) => granted && !stop.has(address)).map(([address]) => address);
}

async function sendSmsCampaign(db: Db, template: Draft & { id: string; slug: string }) {
  const hour = Number(new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Brisbane", hour: "numeric", hour12: false }).format(new Date()));
  if (hour < 10 || hour >= 19) return { error: "Marketing texts can only be sent between 10am and 7pm Brisbane time, so they reach people in daytime hours across Australia." };
  const body = merge(template.body, links());
  if (body.missing.length) return { error: "Campaigns can't use customer or order fields yet." };
  if (/\[[^\]]+\](?!\()/.test(body.text)) return { error: "This message still has bracketed placeholder text." };
  if (!body.text.trim()) return { error: "This message has no content." };
  const plain = withOptOut(toText(body.text), true);
  const list = await smsAudience(db);
  const campaignId = crypto.randomUUID();
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < list.length; i += 5) {
    const part = list.slice(i, i + 5);
    const results = await Promise.all(part.map((to) => twilio(to, plain, { marketing: true, mediaUrl: template.media_url || undefined })));
    await db.from("message_sends").insert(part.map((to, n) => {
      const error = results[n].error;
      if (error) failed += 1; else sent += 1;
      return { template_id: template.id, template_slug: template.slug, channel: "SMS", message_class: "Marketing", campaign_id: campaignId, to_address: to, body: plain, media_url: template.media_url ?? "", status: error ? "Failed" : "Sent", provider_id: results[n].id ?? null, error: error ?? null, segments: smsSegments(plain) };
    }));
  }
  return { sent, failed };
}

export async function sendCampaign(templateId: string) {
  const db = admin();
  if (!db) return { error: "SUPABASE_SECRET_KEY is not set." };
  const token = process.env.POSTMARK_SERVER_TOKEN ?? "";
  const { data: template } = await db.from("message_templates").select("id,slug,channel,message_class,subject,preheader,body,media_url,is_active").eq("id", templateId).maybeSingle();
  if (!template || template.message_class !== "Marketing") return { error: "Choose a marketing template." };
  if (template.channel === "SMS") return sendSmsCampaign(db, template as Draft & { id: string; slug: string });
  if (!token) return { error: "Email isn't connected yet. POSTMARK_SERVER_TOKEN is not set." };
  const subject = merge(template.subject, links());
  const preheader = merge(template.preheader, links());
  const body = merge(template.body, links());
  if ([...subject.missing, ...preheader.missing, ...body.missing].length) return { error: "Campaigns can't use customer or order fields yet." };
  if (/\[[^\]]+\](?!\()/.test(body.text)) return { error: "This email still has bracketed placeholder text." };
  if (!subject.text.trim() || !body.text.trim()) return { error: "This email needs a subject and content." };

  const [{ data: people }, { data: stopped }] = await Promise.all([
    db.from("subscribers").select("email").not("confirmed_at", "is", null).limit(50000),
    db.from("message_suppressions").select("address").eq("channel", "Email").is("released_at", null).limit(50000),
  ]);
  const stop = new Set((stopped ?? []).map((s) => String(s.address).toLowerCase()));
  const list = [...new Set((people ?? []).map((p) => String(p.email).toLowerCase()))].filter((e) => !stop.has(e) && normalise("Email", e));
  const html = renderEmail({ message_class: "Marketing", preheader: preheader.text }, body.text);
  const plain = `${toText(body.text)}\n\nUnsubscribe: {{{ pm:unsubscribe }}}`;
  const campaignId = crypto.randomUUID();
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < list.length; i += 500) {
    const part = list.slice(i, i + 500);
    let replies: { MessageID?: string; ErrorCode?: number; Message?: string }[] = [];
    let problem = "";
    try {
      const res = await fetch("https://api.postmarkapp.com/email/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "X-Postmark-Server-Token": token },
        body: JSON.stringify(part.map((to) => emailPayload(to, subject.text, html, plain, true))),
      });
      const json = (await res.json().catch(() => null)) as typeof replies | { Message?: string } | null;
      if (Array.isArray(json)) replies = json;
      else problem = json?.Message ?? `Postmark returned ${res.status}`;
    } catch (e) {
      problem = e instanceof Error ? e.message : "Could not reach Postmark.";
    }
    const rows = part.map((to, n) => {
      const reply = replies[n];
      const error = problem || (reply?.ErrorCode ? reply.Message ?? "Postmark refused this address." : "");
      if (error) failed += 1; else sent += 1;
      return { template_id: template.id, template_slug: template.slug, channel: "Email", message_class: "Marketing", campaign_id: campaignId, to_address: to, subject: subject.text, status: error ? "Failed" : "Sent", provider_id: reply?.MessageID ?? null, error: error || null };
    });
    await db.from("message_sends").insert(rows);
  }
  return { sent, failed };
}

export async function requireAdmin(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return null;
  const db = createClient(url, key, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const [{ data: user }, { data: allowed }] = await Promise.all([db.auth.getUser(token), db.rpc("is_portal_admin")]);
  return allowed === true ? user.user : null;
}
