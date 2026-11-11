import { timingSafeEqual } from "crypto";
import { admin } from "@/lib/server";

// The shared key the database sends with its own requests (pg_net). It lives only in a private database table.
let cached: { key: string; at: number } | null = null;
async function hookKey() {
  if (cached && Date.now() - cached.at < 10 * 60_000) return cached.key;
  const db = admin();
  if (!db) return "";
  const { data } = await db.from("app_secrets").select("value").eq("key", "revalidate_hook").maybeSingle();
  cached = { key: String(data?.value ?? ""), at: Date.now() };
  return cached.key;
}

export async function fromDatabase(request: Request) {
  const given = Buffer.from(request.headers.get("x-hook-key") ?? "");
  const key = await hookKey();
  const expected = Buffer.from(key);
  return key.length > 0 && given.length === expected.length && timingSafeEqual(given, expected);
}
