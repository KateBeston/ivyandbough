import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { admin } from "@/lib/server";

function authorised(request: Request) {
  const secret = process.env.POSTMARK_WEBHOOK_SECRET?.trim();
  const header = request.headers.get("authorization") ?? "";
  const decoded = header.startsWith("Basic ") ? Buffer.from(header.slice(6), "base64").toString("utf8") : "";
  const given = Buffer.from(decoded.slice(decoded.indexOf(":") + 1).trim());
  const expected = Buffer.from(secret ?? "");
  const match = Boolean(secret) && given.length === expected.length && timingSafeEqual(given, expected);
  // Lengths only, so a failed connection can be diagnosed without logging the password.
  if (!match) console.warn("Postmark webhook refused", { secretSet: Boolean(secret), basicAuthSent: header.startsWith("Basic "), givenLength: given.length, expectedLength: expected.length });
  return match;
}

const HARD = new Set(["HardBounce", "BadEmailAddress", "ManuallyDeactivated", "SpamNotification", "Blocked"]);

export async function POST(request: Request) {
  if (!authorised(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const event = (await request.json().catch(() => null)) as Record<string, string & boolean> | null;
  const db = admin();
  if (!event || !db) return NextResponse.json({ ok: false }, { status: 400 });

  const type = String(event.RecordType ?? "");
  const id = event.MessageID;
  const email = String(event.Recipient ?? event.Email ?? "").toLowerCase();
  const at = event.DeliveredAt ?? event.BouncedAt ?? event.ReceivedAt ?? event.ChangedAt ?? new Date().toISOString();
  const stop = (reason: string, scope: string) => db.from("message_suppressions").upsert({ channel: "Email", address: email, reason, scope, source: "Postmark", suppressed_at: at, released_at: null }, { onConflict: "channel,address,reason" });

  if (id) {
    if (type === "Delivery") {
      await db.from("message_sends").update({ delivered_at: at }).eq("provider_id", id);
      await db.from("message_sends").update({ status: "Delivered" }).eq("provider_id", id).eq("status", "Sent");
    }
    if (type === "Open") await db.from("message_sends").update({ opened_at: at }).eq("provider_id", id);
    if (type === "Click") await db.from("message_sends").update({ clicked_at: at }).eq("provider_id", id);
    if (type === "Bounce") await db.from("message_sends").update({ status: "Bounced", bounced_at: at, bounce_type: String(event.Type ?? ""), error: String(event.Description ?? "") }).eq("provider_id", id);
    if (type === "SpamComplaint") await db.from("message_sends").update({ status: "Complained", complained_at: at }).eq("provider_id", id);
  }
  if (email) {
    if (type === "Bounce" && HARD.has(String(event.Type))) await stop("Hard bounce", "All");
    if (type === "SpamComplaint") await stop("Spam complaint", "All");
    if (type === "SubscriptionChange") {
      if (event.SuppressSending) await stop("Unsubscribed", "Marketing");
      else await db.from("message_suppressions").update({ released_at: at }).eq("channel", "Email").eq("address", email).eq("reason", "Unsubscribed");
    }
  }
  return NextResponse.json({ ok: true });
}
