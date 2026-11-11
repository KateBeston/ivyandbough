import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/comms";

// Suburb and town suggestions from Australia Post, for the portal's location fields when Google suggestions aren't available.
export async function POST(request: Request) {
  if (!(await requireAdmin(request))) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  const key = process.env.AUSPOST_API_KEY;
  const q = String(((await request.json().catch(() => null)) as { q?: string } | null)?.q ?? "").trim().slice(0, 60);
  if (!key || q.length < 3) return NextResponse.json({ places: [] });
  const res = await fetch(`https://digitalapi.auspost.com.au/postcode/search.json?${new URLSearchParams({ q })}`, { headers: { "AUTH-KEY": key }, signal: AbortSignal.timeout(5000) }).catch(() => null);
  const data = (await res?.json().catch(() => null)) as { localities?: { locality?: unknown } } | null;
  const raw = data?.localities?.locality;
  const list = (Array.isArray(raw) ? raw : raw ? [raw] : []) as { location: string; postcode: number | string; state: string; category?: string }[];
  const title = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
  const places = [...new Set(list.filter((l) => !l.category || /delivery area/i.test(l.category)).map((l) => `${title(l.location)}, ${l.state} ${l.postcode}`))].slice(0, 8);
  return NextResponse.json({ places });
}
