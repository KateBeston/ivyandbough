"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SignupForm } from "./SignupForm";
import { EVENT_AREAS, EVENT_TYPES, dateRange, eventImage, fmtDate, type CalEvent } from "@/lib/events";

const WHEN = ["Any time", "This weekend", "Next 7 days", "Christmas week"];
const SOON = ["NSW", "VIC", "More states soon"];

const iso = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Australia/Brisbane" });
function range(when: string): [string, string] | null {
  const now = new Date();
  if (when === "Next 7 days") return [iso(now), iso(new Date(now.getTime() + 7 * 864e5))];
  if (when === "This weekend") {
    const day = now.getDay();
    const sat = new Date(now.getTime() + ((6 - day + 7) % 7) * 864e5);
    return [iso(day === 0 ? now : sat), iso(day === 0 ? now : new Date(sat.getTime() + 864e5))];
  }
  if (when === "Christmas week") return ["2026-12-19", "2026-12-25"];
  return null;
}

export function EventsBrowser({ events }: { events: CalEvent[] }) {
  const [area, setArea] = useState("All areas");
  const [type, setType] = useState("All");
  const [when, setWhen] = useState("Any time");
  const featured = events.find((e) => e.is_featured);
  const shown = useMemo(() => {
    const w = range(when);
    return events.filter((e) => (area === "All areas" || e.region === area) && (type === "All" || e.event_type === type) && (!w || (e.start_date <= w[1] && (e.end_date || e.start_date) >= w[0])));
  }, [events, area, type, when]);
  const months = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    shown.forEach((e) => { const k = fmtDate(e.start_date, { month: "long", year: "numeric" }); m.set(k, [...(m.get(k) ?? []), e]); });
    return [...m.entries()];
  }, [shown]);
  const chip = (label: string, on: boolean, pick: () => void, soon = false) => <button key={label} type="button" className={`wo-chip${on ? " on" : ""}${soon ? " soon" : ""}`} disabled={soon} onClick={pick}>{label}</button>;

  return (
    <>
      <div className="wo-filters"><div className="wo-wrap">
        <div className="wo-row"><span>Where</span>{["All areas", ...EVENT_AREAS].map((a) => chip(a, area === a, () => setArea(a)))}{SOON.map((s) => chip(s, false, () => null, true))}</div>
        <div className="wo-row"><span>What</span>{["All", ...EVENT_TYPES].map((t) => chip(t, type === t, () => setType(t)))}</div>
        <div className="wo-row"><span>When</span>{WHEN.map((w) => chip(w, when === w, () => setWhen(w)))}</div>
      </div></div>
      <div className="wo-wrap wo-layout">
        <div>
          {featured && (
            <div className="wo-feat">
              <img src={eventImage(featured)} alt="" />
              <div><p className="wo-kick">Ivy &amp; Bough pick</p><h2>{featured.name}</h2><p>{featured.about}</p><p className="wo-feat-meta">{dateRange(featured)} · {featured.venue}{featured.price_text ? ` · ${featured.price_text}` : ""}</p><Link className="wo-btn light" href={`/whats-on/${featured.slug}`}>See details</Link></div>
            </div>
          )}
          {months.length === 0 && <div className="wo-empty">{events.length ? "No events match yet. Try another filter, or list your own event free." : "Events are being added now. Check back soon, or list your own event free."}</div>}
          {months.map(([month, list]) => (
            <section key={month} className="wo-month">
              <h2>{month}</h2>
              {list.map((e) => (
                <Link key={e.id} href={`/whats-on/${e.slug}`} className="wo-ev">
                  <img src={eventImage(e)} alt="" loading="lazy" />
                  <div className="wo-date"><b>{fmtDate(e.start_date, { day: "numeric" })}</b><span>{fmtDate(e.start_date, { month: "short" })}{e.end_date && e.end_date !== e.start_date ? ` – ${fmtDate(e.end_date, { day: "numeric", month: "short" })}` : ""}</span></div>
                  <div className="wo-ev-text"><h3>{e.name}</h3><p><span className="wo-mdate">{dateRange(e)} · </span>{[e.time_text, [e.venue, e.suburb].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}</p><div className="wo-tags"><span>{e.event_type}</span>{e.price_text && <span className={/free/i.test(e.price_text) ? "free" : ""}>{e.price_text}</span>}{e.source === "Organiser" && <span className="org">Listed by organiser</span>}</div></div>
                  <span className="wo-go">{e.booking_url ? "Book" : "Details"}</span>
                </Link>
              ))}
            </section>
          ))}
        </div>
        <aside className="wo-side">
          <div className="wo-box"><h3>List your event free</h3><p>Running carols, a market, a light trail or a Christmas lunch? Add it to our calendar at no cost. We check every listing before it goes live.</p><Link className="wo-btn dark" href="/whats-on/list-your-event">List an event</Link></div>
          <div className="wo-box wo-signup"><img src="/images/library/christelle-wehbe-29673965.jpg" alt="Hot chocolate in a Christmas mug" /><h3>What&apos;s on, weekly</h3><p>The best Christmas events near you, every Thursday until Christmas, with ideas for the table and the tree.</p><SignupForm /></div>
          <div className="wo-box wo-picks"><h3>Hosting this year?</h3><Link href="/shop/tableware">Christmas table settings →</Link><Link href="/shop/candles">Candles and candlelight →</Link><Link href="/collections/champagne-dreams">The Champagne Dreams collection →</Link><Link href="/shop/wreaths">Wreaths for the front door →</Link></div>
        </aside>
      </div>
      <p className="wo-foot">Event details come from organisers and official sources. Please check with the organiser before you go.</p>
    </>
  );
}
