import { NextResponse } from "next/server";
import { allowed } from "@/lib/limits";
import { cleanItems, quoteDelivery } from "@/lib/shipping";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  if (!(await allowed(request, "quote", 60, 600))) return NextResponse.json({ error: "Please try again in a few minutes." }, { status: 429 });
  const body = await request.json().catch(() => null);
  const items = cleanItems(body?.items);
  if (!items.length) return NextResponse.json({ error: "Your basket is empty." }, { status: 400 });
  try {
    const quote = await quoteDelivery(supabase, items, String(body?.postcode ?? "").trim());
    return NextResponse.json({ zone: quote.zone, deliveryCents: quote.deliveryCents, free: quote.free, subtotalCents: quote.subtotalCents });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Delivery can't be calculated right now." }, { status: 422 });
  }
}
