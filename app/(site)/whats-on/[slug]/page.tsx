import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { ShareButton } from "@/components/ShareButton";
import Image from "next/image";
import { dateRange, eventImage, getEvent, getEvents } from "@/lib/events";
import { formatPrice, getProductsInCategories } from "@/lib/catalogue";
import { SITE } from "@/lib/seo";

export const revalidate = 600;

// Shop picks matched to the kind of event, so they read as relevant rather than as ads.
const PICKS: Record<string, { title: string; ids: string[]; href: string; link: string }> = {
  "Light displays": { title: "Light up your own home", ids: ["cb53ca67-67aa-4c53-a8d2-ee3aa9d62826", "31aa7884-c9a1-4595-a124-272fc75a18e6", "c6db8266-26eb-4c7d-83e0-3c13e3c7a72d"], href: "/shop/lighting", link: "Shop lighting" },
  Markets: { title: "Gifts and stocking fillers", ids: ["38861474-d1b6-4a9b-b4b0-14e7ac50b47f", "55972412-5f26-4a08-a11a-a2f684c5ac2e", "da3af48d-0515-4081-a5bb-a9f47bb08b31"], href: "/shop/gifts", link: "Shop gifts" },
  Carols: { title: "Candlelight at home", ids: ["6a5ae688-f33a-4dff-b352-24305de5231c", "fd9b301d-95ad-4424-a243-1dd8652771bf"], href: "/shop/the-table", link: "Shop candles" },
  Family: { title: "For little ones", ids: ["38861474-d1b6-4a9b-b4b0-14e7ac50b47f", "9f4df780-6054-4c97-803b-80edcc866639"], href: "/shop/gifts", link: "Shop stocking fillers" },
  Community: { title: "Deck the halls", ids: ["a5c71925-ac22-4bc0-8625-2e27fe5c7988", "d7c5001b-0a18-4940-8789-0c0a7080c52a", "9d8ce399-bf0d-46f6-97e6-5f1584382a7e"], href: "/shop", link: "Browse the shop" },
};
const TABLE = { title: "Make a night of it", ids: ["6a5ae688-f33a-4dff-b352-24305de5231c", "953290cd-6caf-4cf4-8a93-a60e5f4d2b6b", "10433bbe-8081-4ab1-a5ee-e7591d2f5348"], href: "/shop/the-table", link: "Shop the Christmas table" };

