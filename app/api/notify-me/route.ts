import { NextResponse } from "next/server";
import { isHuman } from "@/lib/guard";
import { allowed } from "@/lib/limits";
import { admin } from "@/lib/server";
import { startSubscription } from "@/lib/subscribe";

// Records interest in a product that isn't on sale yet. Nothing is bought or charged.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (body?.company) return NextResponse.json({ ok: true });
  const email = String(body?.email ?? "").trim().toLowerCase().slice(0, 254);
  const productId = String(body?.productId ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !productId) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (!(await allowed(request, "notify-me", 10, 3600))) return NextResponse.json({ error: "Please try again in a little while." }, { status: 429 });
  if (!(await isHuman(body?.token, request))) return NextResponse.json({ error: "We couldn't confirm you're human. Please refresh the page and try again." }, { status: 403 });
  const db = admin();
  if (!db) return NextResponse.json({ error: "That didn't go through. Please try again." }, { status: 503 });
  const { data: product } = await db.from("products").select("id,availability").eq("id", productId).eq("status", "active").maybeSingle();
  if (!product) return NextResponse.json({ error: "That product isn't available." }, { status: 404 });
  const marketing = body?.marketing === true;
  await db.from("product_interest").upsert({ product_id: product.id, email, marketing, notified_at: null }, { onConflict: "product_id,email" });
  if (marketing) await startSubscription(email, "Notify me").catch(() => null);
  return NextResponse.json({ ok: true });
}
