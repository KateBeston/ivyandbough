"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SignupForm } from "./SignupForm";
import { EVENT_AREAS, EVENT_TYPES, STATE_NAMES, dateRange, eventImage, fmtDate, type CalEvent } from "@/lib/events";

const WHEN = ["Any time", "This weekend", "Next 7 days", "Christmas week"];
const STATES = Object.keys(STATE_NAMES);
const SHORT: Record<string, string> = { QLD: "Queensland", NSW: "NSW", VIC: "Victoria", SA: "SA", WA: "WA", TAS: "Tasmania", ACT: "ACT", NT: "NT" };

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
  const [state, setState] = useState("QLD");
  const [area, setArea] = useState("All areas");
  const params = useSearchParams();
  const qState = (params.get("state") ?? "").toUpperCase();
  const qArea = params.get("area") ?? "";
  const qType = params.get("type") ?? "";
  useEffect(() => {
    if (STATES.includes(qState)) { setState(qState); setArea(qState === "QLD" && EVENT_AREAS.includes(qArea) ? qArea : "All areas"); try { localStorage.setItem("ib-wo-state", qState); } catch { /* private mode */ } }
    if (qType) setType(EVENT_TYPES.includes(qType) ? qType : "All");
    if (STATES.includes(qState)) return;
    let saved = "";
    try { saved = localStorage.getItem("ib-wo-state") ?? ""; } catch { /* private mode */ }
    if (STATES.includes(saved)) { setState(saved); return; }
    fetch("/api/geo").then((r) => r.json()).then((g: { state: string | null }) => { if (g.state) setState(g.state); }).catch(() => null);
  }, [qState, qArea, qType]);
  const pickState = (s: string) => { setState(s); setArea("All areas"); try { localStorage.setItem("ib-wo-state", s); } catch { /* private mode */ } };
  const inState = useMemo(() => events.filter((e) => e.state === state), [events, state]);
  const fallback = inState.length === 0 && state !== "QLD";
  const pool = fallback ? events : inState;
  const [type, setType] = useState("All");
  const [view, setView] = useState<"List" | "Calendar">("List");
  useEffect(() => { try { if (localStorage.getItem("ib-wo-view") === "Calendar") setView("Calendar"); } catch { /* private mode */ } }, []);
  const pickView = (v: "List" | "Calendar") => { setView(v); try { localStorage.setItem("ib-wo-view", v); } catch { /* private mode */ } };
  const [when, setWhen] = useState("Any time");
  const featured = pool.find((e) => e.is_featured);
  const shown = useMemo(() => {
    const w = range(when);
    return pool.filter((e) => (area === "All areas" || fallback || e.region === area) && (type === "All" || e.event_type === type) && (!w || (e.start_date <= w[1] && (e.end_date || e.start_date) >= w[0])));
  }, [pool, fallback, area, type, when]);
  const months = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    shown.forEach((e) => { const k = fmtDate(e.start_date, { month: "long", year: "numeric" }); m.set(k, [...(m.get(k) ?? []), e]); });
    return [...m.entries()];
  }, [shown]);
  const chip = (label: string, on: boolean, pick: () => void, soon = false) => <button key={label} type="button" className={`wo-chip${on ? " on" : ""}${soon ? " soon" : ""}`} disabled={soon} onClick={pick}>{label}</button>;

  const place = state === "QLD" ? "Brisbane & South East Queensland" : STATE_NAMES[state].replace(/^the /, "");
  return (
    <>
      <section className="wo-hero">
        <img src="/images/library/fakhri98-29922196.jpg" alt="A lit Christmas tree outside a grand building at night" />
        <div><p className="wo-kick">Christmas 2026 · {place}</p><h1>What&apos;s On This Christmas</h1><p>Carols, light displays, markets, outdoor movies and festive dining. Your guide to the season, updated weekly.</p></div>
      </section>
      <div className="wo-filters"><div className="wo-wrap">
        <div className="wo-row"><span>Where</span>{STATES.map((s) => chip(SHORT[s], state === s, () => pickState(s)))}</div>
        {state === "QLD" && <div className="wo-row"><span>Area</span>{["All areas", ...EVENT_AREAS].map((a) => chip(a, area === a, () => setArea(a)))}</div>}
        <div className="wo-row"><span>What</span>{["All", ...EVENT_TYPES].map((t) => chip(t, type === t, () => setType(t)))}</div>
        <div className="wo-row"><span>When</span>{WHEN.map((w) => chip(w, when === w, () => setWhen(w)))}</div>
      </div></div>
      <div className="wo-wrap wo-layout">
        <div>
          {fallback && <div className="wo-notice">We&apos;re adding Christmas events in {STATE_NAMES[state]} now. Running one? <Link href="/whats-on/list-your-event">List it free</Link>. In the meantime, here&apos;s what&apos;s on in Queensland.</div>}
          {featured && (
            <div className="wo-feat">
              <img src={eventImage(featured)} alt="" />
              <div><p className="wo-kick">Ivy &amp; Bough pick</p><h2>{featured.name}</h2><p>{featured.about}</p><p className="wo-feat-meta">{dateRange(featured)} · {featured.venue}{featured.price_text ? ` · ${featured.price_text}` : ""}</p><Link className="wo-btn light" href={`/whats-on/${featured.slug}`}>See details</Link></div>
            </div>
          )}
          <div className="wo-view" role="tablist" aria-label="View">{(["List", "Calendar"] as const).map((v) => <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? "on" : ""} onClick={() => pickView(v)}>{v}</button>)}</div>
          {view === "Calendar" ? <EventsCalendar events={shown} /> : (<>
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
          </>)}
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


