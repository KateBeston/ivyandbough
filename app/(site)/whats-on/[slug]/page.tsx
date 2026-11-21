import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { ShareButton } from "@/components/ShareButton";
import Image from "next/image";
import { dateRange, eventImage, getEvent, getEvents } from "@/lib/events";
import { formatPrice, getProductsInCategories } from "@/lib/catalogue";
import { SITE } from "@/lib/seo";
import { EventListing } from "@/components/EventListing";
import { eventPage, eventPageMeta, isStateSlug } from "@/lib/event-pages";

export const revalidate = 120;
// Built on first visit, then cached and refreshed in the background (without this, Next.js rebuilds the page on every visit).
export async function generateStaticParams() { return []; }

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
  const { slug } = await params;
  // /whats-on/qld and the like are state pages, not events.
  if (isStateSlug(slug)) { const page = await eventPage(slug); return page ? eventPageMeta(page) : {}; }
  const e = await getEvent(slug);
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
  const { slug } = await params;
  if (isStateSlug(slug)) { const page = await eventPage(slug); if (!page) notFound(); return <EventListing page={page} />; }
  const e = await getEvent(slug);
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
                  {e.facebook_url && <a href={e.facebook_url} target="_blank" rel="noopener" aria-label={`${e.organiser_name || e.venue} on Facebook`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" /></svg></a>}
                  {e.instagram_url && <a href={e.instagram_url} target="_blank" rel="noopener" aria-label={`${e.organiser_name || e.venue} on Instagram`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077" /></svg></a>}
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
