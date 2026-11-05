import { NextResponse } from "next/server";
import { allowed } from "@/lib/limits";
import { admin } from "@/lib/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  // Hidden field: only bots fill it in, so accept quietly and store nothing.
  if (body?.company) return NextResponse.json({ ok: true });
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!name || name.length > 120 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254 || !message || message.length > 4000) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!(await allowed(request, "contact", 5, 3600))) return NextResponse.json({ ok: false }, { status: 429 });
  const db = admin();
  const { error } = db ? await db.from("contact_messages").insert({ name, email, message }) : { error: true };
  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true });
}
