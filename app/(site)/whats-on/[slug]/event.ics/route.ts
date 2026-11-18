import { getEvent } from "@/lib/events";
import { SITE } from "@/lib/seo";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/[,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const e = await getEvent((await params).slug);
  if (!e) return new Response("Not found", { status: 404 });
  const end = new Date(`${e.end_date || e.start_date}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ivy & Bough//What's On//EN", "BEGIN:VEVENT", `UID:${e.id}@ivyandbough.com`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`, `DTSTART;VALUE=DATE:${e.start_date.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${end.toISOString().slice(0, 10).replace(/-/g, "")}`, `SUMMARY:${esc(e.name)}`, `LOCATION:${esc([e.venue, e.suburb, e.state].filter(Boolean).join(", "))}`, `DESCRIPTION:${esc(`${e.time_text}\n${SITE}/whats-on/${e.slug}`)}`, `URL:${SITE}/whats-on/${e.slug}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  return new Response(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${e.slug}.ics"` } });
}
