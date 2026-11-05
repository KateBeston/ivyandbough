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
  first_name: "Sarah", customer_name: "Sarah Smith", order_number: "IB-1001", items: "1 x Dark velvet Christmas tree bow, $49.00", order_total: "$63.95", delivery_total: "$14.95", gst_total: "$5.81",
  delivery_name: "Sarah Smith", delivery_address: "1 Example Street, Brisbane QLD 4000", tracking: "Dark velvet Christmas tree bow: Australia Post, [track your parcel](https://auspost.com.au/mypost/track/#/details/123456789)", details: "$63.95",
  basket_items: "1 x [Dark velvet Christmas tree bow](https://ivy-and-bough.vercel.app/shop)",
};

const links = () => ({ site_url: SITE_URL, account_url: `${SITE_URL}/account` });

// These two are built here from cleaned values, because they contain links.
const RAW = new Set(["tracking", "basket_items"]);

export function merge(text: string, data: Record<string, string>) {
  const missing = new Set<string>();
  const out = text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, name: string) => {
    if (data[name] === undefined) { missing.add(name); return ""; }
    return RAW.has(name) ? data[name] : clean(data[name]);
  });
  return { text: out, missing: [...missing] };
}

export function toText(body: string) {
  return body.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1: $2");
}

function paragraph(block: string) {
  const button = block.trim().match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
  if (button) return `<p style="margin:26px 0 8px"><a href="${esc(button[2])}" style="display:inline-block;padding:13px 24px;background:#2F2C27;color:#ffffff;font-size:12px;letter-spacing:2px;text-decoration:none;text-transform:uppercase">${esc(button[1])}</a></p>`;
  const html = esc(block).replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" style="color:#6B1F2B">$1</a>').replace(/\n/g, "<br>");
  return `<p style="margin:0 0 16px">${html}</p>`;
}

export function renderEmail(draft: Pick<Draft, "message_class" | "preheader">, body: string) {
  const marketing = draft.message_class === "Marketing";
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
<tr><td style="padding:28px 32px 30px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#2F2C27">${body.split(/\n\s*\n/).map(paragraph).join("")}</td></tr>${marketing ? collections : ""}
<tr><td align="center" style="padding:30px 28px 28px;background:#2B2925;font-family:Arial,Helvetica,sans-serif;color:#E9E3D8">
<div style="padding-bottom:18px"><img src="${SITE_URL}/email/wordmark-cream.png" width="130" alt="Ivy &amp; Bough" style="display:inline-block;width:130px;height:auto;border:0"></div>
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
  const { data } = await db.from("orders").select("order_number,placed_on,paid_at,payment_intent_id,payment_method,customer_email,subtotal,total,shipping_total,gst_total,shipping_name,shipping_address,customers(name,phone,customer_number),order_items(name,quantity,unit_price,carrier,tracking_number)").eq("id", orderId).single();
  if (!data) return null;
  const order = data as unknown as { order_number: string; placed_on: string; paid_at: string | null; payment_intent_id: string | null; payment_method: string; customer_email: string; subtotal: number; total: number; shipping_total: number; gst_total: number; shipping_name: string; shipping_address: string; customers: { name: string; phone: string; customer_number: string } | null; order_items: { name: string; quantity: number; unit_price: number; carrier: string; tracking_number: string }[] };
  const name = order.customers?.name || order.shipping_name || "";
  const tracked = order.order_items.filter((i) => i.tracking_number).map((i) => {
    const link = trackingUrl(i.carrier, i.tracking_number);
    return `${clean(i.name)}: ${[clean(i.carrier), link ? `[track your parcel](${link})` : `tracking ${clean(i.tracking_number)}`].filter(Boolean).join(", ")}`;
  });
  return {
    email: order.customer_email,
    phone: order.customers?.phone ?? "",
    invoice: {
      number: order.order_number, date: new Date(order.paid_at ?? `${order.placed_on}T12:00:00`).toLocaleDateString("en-AU", { timeZone: "Australia/Brisbane", day: "numeric", month: "long", year: "numeric" }),
      customerId: order.customers?.customer_number ?? "", transaction: order.payment_intent_id ?? "", paymentMethod: order.payment_method,
      billName: name, billEmail: order.customer_email, deliverName: order.shipping_name, deliverAddress: order.shipping_address,
      items: order.order_items.map((i) => ({ name: i.name, quantity: i.quantity, unitPrice: Number(i.unit_price) })),
      subtotal: Number(order.subtotal), delivery: Number(order.shipping_total), gst: Number(order.gst_total), total: Number(order.total),
    } as InvoiceData,
    data: {
      first_name: name.split(" ")[0] || "there", customer_name: name || "there", order_number: order.order_number,
      items: order.order_items.map((i) => `${i.quantity} x ${i.name}, ${money(Number(i.unit_price) * i.quantity)}`).join("\n"),
      order_total: money(Number(order.total)), delivery_total: Number(order.shipping_total) ? money(Number(order.shipping_total)) : "Free", gst_total: money(Number(order.gst_total)),
      delivery_name: order.shipping_name, delivery_address: order.shipping_address,
      tracking: tracked.join("\n") || "You can check your order in your account.",
    } as Record<string, string>,
  };
}

