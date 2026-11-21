import type { Metadata } from "next";
import { Suspense } from "react";
import { EventsBrowser } from "@/components/EventsBrowser";
import Link from "next/link";
import { getEvents, STATE_NAMES } from "@/lib/events";
import { indexedEventPaths, slugify, typeTitle } from "@/lib/event-pages";
import { SITE } from "@/lib/seo";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "What's On This Christmas in Brisbane | Ivy & Bough",
  description: "Christmas carols, light displays, markets, outdoor movies and festive dining around Brisbane and South East Queensland, updated weekly.",
  alternates: { canonical: `${SITE}/whats-on` },
};

export default async function WhatsOnPage() {
  const [events, paths] = await Promise.all([getEvents(), indexedEventPaths().catch(() => [] as string[])]);
  // Readable names for each location and type page, so Google (and people) can browse by area.
  const nameFor = (path: string) => {
    const [, , st, a, t] = path.split("/");
    const inState = events.filter((e) => e.state.toLowerCase() === st);
    const area = inState.find((e) => slugify(e.region) === a)?.region;
    const type = inState.find((e) => slugify(e.event_type) === (area ? t : a))?.event_type;
    return `${type ? typeTitle(type) : "Christmas events"} in ${area ?? STATE_NAMES[st.toUpperCase()]}`;
  };
  return (
    <div className="wo">
      {/* Rendered on the server so the heading is in the page's HTML (the browser below only loads in the browser). */}
      <section className="wo-hero">
        <img src="/images/library/fakhri98-29922196.jpg" alt="A lit Christmas tree outside a grand building at night" />
        <div><p className="wo-kick">Christmas 2026 · Across Australia</p><h1>What&apos;s On This Christmas</h1><p>Carols, light displays, markets, outdoor movies and festive dining. Your guide to the season, updated weekly.</p></div>
      </section>
      <Suspense><EventsBrowser events={events} /></Suspense>
      {paths.length > 0 && <nav className="wo-areas" aria-labelledby="wo-areas"><h2 id="wo-areas">Browse by area</h2><div>{paths.map((p) => <Link key={p} href={p}>{nameFor(p)}</Link>)}</div></nav>}
    </div>
  );
}
