import Link from "next/link";
import { getProductsInCategories, type Product } from "@/lib/catalogue";
import { supabase } from "@/lib/supabase";
import { Price } from "./Price";
import { DeliveryCheck } from "./DeliveryCheck";
import { AddToBasket } from "./AddToBasket";
import { Gallery } from "./Gallery";
import { NotifyMe } from "./NotifyMe";
import { HeartButton } from "./HeartButton";
import { ShipTo } from "./ShipTo";
import { fullName } from "@/lib/product-name";
import { ProductGrid } from "./ProductGrid";

const aud = (n: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: n % 1 ? 2 : 0 }).format(n);

export async function ProductView({ product: listing, preview = false, colour }: { product: Product; preview?: boolean; colour?: string }) {
  // A grouped listing is one page. Choosing a colour swaps the photos, price and item number, never the page.
  const versions = listing.variants ?? [];
  const chosen = versions.find((v) => v.sku === colour) ?? versions.find((v) => v.id === listing.id) ?? null;
  const product: Product = chosen ? { ...chosen, name: listing.name, kind: listing.kind, description: listing.description, slug: listing.slug, themes: listing.themes, categories: listing.categories, category_id: listing.category_id, theme_id: listing.theme_id, product_themes: listing.product_themes, listing_id: listing.listing_id, listing_type: listing.listing_type } : listing;
  const theme = product.themes;
  const [{ data: settings }, related, { data: palette }] = await Promise.all([
    supabase.from("delivery_settings").select("free_over").maybeSingle(),
    product.category_id && !preview ? getProductsInCategories([product.category_id]) : Promise.resolve([] as Product[]),
    versions.length ? supabase.from("colours").select("name,hex,hex2") : Promise.resolve({ data: [] as { name: string; hex: string; hex2: string }[] }),
  ]);
  const colourOf = (n: string) => ((palette ?? []) as { name: string; hex: string; hex2: string }[]).find((c) => c.name === n);
  const dot = (n?: string) => { const c = n ? colourOf(n) : null; if (!c) return null; return <span aria-hidden="true" className="swatch" style={{ background: c.hex2 ? `linear-gradient(135deg, ${c.hex} 50%, ${c.hex2} 50%)` : c.hex }} />; };
  const label = listing.option_label || "Colour";
  const freeOver = settings?.free_over === null || settings?.free_over === undefined ? null : Number(settings.free_over);
  const measured = [product.height_cm && `H ${product.height_cm}`, product.width_cm && `W ${product.width_cm}`, product.depth_cm && `D ${product.depth_cm}`].filter(Boolean).join(" x ");
  const details = [
    product.size_label && ["Size", product.size_label],
    product.net_quantity && ["Contents", `${Number(product.net_quantity)} ${product.net_unit}`],
    product.pack_quantity && ["Quantity", product.pack_quantity === 1 ? "Sold individually" : `Pack of ${product.pack_quantity}`],
    product.materials && ["Materials", product.materials],
    (measured || product.dimensions) && ["Size", measured ? `${measured} cm` : product.dimensions],
    (product.weight_g || product.weight) && ["Weight", product.weight_g ? `${product.weight_g} g` : product.weight],
    product.brand && ["Brand", product.brand],
    product.made_in && ["Made in", product.made_in],
    product.colours && ["Colours", product.colours],
    product.care && ["Care and storage", product.care],
    product.sku && ["Item no.", product.sku],
  ].filter(Boolean) as [string, string][];
  const more = related.filter((p) => p.slug !== listing.slug && p.price_cents && p.availability !== "Sold out").slice(0, 4);
  const qualities = ["Packaging", "Production", "Materials", "Certifications"].map((g) => [g, (product.qualities?.[g] ?? []).filter(Boolean)] as [string, string[]]).filter(([, l]) => l.length);
  const soldOut = product.availability === "Sold out";
  const comingSoon = product.availability === "Coming soon";
  const dispatch = product.dispatch_days !== null ? `Dispatches within ${product.dispatch_days} business ${product.dispatch_days === 1 ? "day" : "days"}` : "Ready to dispatch";

  return (
    <main className="product-page">
      <nav aria-label="Breadcrumb" className="crumbs"><Link href="/">Home</Link>{product.categories ? <> / <Link href={`/shop/${product.categories.slug}`}>{product.categories.name}</Link></> : null} / {product.name}</nav>
      <div className="product-layout">
        <Gallery key={product.id} images={product.product_media ?? product.product_images} />
        <div className="details">
          <div>
            {theme && <div className="eyebrow">{theme.name}</div>}
            <div className="title-row"><h1>{product.name}</h1>{!preview && <HeartButton productId={product.id} name={fullName(product)} className="page-heart" />}</div>
            {product.sale_label && <div className="product-offer-label">{product.sale_label}</div>}
            <div className="price"><Price cents={product.price_cents} wasCents={product.was_cents} /></div>
            <div className="muted price-note">GST included</div>
            <div className={`stock-line${soldOut ? " sold-out" : ""}`}><span aria-hidden="true" className="stock-dot" />{soldOut ? "Sold out" : comingSoon ? "Coming soon" : `${product.availability || "Available to order"}. ${dispatch}.`}</div>
          </div>
          {versions.length > 1 && chosen && (
            <div className="versions">
              <span className="versions-label">{label}: <strong>{chosen.version_name || chosen.sku}</strong></span>
              <div className="versions-list">{versions.map((v) => v.id === chosen.id
                ? <span key={v.id} className="version on" aria-current="true">{dot(v.swatch)}{v.version_name || v.sku}</span>
                : <Link key={v.id} href={`?colour=${encodeURIComponent(v.sku)}`} replace scroll={false} className="version">{dot(v.swatch)}{v.version_name || v.sku}{v.availability === "Sold out" ? " (sold out)" : ""}</Link>)}</div>
            </div>
          )}
          <p className="lede">{product.description}</p>
          {soldOut ? <button type="button" className="solid" disabled>Sold out</button> : comingSoon ? (preview ? <button type="button" className="solid" disabled>Notify me</button> : <NotifyMe productId={product.id} />) : <AddToBasket product={product} preview={preview} />}

          <div className="delivery-box">
            {!preview && <ShipTo shipsFrom={product.ships_from} />}
            <ul>
              <li>{dispatch}, then delivered Australia-wide.</li>
              <li>{freeOver === null ? "Delivery calculated from your postcode." : `Free standard delivery on orders over ${aud(freeOver)}.`}</li>
              <li>{product.returns_note ? `Returns: ${product.returns_note}` : <>Easy returns under our <Link href="/returns">Returns Policy</Link>.</>}</li>
            </ul>
            <details>
              <summary>More delivery information</summary>
              {!preview && <DeliveryCheck productId={product.id} />}
              <p className="muted">See <Link href="/delivery">delivery rates and Christmas last order dates</Link>, and our <Link href="/returns">Returns Policy</Link>.</p>
            </details>
          </div>

          {theme && <p className="from-collection"><Link href={`/collections/${theme.slug}`}>Shop the {theme.name} collection</Link></p>}

          {details.length > 0 && (
            <div className="spec">
              <h2 className="spec-head">Details</h2>
              <ul className="detail-list">{details.map(([k, v]) => <li key={k}><span>{k}</span>{v}</li>)}</ul>
            </div>
          )}
          {qualities.length > 0 && (
            <div className="spec qualities">
              {qualities.map(([group, list]) => (
                <div key={group} className="quality-group">
                  <h2 className="spec-head">{group}</h2>
                  <ul className="quality-pills">{list.map((q) => <li key={q} className="quality-pill">{q}</li>)}</ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {more.length > 0 && (
        <section className="related">
          <h2 className="heading">You may also like</h2>
          <ProductGrid products={more} />
        </section>
      )}
    </main>
  );
}
