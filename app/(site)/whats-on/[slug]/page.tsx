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
  const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.name)}&dates=${e.start_date.replace(/-/g, "")}/${(() => { const d = new Date(`${e.end_date || e.start_date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10).replace(/-/g, ""); })()}&location=${encodeURIComponent([e.venue, e.suburb, e.state].filter(Boolean).join(", "))}&details=${encodeURIComponent(`${e.time_text}\n${SITE}/whats-on/${e.slug}`)}`;
  return (
    <div className="wo wo-detail">
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "Event", name: e.name, description: e.about, startDate: e.start_date, ...(e.end_date ? { endDate: e.end_date } : {}),
        eventStatus: "https://schema.org/EventScheduled", eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        image: [image.startsWith("http") ? image : `${SITE}${image}`],
        location: { "@type": "Place", name: e.venue || e.suburb, address: { "@type": "PostalAddress", streetAddress: e.address || undefined, addressLocality: e.suburb, addressRegion: e.state, addressCountry: "AU" } },
        ...(e.organiser_name ? { organizer: { "@type": "Organization", name: e.organiser_name, ...(e.official_url ? { url: e.official_url } : {}) } } : {}),
        ...(free || e.booking_url ? { offers: { "@type": "Offer", url: e.booking_url || e.official_url || `${SITE}/whats-on/${e.slug}`, ...(free ? { price: 0, priceCurrency: "AUD" } : {}), availability: "https://schema.org/InStock" } } : {}),
      }} />
      <div className="wo-wrap">
        <p className="wo-crumb"><Link href="/whats-on">What&apos;s On</Link> / {e.event_type}</p>
        <div className="wo-detail-grid">
          <div className="wo-detail-img"><img src={image} alt={e.name} />{e.image_url && e.image_credit && <small>Image: {e.image_credit}</small>}</div>
          <div>
            <p className="wo-kick dark">{e.event_type}{e.is_featured ? " · Ivy & Bough pick" : ""}</p>
            <h1>{e.name}</h1>
            {e.about && <p className="wo-about">{e.about}</p>}
            <dl className="wo-facts">
              <dt>When</dt><dd>{dateRange(e, true)}{e.time_text && <><br />{e.time_text}</>}</dd>
              <dt>Where</dt><dd>{[e.venue, e.address, e.suburb].filter(Boolean).join(", ")}</dd>
              {e.price_text && <><dt>Cost</dt><dd>{e.price_text}</dd></>}
              {e.organiser_name && <><dt>Organiser</dt><dd>{e.organiser_name}</dd></>}
              <dt>Listing</dt><dd>{e.source === "Organiser" ? "Provided by the organiser" : "Compiled by Ivy & Bough from official sources"}</dd>
            </dl>
            <div className="wo-acts">
              {e.booking_url && <a className="wo-btn dark" href={e.booking_url} target="_blank" rel="noopener">Book tickets</a>}
              {e.official_url && <a className={`wo-btn ${e.booking_url ? "" : "dark"}`} href={e.official_url} target="_blank" rel="noopener">Official event page</a>}
              <a className="wo-btn" href={`/whats-on/${e.slug}/event.ics`}>Add to calendar</a>
              <a className="wo-btn" href={gcal} target="_blank" rel="noopener">Google Calendar</a>
              <ShareButton title={e.name} />
            </div>
            {e.booking_url && <p className="wo-note">Tickets are sold by the organiser. Ivy &amp; Bough doesn&apos;t handle bookings.</p>}
            {shop.items.length > 0 && (
              <aside className="wo-shop" aria-label="Shop Ivy &amp; Bough">
                <p className="wo-kick dark">From the Ivy &amp; Bough shop</p>
                <h2>{shop.title}</h2>
                <div className="wo-shop-list">{shop.items.map((p) => (
                  <Link key={p.id} href={`/products/${p.slug}`}>
                    <Image src={p.product_images[0].url} alt={p.product_images[0].alt || p.name} width={160} height={160} sizes="(max-width:860px) 40vw, 80px" quality={75} />
                    <span><strong>{p.name.split(",")[0]}</strong><em>{p.price_from_cents ? `From ${formatPrice(p.price_from_cents)}` : formatPrice(p.price_cents)}</em></span>
                  </Link>
                ))}</div>
                <Link className="wo-shop-more" href={shop.href}>{shop.link}</Link>
              </aside>
            )}
            <p className="wo-note">Are you the organiser? <a href={`mailto:hello@ivyandbough.com?subject=${encodeURIComponent(`Update listing: ${e.name}`)}`}>Update this listing</a></p>
          </div>
        </div>
        {more.length > 0 && (
          <section className="wo-more"><h2>More this Christmas</h2><div>{more.map((m) => (
            <Link key={m.id} href={`/whats-on/${m.slug}`}><img src={eventImage(m)} alt="" loading="lazy" /><span className="wo-kick dark">{dateRange(m)}</span><strong>{m.name}</strong></Link>
          ))}</div></section>
        )}
      </div>
    </div>
  );
}
