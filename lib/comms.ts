import { createClient } from "@supabase/supabase-js";
import { admin } from "./server";
import { key, url } from "./supabase";

// Every email and text leaves through this file, so the unsubscribe check,
// the send and the log cannot be skipped. Provider keys stay on the server.

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ivy-and-bough.vercel.app";
const FROM = "Ivy & Bough <hello@ivyandbough.com>";
const BROADCAST_STREAM = process.env.POSTMARK_BROADCAST_STREAM ?? "broadcast";

export type Channel = "Email" | "SMS";
export type MessageClass = "Transactional" | "Marketing";
export type Draft = { channel: Channel; message_class: MessageClass; subject: string; preheader: string; body: string };
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
  delivery_name: "Sarah Smith", delivery_address: "1 Example Street, Brisbane QLD 4000", tracking: "Dark velvet Christmas tree bow: Australia Post, tracking 123456789",
};

const links = () => ({ site_url: SITE_URL, account_url: `${SITE_URL}/account` });

export function merge(text: string, data: Record<string, string>) {
  const missing = new Set<string>();
  const out = text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, name: string) => {
    if (data[name] === undefined) { missing.add(name); return ""; }
    return clean(data[name]);
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
<div style="font-family:Georgia,'Times New Roman',serif;font-size:17px;letter-spacing:4px;padding-bottom:16px">IVY &amp; BOUGH</div>
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
  const { data } = await db.from("orders").select("order_number,customer_email,total,shipping_total,gst_total,shipping_name,shipping_address,customers(name,phone),order_items(name,quantity,unit_price,carrier,tracking_number)").eq("id", orderId).single();
  if (!data) return null;
  const order = data as unknown as { order_number: string; customer_email: string; total: number; shipping_total: number; gst_total: number; shipping_name: string; shipping_address: string; customers: { name: string; phone: string } | null; order_items: { name: string; quantity: number; unit_price: number; carrier: string; tracking_number: string }[] };
  const name = order.customers?.name || order.shipping_name || "";
  const tracked = order.order_items.filter((i) => i.tracking_number).map((i) => `${i.name}: ${[i.carrier, `tracking ${i.tracking_number}`].filter(Boolean).join(", ")}`);
  return {
    email: order.customer_email,
    phone: order.customers?.phone ?? "",
    data: {
      first_name: name.split(" ")[0] || "there", customer_name: name || "there", order_number: order.order_number,
      items: order.order_items.map((i) => `${i.quantity} x ${i.name}, ${money(Number(i.unit_price) * i.quantity)}`).join("\n"),
      order_total: money(Number(order.total)), delivery_total: Number(order.shipping_total) ? money(Number(order.shipping_total)) : "Free", gst_total: money(Number(order.gst_total)),
      delivery_name: order.shipping_name, delivery_address: order.shipping_address,
      tracking: tracked.join("\n") || "You can check your order in your account.",
    } as Record<string, string>,
  };
}

async function blocked(db: Db, channel: Channel, address: string, messageClass: MessageClass) {
  const { data: stopped, error } = await db.from("message_suppressions").select("reason,scope").eq("channel", channel).eq("address", address).is("released_at", null);
  if (error) return `Could not check the unsubscribe list, so nothing was sent: ${error.message}`;
  const stop = (stopped ?? []).find((s) => s.scope === "All" || messageClass === "Marketing");
  if (stop) return `${address} is on the do-not-contact list (${stop.reason}).`;
  if (messageClass === "Marketing") {
    if (channel === "Email") {
      const { data } = await db.from("subscribers").select("id").ilike("email", address.replace(/[%_\\]/g, "\\$&")).limit(1);
      if (!data?.length) return `${address} hasn't subscribed, so marketing can't be sent to them.`;
    } else {
      const { data } = await db.from("message_consents").select("granted").eq("channel", "SMS").eq("address", address).order("occurred_at", { ascending: false }).limit(1);
      if (!data?.[0]?.granted) return `${address} hasn't agreed to marketing texts.`;
    }
  }
  return null;
}

async function postmark(to: string, subject: string, html: string, text: string, marketing: boolean): Promise<{ id?: string; error?: string }> {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  if (!token) return { error: "Email isn't connected yet. POSTMARK_SERVER_TOKEN is not set." };
  try {
    const res = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "X-Postmark-Server-Token": token },
      body: JSON.stringify(emailPayload(to, subject, html, text, marketing)),
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

async function twilio(to: string, body: string): Promise<{ id?: string; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const service = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || (!service && !from)) return { error: "Texts aren't connected yet. The Twilio settings are not set." };
  const form = new URLSearchParams({ To: to, Body: body, StatusCallback: `${SITE_URL}/api/webhooks/twilio` });
  if (service) form.set("MessagingServiceSid", service);
  else form.set("From", from!);
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
  const { data } = await db.from("message_templates").select("id,slug,channel,message_class,subject,preheader,body,is_active").eq("slug", slug).maybeSingle();
  return data as (Draft & { id: string; slug: string; is_active: boolean }) | null;
}

export async function sendMessage(opts: { slug?: string; draft?: Draft; to?: string; orderId?: string | null; isTest?: boolean }): Promise<Result> {
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

  const values = { ...(opts.isTest ? SAMPLE : {}), ...links(), ...(order?.data ?? {}) };
  const subject = merge(draft.subject, values);
  const preheader = merge(draft.preheader, values);
  const body = merge(draft.body, values);
  const missing = [...new Set([...subject.missing, ...preheader.missing, ...body.missing])];
  if (missing.length) return { ok: false, error: `This message needs ${missing.join(", ")}, which isn't available here.` };
  if (draft.channel === "Email" && !subject.text.trim()) return { ok: false, error: "This email needs a subject." };
  if (!body.text.trim()) return { ok: false, error: "This message has no content." };

  const log = { template_id: template?.id ?? null, template_slug: template?.slug ?? "", channel: draft.channel, message_class: draft.message_class, order_id: opts.orderId ?? null, to_address: to, subject: subject.text, body: toText(body.text), is_test: Boolean(opts.isTest) };
  const stop = opts.isTest ? null : await blocked(db, draft.channel, to, draft.message_class);
  if (stop) {
    await db.from("message_sends").insert({ ...log, status: "Suppressed", error: stop });
    return { ok: false, error: stop };
  }

  const title = opts.isTest ? `[Test] ${subject.text}` : subject.text;
  const plain = toText(body.text);
  const sent = draft.channel === "SMS"
    ? await twilio(to, plain)
    : await postmark(to, title, renderEmail({ message_class: draft.message_class, preheader: preheader.text }, body.text), plain, draft.message_class === "Marketing");
  const { data: row, error } = await db.from("message_sends").insert({ ...log, status: sent.error ? "Failed" : "Sent", provider_id: sent.id ?? null, error: sent.error ?? null, segments: draft.channel === "SMS" ? smsSegments(plain) : null }).select("id").single();
  if (sent.error) return { ok: false, error: sent.error };
  return { ok: true, id: row?.id ?? error?.message ?? "" };
}

export async function sendCampaign(templateId: string) {
  const db = admin();
  const token = process.env.POSTMARK_SERVER_TOKEN;
  if (!db) return { error: "SUPABASE_SECRET_KEY is not set." };
  if (!token) return { error: "Email isn't connected yet. POSTMARK_SERVER_TOKEN is not set." };
  const { data: template } = await db.from("message_templates").select("id,slug,channel,message_class,subject,preheader,body,is_active").eq("id", templateId).maybeSingle();
  if (!template || template.channel !== "Email" || template.message_class !== "Marketing") return { error: "Choose a marketing email template." };
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
