import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/comms";
import { admin } from "@/lib/server";
import { verifiedTwilio } from "@/lib/twilio";

const STOP = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT", "OPTOUT"]);
const START = new Set(["START", "UNSTOP", "YES"]);

const xml = (reply: string) => new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response>${reply ? `<Message>${reply}</Message>` : ""}</Response>`, { headers: { "Content-Type": "text/xml" } });

export async function POST(request: Request) {
  const db = admin();
  const value = await verifiedTwilio(request, `${SITE_URL}/api/webhooks/twilio-inbound`);
  if (!value || !db) return NextResponse.json({ ok: false }, { status: 401 });

  const from = value.From ?? "";
  const body = (value.Body ?? "").trim();
  const word = body.toUpperCase().replace(/[^A-Z]/g, "");
  const now = new Date().toISOString();
  const twilioReplied = Boolean(value.OptOutType); // Twilio sends its own reply when it handles the keyword.

  if (STOP.has(word)) {
    await db.from("message_suppressions").upsert({ channel: "SMS", address: from, reason: "Unsubscribed", scope: "All", source: "Reply STOP", suppressed_at: now, released_at: null }, { onConflict: "channel,address,reason" });
    await db.from("message_consents").insert([{ channel: "SMS", address: from, granted: false, purpose: "Marketing", source: "Reply STOP" }, { channel: "SMS", address: from, granted: false, purpose: "Service", source: "Reply STOP" }]);
    return xml(twilioReplied ? "" : "Ivy &amp; Bough: You have been unsubscribed and will receive no more texts. Reply START to opt back in.");
  }
  if (START.has(word)) {
    await db.from("message_suppressions").update({ released_at: now }).eq("channel", "SMS").eq("address", from).eq("reason", "Unsubscribed");
    await db.from("message_consents").insert([{ channel: "SMS", address: from, granted: true, purpose: "Marketing", source: "Reply START" }, { channel: "SMS", address: from, granted: true, purpose: "Service", source: "Reply START" }]);
    return xml(twilioReplied ? "" : "Ivy &amp; Bough: You are subscribed to texts again. Reply STOP to opt out.");
  }
  if (word === "HELP" || word === "INFO") return xml(twilioReplied ? "" : "Ivy &amp; Bough: Email hello@ivyandbough.com for help. Reply STOP to opt out.");

  // Match the number to a customer so the text shows under their name.
  const local = from.replace(/^\+61/, "0");
  const { data: known } = await db.from("customers").select("name,email").or(`phone.eq.${from},phone.eq.${local}`).limit(1).maybeSingle();
  await db.from("contact_messages").insert({ name: known?.name ? `${known.name} (text)` : `Text from ${from}`, email: known?.email ?? "", phone: from, source: "SMS", topic: "Text message", message: body.slice(0, 2000) });
  return xml("");
}
