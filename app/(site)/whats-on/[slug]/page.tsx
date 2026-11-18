import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { ShareButton } from "@/components/ShareButton";
import { dateRange, eventImage, getEvent, getEvents } from "@/lib/events";
import { SITE } from "@/lib/seo";

export const revalidate = 600;

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
  const more = (await getEvents()).filter((x) => x.id !== e.id).slice(0, 3);
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
            <div className="wo-night"><b>Make a night of it.</b> Our <Link href="/shop/the-table">Christmas table edit</Link> has everything for a festive dinner after the show.</div>
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