const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Month grid, Monday first. Multi-day events appear on every day they run.
function EventsCalendar({ events }: { events: CalEvent[] }) {
  const todayKey = iso(new Date());
  const first = events.find((e) => (e.end_date || e.start_date) >= todayKey);
  const startMonth = () => { const base = first && first.start_date > todayKey ? first.start_date : todayKey; return new Date(Number(base.slice(0, 4)), Number(base.slice(5, 7)) - 1, 1); };
  const [month, setMonth] = useState(startMonth);
  const [picked, setPicked] = useState<string | null>(null);
  const cells = useMemo(() => {
    const lead = (month.getDay() + 6) % 7;
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const out: (Date | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= days; d++) out.push(new Date(month.getFullYear(), month.getMonth(), d));
    while (out.length % 7) out.push(null);
    return out;
  }, [month]);
  const on = (k: string) => events.filter((e) => e.start_date <= k && (e.end_date || e.start_date) >= k);
  const move = (n: number) => { setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1)); setPicked(null); };
  const dayList = picked ? on(picked) : [];
  return (
    <div className="wo-cal">
      <div className="wo-cal-head"><button type="button" onClick={() => move(-1)} aria-label="Previous month">‹</button><h2>{month.toLocaleDateString("en-AU", { month: "long", year: "numeric" })}</h2><button type="button" onClick={() => move(1)} aria-label="Next month">›</button></div>
      <div className="wo-cal-grid">
        {DAYS.map((d) => <div key={d} className="wo-cal-dow">{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={`x${i}`} className="wo-cal-cell empty" />;
          const k = key(d);
          const list = on(k);
          return (
            <button key={k} type="button" className={`wo-cal-cell${list.length ? " has" : ""}${k === todayKey ? " today" : ""}${picked === k ? " on" : ""}${k < todayKey ? " past" : ""}`} onClick={() => setPicked(picked === k ? null : k)} aria-label={`${d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}, ${list.length} ${list.length === 1 ? "event" : "events"}`}>
              <b>{d.getDate()}</b>
              <span className="wo-cal-names">{list.slice(0, 3).map((e) => <i key={e.id}>{e.name}</i>)}{list.length > 3 && <em>+{list.length - 3} more</em>}</span>
              {list.length > 0 && <span className="wo-cal-dots">{list.slice(0, 4).map((e) => <u key={e.id} />)}</span>}
            </button>
          );
        })}
      </div>
      {picked && (
        <div className="wo-cal-day">
          <h3>{new Date(`${picked}T00:00:00`).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}</h3>
          {dayList.length === 0 ? <p className="wo-note">Nothing listed for this day yet.</p> : dayList.map((e) => (
            <Link key={e.id} href={`/whats-on/${e.slug}`} className="wo-cal-ev"><img src={eventImage(e)} alt="" loading="lazy" /><span><strong>{e.name}</strong><small>{[e.time_text, e.venue].filter(Boolean).join(" · ")}</small></span><em>{e.booking_url ? "Book" : "Details"}</em></Link>
          ))}
        </div>
      )}
      {!picked && <p className="wo-note">Choose a day to see its events.</p>}
    </div>
  );
}
