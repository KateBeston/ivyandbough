import { NextResponse } from "next/server";
import { allowed } from "@/lib/limits";
import { OFFER_COLUMNS, offerPrice } from "@/lib/pricing";
import { supabase } from "@/lib/supabase";

// A saved basket can outlive a sale, so its prices are refreshed on every visit.
export async function POST(request: Request) {
  if (!(await allowed(request, "prices", 120, 600))) return NextResponse.json({ prices: [] }, { status: 429 });
  const body = await request.json().catch(() => null);
  const ids = (Array.isArray(body?.ids) ? body.ids : []).slice(0, 50).map(String).filter((id: string) => /^[0-9a-f-]{36}$/i.test(id));
  if (!ids.length) return NextResponse.json({ prices: [] });
  const { data } = await supabase.from("products").select(`id,price_cents,${OFFER_COLUMNS}`).in("id", ids);
  return NextResponse.json({ prices: (data ?? []).map((r) => { const o = offerPrice(r); return { id: r.id, cents: o.cents, wasCents: o.wasCents, label: o.label }; }) });
}
