import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { admin } from "@/lib/server";
import { registerPending } from "@/lib/aftership";

export const maxDuration = 60;

function authorised(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return Boolean(secret) && given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  if (!authorised(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const db = admin();
  if (!db) return NextResponse.json({ ok: false }, { status: 503 });
  // Picks up any parcels the portal couldn't register straight away.
  const results = await registerPending(db);
  return NextResponse.json({ tried: results.length, registered: results.filter((r) => r.ok).length });
}
