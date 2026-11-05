import { createHash } from "crypto";
import { admin } from "./server";

// Returns false once an address has used up its allowance. If the check itself fails, the request continues.
export async function allowed(request: Request, action: string, maxHits: number, windowSeconds: number) {
  const db = admin();
  if (!db) return true;
  const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
  const key = `${action}:${createHash("sha256").update(ip).digest("hex").slice(0, 32)}`;
  const { data, error } = await db.rpc("rate_limit_hit", { limit_key: key, max_hits: maxHits, window_seconds: windowSeconds });
  return error ? true : data === true;
}
