import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/comms";
import { admin } from "@/lib/server";
import { verifiedTwilio } from "@/lib/twilio";

export async function POST(request: Request) {
  const db = admin();
  const value = await verifiedTwilio(request, `${SITE_URL}/api/webhooks/twilio`);
  if (!value || !db) return NextResponse.json({ ok: false }, { status: 401 });
  const id = value.MessageSid;
  if (id && value.MessageStatus === "delivered") await db.from("message_sends").update({ status: "Delivered", delivered_at: new Date().toISOString() }).eq("provider_id", id);
  if (id && (value.MessageStatus === "failed" || value.MessageStatus === "undelivered")) await db.from("message_sends").update({ status: "Failed", error: `Twilio ${value.MessageStatus}${value.ErrorCode ? `, error ${value.ErrorCode}` : ""}` }).eq("provider_id", id);
  return NextResponse.json({ ok: true });
}
