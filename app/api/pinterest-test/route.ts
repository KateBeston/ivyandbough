import { NextResponse } from "next/server";
import { pinterestCheckout } from "@/lib/pinterest-capi";

// Temporary: sends one Pinterest test event (?test=true, not recorded). Stops working after 18 Nov 2026 and will be removed.
export const dynamic = "force-dynamic";
export async function GET() {
  if (Date.now() > Date.parse("2026-11-18T00:00:00Z")) return NextResponse.json({ error: "expired" }, { status: 410 });
  try {
    const result = await pinterestCheckout({ test: true, eventId: `test-${Date.now()}`, orderId: "TEST-ORDER", email: "test@ivyandbough.com", ip: "203.0.113.10", ua: "Mozilla/5.0 (test)", value: 49.95, lines: [{ id: "IVB-TEST", name: "Test item", price: 49.95, quantity: 1 }] });
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}
