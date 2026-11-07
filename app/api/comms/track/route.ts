import { NextResponse } from "next/server";
import { registerPending } from "@/lib/aftership";
import { requireAdmin } from "@/lib/comms";
import { admin } from "@/lib/server";

// Starts live tracking for any parcels on an order that AfterShip isn't following yet.
export async function POST(request: Request) {
  if (!(await requireAdmin(request))) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  const db = admin();
  if (!db) return NextResponse.json({ error: "Server is not configured." }, { status: 503 });
  const body = await request.json().catch(() => null);
  const orderId = /^[0-9a-f-]{36}$/i.test(String(body?.orderId)) ? String(body.orderId) : undefined;
  const results = await registerPending(db, orderId);
  const failed = results.filter((r) => !r.ok);
  return NextResponse.json({ registered: results.length - failed.length, failed: failed.length, error: failed[0]?.error }, { status: failed.length && !(results.length - failed.length) ? 422 : 200 });
}
