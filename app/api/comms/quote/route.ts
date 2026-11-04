import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/comms";
import { admin } from "@/lib/server";
import { cleanItems, quoteDelivery } from "@/lib/shipping";

export async function POST(request: Request) {
  if (!(await requireAdmin(request))) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  const db = admin();
  if (!db) return NextResponse.json({ error: "SUPABASE_SECRET_KEY is not set." }, { status: 503 });
  const body = await request.json().catch(() => null);
  const items = cleanItems(body?.items);
  if (!items.length) return NextResponse.json({ error: "Add at least one product." }, { status: 400 });
  try {
    return NextResponse.json(await quoteDelivery(db, items, String(body?.postcode ?? "").trim()));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Delivery can't be calculated." }, { status: 422 });
  }
}
