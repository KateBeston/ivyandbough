import { NextResponse } from "next/server";

// Records why something failed in a shopper's browser (e.g. the Stripe payment window), so it shows in the logs.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const clip = (v: unknown, n: number) => String(v ?? "").slice(0, n);
  console.error("Client error", JSON.stringify({ where: clip(body?.where, 40), reason: clip(body?.reason, 300), ua: clip(body?.ua, 200) }));
  return NextResponse.json({ ok: true });
}
