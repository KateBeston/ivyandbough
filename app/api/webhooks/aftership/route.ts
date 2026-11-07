import { NextResponse } from "next/server";
import { applyUpdate, verifiedAftership } from "@/lib/aftership";
import { admin } from "@/lib/server";

export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifiedAftership(raw, request.headers.get("aftership-hmac-sha256"))) return NextResponse.json({ ok: false }, { status: 401 });
  const db = admin();
  if (!db) return NextResponse.json({ ok: false }, { status: 503 });
  const body = JSON.parse(raw || "{}");
  const tracking = body?.msg ?? body?.data?.tracking ?? body?.data;
  if (tracking) await applyUpdate(db, tracking);
  return NextResponse.json({ ok: true });
}
