import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/comms";

// What Australia Post charges us to send a parcel, at their standard (retail) rates.
export async function POST(request: Request) {
  if (!(await requireAdmin(request))) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  const key = process.env.AUSPOST_API_KEY;
  if (!key) return NextResponse.json({ error: "Add AUSPOST_API_KEY to the website project in Vercel to see Australia Post costs." }, { status: 503 });
  const b = await request.json().catch(() => null);
  const from = String(b?.from ?? ""), to = String(b?.to ?? "");
  const n = (v: unknown) => Number(v) || 0;
  const [length, width, height, weight] = [n(b?.length), n(b?.width), n(b?.height), n(b?.weightKg)];
  if (!/^\d{4}$/.test(from) || !/^\d{4}$/.test(to)) return NextResponse.json({ error: "Enter 4-digit from and to postcodes." }, { status: 400 });
  if (!(length && width && height && weight)) return NextResponse.json({ error: "Enter the parcel's length, width, height and weight." }, { status: 400 });
  if (weight > 22) return NextResponse.json({ error: "Australia Post's limit is 22 kg per parcel. Split it into more than one parcel." }, { status: 400 });
  if (Math.max(length, width, height) > 105) return NextResponse.json({ error: "Australia Post's limit is 105 cm on the longest side. This will need a courier." }, { status: 400 });
  const q = new URLSearchParams({ from_postcode: from, to_postcode: to, length: String(length), width: String(width), height: String(height), weight: String(weight) });
  const res = await fetch(`https://digitalapi.auspost.com.au/postage/parcel/domestic/service.json?${q}`, { headers: { "AUTH-KEY": key } }).catch(() => null);
  const data = await res?.json().catch(() => null);
  if (!res?.ok) return NextResponse.json({ error: data?.error?.errorMessage ?? "Australia Post didn't return a price. Check the key and the parcel details." }, { status: 502 });
  const list = data?.services?.service;
  const services = (Array.isArray(list) ? list : list ? [list] : []).map((s: { code: string; name: string; price: string }) => ({ code: s.code, name: s.name, priceCents: Math.round(Number(s.price) * 100) })).filter((s: { priceCents: number }) => s.priceCents > 0);
  return NextResponse.json({ services });
}
