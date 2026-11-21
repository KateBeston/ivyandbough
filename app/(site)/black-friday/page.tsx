import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CollectionHero } from "@/components/CollectionHero";
import { getCategories } from "@/lib/catalogue";
import { campaignDates, campaignState, categoryQualifies, codeMinimum, codeOffer, getCampaignCodes } from "@/lib/campaigns";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const live = campaignState(await getCampaignCodes("Black Friday")) === "live";
  return { title: "Black Friday | Ivy & Bough", description: "Black Friday at Ivy & Bough: $10 off trees, wreaths, garlands, outdoor and lighting, and $20 off when you spend $150. Delivered across Australia.", alternates: { canonical: "/black-friday" }, ...(live ? {} : { robots: { index: false, follow: true } }) };
}

// The main categories in the order they appear on the page.
const ORDER = ["trees", "wreaths-garlands", "outdoor", "lighting", "the-table", "tree-decorations", "entertaining", "the-home", "gifts"];

export default async function BlackFridayPage() {
  const [codes, categories] = await Promise.all([getCampaignCodes("Black Friday"), getCategories()]);
  const state = campaignState(codes);
  const dates = codes[0] ? campaignDates(codes[0]) : null;
  const hero = categories.find((c) => c.slug === "trees");
  const mains = ORDER.map((slug) => categories.find((c) => c.slug === slug && !c.parent_id)).filter(Boolean) as typeof categories;
  const dealFor = (id: string) => codes.find((c) => c.include_categories.length && categoryQualifies(c, id)) ?? codes.find((c) => categoryQualifies(c, id));
  const intro = state === "before" && dates ? `Starts ${dates.start}. Two simple codes across the whole shop.` : state === "live" && dates ? `On now until ${dates.end}. Two simple codes across the whole shop.` : "Black Friday has finished for this year. Thank you for shopping with us.";
  return (
    <main>
      <CollectionHero title="Black Friday" intro={intro} src={hero?.image_url ?? ""} alt={hero?.image_alt ?? ""} position={hero?.image_position ?? "center"} />
      {state !== "after" && (
        <>
          <section className="bf-codes" aria-label="Black Friday codes">
            {codes.map((c) => (
              <div key={c.id} className="bf-code">
                <p className="eyebrow">{c.include_categories.length ? "Trees and large pieces" : "Everything else"}</p>
                <h2>{codeOffer(c)}</h2>
                <p>{c.include_categories.length ? `Trees, wreaths, garlands, outdoor and lighting${codeMinimum(c) ? `, when you spend ${codeMinimum(c)} or more on them` : ""}.` : `When you spend ${codeMinimum(c)} or more on table, decorations, entertaining, home and gifts.`}</p>
                <p className="bf-code-tag">Use code <strong>{c.code}</strong> at checkout</p>
              </div>
            ))}
          </section>
          <div className="collection-body">
            <div className="category-grid">
              {mains.map((m) => {
                const deal = dealFor(m.id);
                return (
                  <Link key={m.id} href={`/shop/${m.slug}`} className="category-card">
                    <span className="frame">{m.image_url ? <Image src={m.image_url} alt={m.image_alt || m.name} fill sizes="(max-width: 760px) 100vw, 33vw" className="cover" style={{ objectPosition: m.image_position }} /> : null}</span>
                    <strong>{m.name}</strong>
                    {deal && <span className="bf-tile-deal">{codeOffer(deal)}{deal.include_categories.length ? "" : ` when you spend ${codeMinimum(deal)}`} · {deal.code}</span>}
                  </Link>
                );
              })}
            </div>
            <div className="bf-terms">
              <h2>The fine print</h2>
              <ul>
                {dates && <li>{state === "live" ? `Codes work until 11:59pm ${dates.end} (Brisbane time).` : `Codes work from ${dates.start} to 11:59pm ${dates.end} (Brisbane time).`}</li>}
                <li>One code per order. Codes come off the price of qualifying items; delivery isn&apos;t discounted.</li>
                {codes.map((c) => <li key={c.id}><strong>{c.code}</strong>: {codeOffer(c)} {c.include_categories.length ? "trees, wreaths, garlands, outdoor and lighting" : "table, decorations, entertaining, home and gifts"}{codeMinimum(c) ? `, with ${codeMinimum(c)} or more of those items in your basket` : ""}.{c.exclude_suppliers.length ? " Some large items are excluded and show the full price at checkout." : ""}</li>)}
                <li>Free delivery on standard items over $150 still applies.</li>
                <li>Some items are excluded from offers, as shown on their product page.</li>
              </ul>
            </div>
          </div>
        </>
      )}
      {state === "after" && <div className="collection-body"><p className="empty"><Link href="/shop">Shop the full range</Link></p></div>}
    </main>
  );
}
