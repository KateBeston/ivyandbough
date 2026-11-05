import { NextResponse } from "next/server";
import { allowed } from "@/lib/limits";
import { checkCode, priceLines } from "@/lib/promotions";
import { admin } from "@/lib/server";
import { cleanItems } from "@/lib/shipping";

export async function POST(request: Request) {
  const db = admin();
  if (!db) return NextResponse.json({ error: "Codes aren't available right now." }, { status: 503 });
  if (!(await allowed(request, "promo", 40, 600))) return NextResponse.json({ error: "Please try again in a few minutes." }, { status: 429 });
  const body = await request.json().catch(() => null);
  const lines = await priceLines(db, cleanItems(body?.items));
  if (!lines.length) return NextResponse.json({ error: "Your basket is empty." }, { status: 400 });
  const result = await checkCode(db, String(body?.code ?? ""), lines, String(body?.sessionId ?? "").slice(0, 60));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ code: result.code.code, discountCents: result.discountCents, label: result.label });
}