async function blocked(db: Db, channel: Channel, address: string, messageClass: MessageClass, forOrder: boolean) {
  const { data: stopped, error } = await db.from("message_suppressions").select("reason,scope").eq("channel", channel).eq("address", address).is("released_at", null);
  if (error) return `Could not check the unsubscribe list, so nothing was sent: ${error.message}`;
  const stop = (stopped ?? []).find((s) => s.scope === "All" || messageClass === "Marketing");
  if (stop) return `${address} is on the do-not-contact list (${stop.reason}).`;
  if (messageClass === "Marketing") {
    if (channel === "Email") {
      const { data } = await db.from("subscribers").select("id").ilike("email", address.replace(/[%_\\]/g, "\\$&")).limit(1);
      if (!data?.length) return `${address} hasn't subscribed, so marketing can't be sent to them.`;
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

export async function sendMessage(opts: { slug?: string; draft?: Draft; to?: string; orderId?: string | null; isTest?: boolean; data?: Record<string, string> }): Promise<Result> {
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

  const values = { ...(opts.isTest ? SAMPLE : {}), ...links(), ...(order?.data ?? {}), ...(opts.data ?? {}) };
  const subject = merge(draft.subject, values);
  const preheader = merge(draft.preheader, values);
  const body = merge(draft.body, values);
  const missing = [...new Set([...subject.missing, ...preheader.missing, ...body.missing])];
  if (missing.length) return { ok: false, error: `This message needs ${missing.join(", ")}, which isn't available here.` };
  if (draft.channel === "Email" && !subject.text.trim()) return { ok: false, error: "This email needs a subject." };
  if (!body.text.trim()) return { ok: false, error: "This message has no content." };

  const log = { template_id: template?.id ?? null, template_slug: template?.slug ?? "", channel: draft.channel, message_class: draft.message_class, order_id: opts.orderId ?? null, to_address: to, subject: subject.text, body: toText(body.text), is_test: Boolean(opts.isTest) };
  const stop = opts.isTest ? null : await blocked(db, draft.channel, to, draft.message_class, Boolean(opts.orderId));
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
  const plain = draft.channel === "SMS" ? withOptOut(toText(body.text), marketing) : toText(body.text);
  const sent = draft.channel === "SMS"
    ? await twilio(to, plain, { marketing, mediaUrl: draft.media_url || undefined })
    : await postmark(to, title, renderEmail({ message_class: draft.message_class, preheader: preheader.text }, body.text), plain, draft.message_class === "Marketing", attachments);
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
    db.from("subscribers").select("email").limit(50000),
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
