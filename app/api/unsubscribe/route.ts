import { NextResponse } from "next/server";
import { isHuman } from "@/lib/guard";
import { allowed } from "@/lib/limits";
import { startUnsubscribe } from "@/lib/subscribe";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (body?.company) return NextResponse.json({ ok: true });
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) return NextResponse.json({ ok: false }, { status: 400 });
  if (!(await allowed(request, "unsubscribe", 5, 3600))) return NextResponse.json({ ok: false }, { status: 429 });
  if (!(await isHuman(body?.token, request))) return NextResponse.json({ ok: false }, { status: 403 });
  await startUnsubscribe(email).catch(() => null);
  return NextResponse.json({ ok: true });
}