async function shopPicks(type: string) {
  const set = PICKS[type] ?? TABLE;
  const seen = new Set<string>();
  const pool = (await getProductsInCategories(set.ids, 60)).filter((p) => {
    const key = p.name.split(",")[0].trim().toLowerCase();
    if (seen.has(key) || p.availability === "Sold out" || !p.product_images?.[0] || (p.price_from_cents ?? p.price_cents) === null) return false;
    seen.add(key); return true;
  });
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return { ...set, items: pool.slice(0, 4) };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const e = await getEvent((await params).slug);
  if (!e) return {};
  const where = [e.venue, e.suburb].filter(Boolean).join(", ");
  return {
    title: `${e.name} | What's On | Ivy & Bough`,
    description: `${e.name}: ${dateRange(e, true)}${where ? ` at ${where}` : ""}. ${e.about}`.slice(0, 158),
    alternates: { canonical: `${SITE}/whats-on/${e.slug}` },
    openGraph: { images: [{ url: eventImage(e).startsWith("http") ? eventImage(e) : `${SITE}${eventImage(e)}` }] },
  };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const e = await getEvent((await params).slug);
  if (!e) notFound();
  const [all, shop] = await Promise.all([getEvents(), shopPicks(e.event_type)]);
  const more = all.filter((x) => x.id !== e.id).slice(0, 3);
  const image = eventImage(e);
  const free = /free/i.test(e.price_text);
  const _gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.name)}&dates=${e.start_date.replace(/-/g, "")}/${(() => { const d = new Date(`${e.end_date || e.start_date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10).replace(/-/g, ""); })()}&location=${encodeURIComponent([e.venue, e.suburb, e.state].filter(Boolean).join(", "))}&details=${encodeURIComponent(`${e.time_text}\n${SITE}/whats-on/${e.slug}`)}`;
  const where = [e.venue, e.address, e.suburb].filter(Boolean).join(", ");
  const maps = e.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([e.venue, e.address, e.suburb, e.state].filter(Boolean).join(", "))}`;
  const story = e.story ?? [];
  const firstText = story.findIndex((b) => b.type === "text");
  return (
    <div className="wo wo-feature">
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "Event", name: e.name, description: e.lead || e.about, startDate: e.start_date, ...(e.end_date ? { endDate: e.end_date } : {}),
        eventStatus: "https://schema.org/EventScheduled", eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        image: [image.startsWith("http") ? image : `${SITE}${image}`],
        location: { "@type": "Place", name: e.venue || e.suburb, address: { "@type": "PostalAddress", streetAddress: e.address || undefined, addressLocality: e.suburb, addressRegion: e.state, addressCountry: "AU" } },
        ...(e.organiser_name ? { organizer: { "@type": "Organization", name: e.organiser_name, ...(e.official_url ? { url: e.official_url } : {}) } } : {}),
        ...(free || e.booking_url ? { offers: { "@type": "Offer", url: e.booking_url || e.official_url || `${SITE}/whats-on/${e.slug}`, ...(free ? { price: 0, priceCurrency: "AUD" } : {}), availability: "https://schema.org/InStock" } } : {}),
      }} />
      <section className="wf-hero">
        <img src={image} alt={e.name} />
        <div className="wf-hero-in">
          <p className="wf-crumb"><Link href="/whats-on">What&apos;s On</Link> · {e.event_type}{e.suburb ? ` · ${e.suburb}` : ""}</p>
          <h1>{e.name}</h1>
          <div className="wf-chips"><span>{dateRange(e)}</span>{e.price_text && <span>{e.price_text}</span>}{e.venue && <span>{e.venue}</span>}</div>
        </div>
        {e.image_url && e.image_credit && <small className="wf-hero-cr">Image: {e.image_credit}</small>}
      </section>
      <div className="wf-wrap">
        <article className="wf-main">
          {(e.lead || e.about) && <p className="wf-lead">{e.lead || e.about}</p>}
          {e.highlights?.length > 0 && <div className="wf-badges">{e.highlights.map((h, i) => <div key={i}><b>{h.title}</b><small>{h.detail}</small></div>)}</div>}
          {story.length > 0 ? (
            <div className="wf-story">{story.map((b, i) => b.type === "image"
              ? <figure key={i} className={`wf-photo ${b.layout === "right" ? "right" : "wide"}`}><img src={b.url} alt={b.alt ?? ""} loading="lazy" />{(b.caption || b.credit) && <figcaption>{[b.caption, b.credit].filter(Boolean).join(" · ")}</figcaption>}</figure>
              : <div key={i} className={i === firstText ? "wf-text first" : "wf-text"}>{b.heading && <h3>{b.heading}</h3>}{b.text.split(/\n\n+/).map((para, j) => <p key={j}>{para}</p>)}</div>)}</div>
          ) : (e.lead && e.about ? <div className="wf-story"><div className="wf-text first">{e.about.split(/\n\n+/).map((para, j) => <p key={j}>{para}</p>)}</div></div> : null)}
          {e.menu?.length > 0 && (
            <section><h2>On the Menu</h2><div className="wf-menu">{e.menu.map((m, i) => (
              <div key={i} className="wf-menu-block"><h3>{m.title}{m.price && <em>{m.price}</em>}</h3>{m.note && <p className="wf-menu-note">{m.note}</p>}<ul>{m.items.map((it, j) => <li key={j}>{it}</li>)}</ul></div>
            ))}{e.menu_url && <a className="wf-more" href={e.menu_url} target="_blank" rel="noopener">View the full menu</a>}</div></section>
          )}
          {e.awards?.length > 0 && (
            <section><h2>Awards</h2><ul className="wf-awards">{e.awards.map((a, i) => <li key={i}><span>{a.years}</span><div><b>{a.title}</b>{a.detail && <small>{a.detail}</small>}</div></li>)}</ul></section>
          )}
          {e.good_to_know?.length > 0 && (
            <section><h2>Good to Know</h2><ul className="wf-good">{e.good_to_know.map((g, i) => <li key={i}>{g}</li>)}</ul></section>
          )}
          {e.venue_about && (
            <section className="wf-venue"><div><span className="wo-kick dark">About the venue</span><h3>{e.organiser_name || e.venue}</h3><p>{e.venue_about}</p>
              <div className="wf-social">{e.booking_url && <a href={e.booking_url} target="_blank" rel="noopener">Book</a>}<a href={maps} target="_blank" rel="noopener">Google Maps</a></div>
              {(e.facebook_url || e.instagram_url) && (
                <div className="wf-follow"><span>Follow {e.organiser_name || e.venue}</span>
                  {e.facebook_url && <a href={e.facebook_url} target="_blank" rel="noopener" aria-label={`${e.organiser_name || e.venue} on Facebook`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5V21h3z" /></svg></a>}
                  {e.instagram_url && <a href={e.instagram_url} target="_blank" rel="noopener" aria-label={`${e.organiser_name || e.venue} on Instagram`}><svg viewBox="0 0 24 24" aria-hidden="true" className="ig"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" className="dot" /></svg></a>}
                </div>
              )}</div>
              <div className="wf-venue-contact">{where}{e.venue_phone && <><br />{e.venue_phone}</>}{e.venue_hours && <><br />{e.venue_hours}</>}{e.official_url && <><br /><a href={e.official_url} target="_blank" rel="noopener">{e.official_url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</a></>}</div>
              {e.maps_url && (
                <div className="wf-map">
                  <iframe title={`Map of ${e.venue || e.name}`} src={`https://www.google.com/maps?q=${encodeURIComponent([e.venue, e.address, e.suburb, e.state].filter(Boolean).join(", "))}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                  <a href={e.maps_url} target="_blank" rel="noopener">Open in Google Maps</a>
                </div>
              )}
            </section>
          )}
          <p className="wo-note">Are you the organiser? <a href={`mailto:hello@ivyandbough.com?subject=${encodeURIComponent(`Update listing: ${e.name}`)}`}>Update this listing</a></p>
        </article>
        <aside className="wf-side"><div className="wf-card">
          {e.price_text && <p className="wf-price">{e.price_text}</p>}
          <dl className="wo-facts">
            <dt>When</dt><dd>{dateRange(e, true)}{e.time_text && <><br />{e.time_text}</>}</dd>
            <dt>Where</dt><dd>{where}</dd>
            {e.organiser_name && <><dt>Host</dt><dd>{e.organiser_name}</dd></>}
          </dl>
          <div className="wf-acts">
            {e.booking_url && <a className="wo-btn dark" href={e.booking_url} target="_blank" rel="noopener">Book now</a>}
            {e.official_url && <a className={`wo-btn ${e.booking_url ? "" : "dark"}`} href={e.official_url} target="_blank" rel="noopener">Official website</a>}
            <div className="wf-row">
              <a className="wo-btn wf-ico" href={`/whats-on/${e.slug}/event.ics`}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="1.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></svg><span>Calendar</span></a>
              <a className="wo-btn wf-ico" href={maps} target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-6.1-6.5-11a6.5 6.5 0 0 1 13 0c0 4.9-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></svg><span>Directions</span></a>
              <ShareButton title={e.name} icon />
            </div>
          </div>
          {e.booking_url && <p className="wo-note">Bookings are made directly with {e.organiser_name || "the organiser"}. Ivy &amp; Bough doesn&apos;t handle bookings.</p>}
          {shop.items.length > 0 && (
            <div className="wo-shop">
              <p className="wo-kick dark">From the Ivy &amp; Bough shop</p>
              <h2>{shop.title}</h2>
              <div className="wo-shop-list">{shop.items.map((p) => (
                <Link key={p.id} href={`/products/${p.slug}`}>
                  <Image src={p.product_images[0].url} alt={p.product_images[0].alt || p.name} width={160} height={160} sizes="(max-width:860px) 40vw, 80px" quality={75} />
                  <span><strong>{p.name.split(",")[0]}</strong><em>{p.price_from_cents ? `From ${formatPrice(p.price_from_cents)}` : formatPrice(p.price_cents)}</em></span>
                </Link>
              ))}</div>
              <Link className="wo-shop-more" href={shop.href}>{shop.link}</Link>
            </div>
          )}
        </div></aside>
      </div>
      {more.length > 0 && (
        <div className="wo-wrap"><section className="wo-more"><h2>More this Christmas</h2><div>{more.map((m) => (
          <Link key={m.id} href={`/whats-on/${m.slug}`}><img src={eventImage(m)} alt="" loading="lazy" /><span className="wo-kick dark">{dateRange(m)}</span><strong>{m.name}</strong></Link>
        ))}</div></section></div>
      )}
    </div>
  );
}
