import type { Metadata } from "next";
import { EventsBrowser } from "@/components/EventsBrowser";
import { getEvents } from "@/lib/events";
import { SITE } from "@/lib/seo";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "What's On This Christmas in Brisbane | Ivy & Bough",
  description: "Christmas carols, light displays, markets, outdoor movies and festive dining around Brisbane and South East Queensland, updated weekly.",
  alternates: { canonical: `${SITE}/whats-on` },
};

export default async function WhatsOnPage() {
  const events = await getEvents();
  return (
    <div className="wo">
      <section className="wo-hero">
        <img src="/images/library/fakhri98-29922196.jpg" alt="A lit Christmas tree outside a grand building at night" />
        <div><p className="wo-kick">Christmas 2026 · Brisbane &amp; South East Queensland</p><h1>What&apos;s On This Christmas</h1><p>Carols, light displays, markets, outdoor movies and festive dining. Your guide to the season, updated weekly.</p></div>
      </section>
      <EventsBrowser events={events} />
    </div>
  );
}
