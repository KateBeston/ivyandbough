import { NextResponse } from "next/server";
import { isHuman } from "@/lib/guard";
import { allowed } from "@/lib/limits";
import { admin } from "@/lib/server";

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const link = (v: unknown) => { const s = text(v, 500); return /^https:\/\/[^\s]+$/i.test(s) ? s : ""; };
const date = (v: unknown) => { const s = text(v, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ""; };

// Organisers list events here. Everything lands as Submitted and only shows once approved in the portal.
export async function POST(request: Request) {
  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return NextResponse.json({ error: "Nothing was sent." }, { status: 400 });
  if (b.company) return NextResponse.json({ ok: true });
  if (!(await allowed(request, "event-submit", 5, 3600))) return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
  if (!(await isHuman(b.token, request))) return NextResponse.json({ error: "Please complete the check and try again." }, { status: 403 });
  const row = {
    name: text(b.name, 140), event_type: text(b.event_type, 40), price_text: text(b.price_text, 40), start_date: date(b.start_date), end_date: date(b.end_date) || null,
    time_text: text(b.time_text, 120), about: text(b.about, 800), official_url: link(b.official_url), booking_url: link(b.booking_url), image_url: link(b.image_url),
    venue: text(b.venue, 140), suburb: text(b.suburb, 80), region: text(b.region, 40) || "Brisbane City",
    organiser_name: text(b.organiser_name, 140), organiser_contact: text(b.organiser_contact, 100), organiser_email: text(b.organiser_email, 254).toLowerCase(), organiser_phone: text(b.organiser_phone, 30),
    image_credit: text(b.organiser_name, 140), source: "Organiser", status: "Submitted", state: "QLD",
  };
  if (!row.name || !row.start_date || !row.venue || !row.suburb || !row.about || !row.organiser_name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row.organiser_email)) return NextResponse.json({ error: "Please fill in all the required details." }, { status: 400 });
  if (b.rights !== "on") return NextResponse.json({ error: "Please confirm you can share these details." }, { status: 400 });
  if (row.end_date && row.end_date < row.start_date) return NextResponse.json({ error: "The end date is before the start date." }, { status: 400 });
  const db = admin();
  if (!db) return NextResponse.json({ error: "Listings aren't open yet. Please email hello@ivyandbough.com." }, { status: 500 });
  const { error } = await db.from("events").insert(row);
  if (error) return NextResponse.json({ error: "That didn't save. Please try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
