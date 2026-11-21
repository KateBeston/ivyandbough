import Link from "next/link";
import { JsonLd } from "./JsonLd";
import { dateRange, eventImage, fmtDate, STATE_NAMES } from "@/lib/events";
import type { EventPage } from "@/lib/event-pages";
import { SITE } from "@/lib/seo";

// A What's On location or type page (e.g. Christmas carols on the Gold Coast). Server-rendered so Google can read it.
export function EventListing({ page }: { page: EventPage }) {
  const { events, state, area, type } = page;
  const crumbs = [
    { name: "What's On", path: "/whats-on" },
    { name: STATE_NAMES[state], path: `/whats-on/${state.toLowerCase()}` },
    ...(area ? [{ name: area, path: page.path.split("/").slice(0, 4).join("/") }] : []),
    ...(type ? [{ name: page.title.split(" in ")[0], path: page.path }] : []),
  ];
  const months = new Map<string, typeof events>();
  events.forEach((e) => { const k = fmtDate(e.start_date, { month: "long", year: "numeric" }); months.set(k, [...(months.get(k) ?? []), e]); });
  return (
    <div className="wo">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: `${SITE}${c.path}` })) }} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "ItemList", name: page.title, itemListElement: events.map((e, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/whats-on/${e.slug}`, name: e.name })) }} />
      <section className="wo-hero wo-hero-short">
        <img src={eventImage(events[0])} alt="" />
        <div>
          <nav className="wo-crumbs" aria-label="Breadcrumb">{crumbs.map((c, i) => <span key={c.path}>{i < crumbs.length - 1 ? <Link href={c.path}>{c.name}</Link> : c.name}</span>)}</nav>
          <h1>{page.title}</h1>
          <p>{page.intro}</p>
        </div>
      </section>
      <div className="wo-wrap wo-layout">
        <div>
          {[...months.entries()].map(([month, list]) => (
            <section key={month} className="wo-month">
              <h2>{month}</h2>
              {list.map((e) => (
                <Link key={e.id} href={`/whats-on/${e.slug}`} className="wo-ev">
                  <img src={eventImage(e)} alt="" loading="lazy" />
                  <div className="wo-date"><b>{fmtDate(e.start_date, { day: "numeric" })}</b><span>{fmtDate(e.start_date, { month: "short" })}{e.end_date && e.end_date !== e.start_date ? ` – ${fmtDate(e.end_date, { day: "numeric", month: "short" })}` : ""}</span></div>
                  <div className="wo-ev-text"><h3>{e.name}</h3><p><span className="wo-mdate">{dateRange(e)} · </span>{[e.time_text, [e.venue, e.suburb].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}</p>{e.lead && <p className="wo-ev-lead">{e.lead}</p>}<div className="wo-tags"><span>{e.event_type}</span>{e.price_text && <span className={/free/i.test(e.price_text) ? "free" : ""}>{e.price_text}</span>}</div></div>
                  <span className="wo-go">{e.booking_url ? "Book" : "Details"}</span>
                </Link>
              ))}
            </section>
          ))}
        </div>
        <aside className="wo-side">
          {page.types.length > (type ? 1 : 0) && <div className="wo-box wo-links"><h3>{area ? `More in ${area}` : `What's on in ${STATE_NAMES[state]}`}</h3>{page.types.map((t) => <Link key={t.href} href={t.href} className={t.href === page.path ? "on" : ""}>{t.name} <span>({t.count})</span></Link>)}</div>}
          {page.areas.length > 1 && <div className="wo-box wo-links"><h3>By area</h3>{page.areas.map((a) => <Link key={a.href} href={a.href} className={a.href === page.path ? "on" : ""}>{a.name} <span>({a.count})</span></Link>)}</div>}
          <div className="wo-box"><h3>List your event free</h3><p>Running carols, a market, a light trail or a Christmas lunch? Add it to our calendar at no cost. We check every listing before it goes live.</p><Link className="wo-btn dark" href="/whats-on/list-your-event">List an event</Link></div>
        </aside>
      </div>
      <p className="wo-foot">Event details come from organisers and official sources. Please check with the organiser before you go. <Link href="/whats-on">See everything on this Christmas</Link>.</p>
    </div>
  );
}
