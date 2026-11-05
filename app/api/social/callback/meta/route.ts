import { NextResponse } from "next/server";
import { admin } from "@/lib/server";
import { connectMeta, PORTAL_URL, validState } from "@/lib/social";

const back = (key: "connected" | "error", message: string) => NextResponse.redirect(`${PORTAL_URL}/social/accounts?${key}=${encodeURIComponent(message)}`);

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const code = query.get("code");
  if (!validState(query.get("state"))) return back("error", "That link has expired. Please connect again from the portal.");
  if (!code) return back("error", query.get("error_description") ?? "The connection was cancelled.");
  const db = admin();
  if (!db) return back("error", "SUPABASE_SECRET_KEY is not set.");
  try {
    return back("connected", `Connected ${(await connectMeta(db, code)).join(", ")}.`);
  } catch (e) {
    return back("error", e instanceof Error ? e.message : "The connection failed.");
  }
}
