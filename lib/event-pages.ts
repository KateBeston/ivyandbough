import type { Metadata } from "next";
import { getEvents, STATE_NAMES, type CalEvent } from "./events";
import { SITE } from "./seo";

// Location and type pages for What's On: /whats-on/qld, /whats-on/qld/gold-coast, /whats-on/qld/gold-coast/carols,
// and /whats-on/qld/carols. Each is a real page Google can rank for searches like "Christmas carols Gold Coast".
// Pages with fewer than MIN_INDEX events stay out of Google until more events are added.
export const MIN_INDEX = 3;
export const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const STATE_SLUGS = Object.keys(STATE_NAMES).map((s) => s.toLowerCase());
export const isStateSlug = (s: string) => STATE_SLUGS.includes(s.toLowerCase());

// Plural, search-friendly names for each event type.
const TYPE_TITLES: Record<string, string> = { Carols: "Christmas Carols", "Light displays": "Christmas Light Displays", Markets: "Christmas Markets", Family: "Family Christmas Events", Community: "Christmas Community Events", Dining: "Christmas Dining", "Christmas dining": "Christmas Dining", "Outdoor movies": "Christmas Outdoor Movies", Santa: "Santa Photos and Visits" };
export const typeTitle = (t: string) => TYPE_TITLES[t] ?? `Christmas ${t}`;

export type EventPage = { state: string; area?: string; type?: string; events: CalEvent[]; path: string; title: string; intro: string; indexed: boolean; areas: { name: string; href: string; count: number }[]; types: { name: string; href: string; count: number }[] };

export async function eventPage(stateSlug: string, second?: string, third?: string): Promise<EventPage | null> {
  if (!isStateSlug(stateSlug)) return null;
  const state = stateSlug.toUpperCase();
  const inState = (await getEvents()).filter((e) => e.state === state);
  const areaNames = [...new Set(inState.map((e) => e.region).filter(Boolean))];
  const typeNames = [...new Set(inState.map((e) => e.event_type).filter(Boolean))];
  let area: string | undefined, type: string | undefined;
  if (second) {
    area = areaNames.find((a) => slugify(a) === second);
    if (!area) type = typeNames.find((t) => slugify(t) === second);
    if (!area && !type) return null;
  }
  if (third) {
    if (!area) return null;
    type = typeNames.find((t) => slugify(t) === third);
    if (!type) return null;
  }
  const events = inState.filter((e) => (!area || e.region === area) && (!type || e.event_type === type));
  if (!events.length) return null;
  const place = area ?? STATE_NAMES[state];
  const what = type ? typeTitle(type) : "Christmas Events";
  const title = `${what} in ${place} 2026`;
  const path = ["/whats-on", stateSlug.toLowerCase(), area && slugify(area), type && slugify(type)].filter(Boolean).join("/");
  const free = events.filter((e) => /free/i.test(e.price_text)).length;
  const intro = `${events.length} ${type ? typeTitle(type).toLowerCase() : "Christmas events"} in ${place} this season${free ? `, ${free === events.length ? "all" : free} of them free` : ""}. Dates, times, prices and how to get there, checked against official sources and updated weekly.`;
  const base = `/whats-on/${stateSlug.toLowerCase()}`;
  const areas = areaNames.map((a) => ({ name: a, href: `${base}/${slugify(a)}${type && area ? `/${slugify(type)}` : ""}`, count: inState.filter((e) => e.region === a && (!type || !area || e.event_type === type)).length })).filter((a) => a.count).sort((a, b) => b.count - a.count);
  const pool = area ? inState.filter((e) => e.region === area) : inState;
  const types = [...new Set(pool.map((e) => e.event_type))].map((t) => ({ name: typeTitle(t), href: `${base}${area ? `/${slugify(area)}` : ""}/${slugify(t)}`, count: pool.filter((e) => e.event_type === t).length })).sort((a, b) => b.count - a.count);
  return { state, area, type, events, path, title, intro, indexed: events.length >= MIN_INDEX, areas, types };
}

export function eventPageMeta(p: EventPage): Metadata {
  return { title: `${p.title} | Ivy & Bough`, description: p.intro.slice(0, 158), alternates: { canonical: `${SITE}${p.path}` }, ...(p.indexed ? {} : { robots: { index: false, follow: true } }), openGraph: { title: p.title, description: p.intro, url: `${SITE}${p.path}` } };
}

// Every location and type page with enough events, for the sitemap.
export async function indexedEventPaths() {
  const events = await getEvents();
  const out = new Set<string>();
  const count = (f: (e: CalEvent) => boolean) => events.filter(f).length;
  for (const s of new Set(events.map((e) => e.state))) {
    const st = s.toLowerCase();
    if (count((e) => e.state === s) >= MIN_INDEX) out.add(`/whats-on/${st}`);
    for (const a of new Set(events.filter((e) => e.state === s).map((e) => e.region).filter(Boolean))) {
      if (count((e) => e.state === s && e.region === a) >= MIN_INDEX) out.add(`/whats-on/${st}/${slugify(a)}`);
      for (const t of new Set(events.filter((e) => e.state === s && e.region === a).map((e) => e.event_type))) if (count((e) => e.state === s && e.region === a && e.event_type === t) >= MIN_INDEX) out.add(`/whats-on/${st}/${slugify(a)}/${slugify(t)}`);
    }
    for (const t of new Set(events.filter((e) => e.state === s).map((e) => e.event_type))) if (count((e) => e.state === s && e.event_type === t) >= MIN_INDEX) out.add(`/whats-on/${st}/${slugify(t)}`);
  }
  return [...out];
}
