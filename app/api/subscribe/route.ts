import { NextResponse } from "next/server";
import { allowed } from "@/lib/limits";
import { startSubscription } from "@/lib/subscribe";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) return NextResponse.json({ ok: false }, { status: 400 });
  if (!(await allowed(request, "subscribe", 5, 3600))) return NextResponse.json({ ok: false }, { status: 429 });
  const ok = await startSubscription(email, "Website");
  return NextResponse.json({ ok }, { status: ok ? 200 : 500 });
}
