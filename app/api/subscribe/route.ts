import { NextResponse } from "next/server";
import { isHuman } from "@/lib/guard";
import { allowed } from "@/lib/limits";
import { startSubscription } from "@/lib/subscribe";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  // Hidden field: only bots fill it in, so accept quietly and store nothing.
  if (body?.company) return NextResponse.json({ ok: true });
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) return NextResponse.json({ ok: false }, { status: 400 });
  if (!(await allowed(request, "subscribe", 5, 3600))) return NextResponse.json({ ok: false }, { status: 429 });
  if (!(await isHuman(body?.token, request))) return NextResponse.json({ ok: false }, { status: 403 });
  const ok = await startSubscription(email, body?.source === "popup" ? "Welcome popup" : "Website");
  return NextResponse.json({ ok }, { status: ok ? 200 : 500 });
}
