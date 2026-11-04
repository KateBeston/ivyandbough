import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/comms";
import { admin } from "@/lib/server";

export async function POST(request: Request) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  const db = admin();
  if (!token || !db) return NextResponse.json({ ok: false }, { status: 503 });
  const params = [...new URLSearchParams(await request.text()).entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const signed = `${SITE_URL}/api/webhooks/twilio${params.map(([k, v]) => k + v).join("")}`;
  const expected = Buffer.from(createHmac("sha1", token).update(signed).digest("base64"));
  const given = Buffer.from(request.headers.get("x-twilio-signature") ?? "");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return NextResponse.json({ ok: false }, { status: 401 });

  const value = Object.fromEntries(params);
  const id = value.MessageSid;
  if (id && value.MessageStatus === "delivered") await db.from("message_sends").update({ status: "Delivered", delivered_at: new Date().toISOString() }).eq("provider_id", id);
  if (id && (value.MessageStatus === "failed" || value.MessageStatus === "undelivered")) await db.from("message_sends").update({ status: "Failed", error: `Twilio ${value.MessageStatus}${value.ErrorCode ? `, error ${value.ErrorCode}` : ""}` }).eq("provider_id", id);
  return NextResponse.json({ ok: true });
}
