import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/comms";

export async function GET(request: Request) {
  if (!(await requireAdmin(request))) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  return NextResponse.json({
    email: Boolean(process.env.POSTMARK_SERVER_TOKEN),
    tracking: Boolean(process.env.POSTMARK_WEBHOOK_SECRET),
    twoWay: Boolean(process.env.TWILIO_FROM_NUMBER),
    sms: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && (process.env.TWILIO_MESSAGING_SERVICE_SID || process.env.TWILIO_FROM_NUMBER)),
  });
}
