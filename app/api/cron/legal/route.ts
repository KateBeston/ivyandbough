import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { snapshotLegalPages } from "@/lib/legal-register";

export const maxDuration = 60;

function authorised(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return Boolean(secret) && given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  if (!authorised(request)) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ added: await snapshotLegalPages() });
}
