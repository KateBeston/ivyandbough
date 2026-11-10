import { timingSafeEqual } from "crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { admin } from "@/lib/server";

// Called by the database itself whenever products, listings, photos, categories, collections, articles or settings change,
// so the website shows the change straight away however it was made. The shared key lives only in a private database table.
let cached: { key: string; at: number } | null = null;
async function hookKey() {
  if (cached && Date.now() - cached.at < 10 * 60_000) return cached.key;
  const db = admin();
  if (!db) return "";
  const { data } = await db.from("app_secrets").select("value").eq("key", "revalidate_hook").maybeSingle();
  cached = { key: String(data?.value ?? ""), at: Date.now() };
  return cached.key;
}

export async function POST(request: Request) {
  const given = Buffer.from(request.headers.get("x-hook-key") ?? "");
  const key = await hookKey();
  const expected = Buffer.from(key);
  if (!key || given.length !== expected.length || !timingSafeEqual(given, expected)) return NextResponse.json({ ok: false }, { status: 401 });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
