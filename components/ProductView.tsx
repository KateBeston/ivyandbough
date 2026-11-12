import Image from "next/image";
import Link from "next/link";
import { getLabelMeanings } from "@/lib/labels";
import { focus, getBundleItems, getCategories, getProductsByListingIds, getProductsInCategories, type BundleItem, type Product } from "@/lib/catalogue";
import { supabase } from "@/lib/supabase";
import { Price } from "./Price";
import { DeliveryCheck } from "./DeliveryCheck";
import { AddToBasket } from "./AddToBasket";
import { AfterpayMessage } from "./AfterpayMessage";
import { Gallery } from "./Gallery";
import { NotifyMe } from "./NotifyMe";
import { HeartButton } from "./HeartButton";
import { ShipTo } from "./ShipTo";
import { fullName } from "@/lib/product-name";
import { ProductGrid } from "./ProductGrid";
import { ShareBar } from "./ShareBar";
import { absolute } from "@/lib/seo";

const aud = (n: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: n % 1 ? 2 : 0 }).format(n);

export async function ProductView({ product: listing, preview = false, colour, secondary = false }: { product: Product; preview?: boolean; colour?: string; secondary?: boolean }) {
  // Only one main heading per page: other colour versions (hidden until chosen) use a lookalike heading.
  const Title = secondary ? "p" : "h1";
  // The breadcrumb shows the main category above the product's own category (e.g. Lighting / Fairy Lights).
  const allCats = await getCategories();
  const ownCat = allCats.find((c) => c.id === listing.category_id);
  const parentCat = ownCat?.parent_id ? allCats.find((c) => c.id === ownCat.parent_id) : undefined;
  // A grouped listing is one page. Choosing a colour swaps the photos, price and item number, never the page.
  const versions = listing.variants ?? [];
  const chosen = versions.find((v) => v.sku === colour) ?? versions.find((v) => v.id === listing.id) ?? null;
  const product: Product = chosen ? { ...chosen, name: listing.name, kind: listing.kind, description: listing.description, slug: listing.slug, themes: listing.themes, categories: listing.categories, category_id: listing.category_id, theme_id: listing.theme_id, product_themes: listing.product_themes, listing_id: listing.listing_id, listing_type: listing.listing_type, short_description: listing.short_description } : listing;
  const theme = product.themes;
  const [{ data: settings }, related, picked, { data: palette }, inside, meanings] = await Promise.all([
    supabase.from("delivery_settings").select("free_over").maybeSingle(),
    product.category_id && !preview ? getProductsInCategories([product.category_id]) : Promise.resolve([] as Product[]),
    preview ? Promise.resolve([] as Product[]) : getProductsByListingIds(listing.similar_ids ?? []),
    versions.length ? supabase.from("colours").select("name,hex,hex2") : Promise.resolve({ data: [] as { name: string; hex: string; hex2: string }[] }),
    ["bundle", "pack"].includes(product.product_type ?? "") ? getBundleItems(product.bundle_items ?? []) : Promise.resolve([] as BundleItem[]),
    getLabelMeanings(),
  ]);
  const colourOf = (n: string) => ((palette ?? []) as { name: string; hex: string; hex2: string }[]).find((c) => c.name === n);
  // A product can be more than one colour ("Red, White"): the dot shows the first two, split diagonally.
  const dot = (n?: string) => {
    const found = (n ?? "").split(",").map((x) => colourOf(x.trim())).filter((c): c is { name: string; hex: string; hex2: string } => !!c);
    if (!found.length) return null;
    const a = found[0].hex, b = found[1]?.hex ?? found[0].hex2;
    return <span aria-hidden="true" className="swatch" style={{ background: b ? `linear-gradient(135deg, ${a} 50%, ${b} 50%)` : a }} />;
  };
  const label = listing.option_label || "Colour";
  const freeOver = settings?.free_over === null || settings?.free_over === undefined ? null : Number(settings.free_over);
  const measured = [product.height_cm && `H ${product.height_cm}`, product.width_cm && `W ${product.width_cm}`, product.depth_cm && `D ${product.depth_cm}`].filter(Boolean).join(" x ");
  const details = [
    product.size_label && ["Size", product.size_label],
    product.net_quantity && ["Contents", `${Number(product.net_quantity)} ${product.net_unit}`],
    product.pack_quantity && ["Quantity", product.pack_quantity === 1 ? "Sold individually" : `${product.product_type === "set" ? "Set" : "Pack"} of ${product.pack_quantity}`],
    product.materials && ["Materials", product.materials],
    (measured || product.dimensions) && ["Dimensions", measured ? `${measured} cm` : product.dimensions],
    (product.weight_g || product.weight) && ["Weight", product.weight_g ? `${product.weight_g} g` : product.weight],
    product.brand && ["Brand", product.brand],
    product.made_in && ["Made in", product.made_in],
    pillList(product.colour).length ? ["Colour", <span key="c" className="detail-pills">{pillList(product.colour).map((v) => <em key={v}>{v}</em>)}</span>] : pillList(product.colours).length ? ["Colour", <span key="c" className="detail-pills">{pillList(product.colours).map((v) => <em key={v}>{v}</em>)}</span>] : null,
    pillList(product.material).length ? ["Material", <span key="m" className="detail-pills">{pillList(product.material).map((v) => <em key={v}>{v}</em>)}</span>] : null,
    product.how_to_use && ["How to use", product.how_to_use],
    product.care && ["Care and storage", product.care],
    product.good_to_know && ["Good to know", product.good_to_know],
    product.safety_notes && ["Safety", product.safety_notes],
    product.warranty && ["Warranty", product.warranty],
    product.sku && ["Item no.", product.sku],
  ].filter(Boolean) as [string, React.ReactNode][];
  // "Similar to this": hand-picked listings first, then the family's other colours, then the same category.
  const otherVersions = listing.listing_type === "group" && chosen ? versions.filter((v) => v.id !== chosen.id).map((v) => focus(listing, v.id)) : [];
  const seen = new Set<string>();
  const more = [...picked, ...otherVersions, ...related.filter((p) => p.slug !== listing.slug)]
    .filter((p) => p.price_cents && p.availability !== "Sold out")
    .filter((p) => { const k = `${p.slug}|${p.pick_sku ?? ""}`; if (seen.has(k) || (p.slug === listing.slug && !p.pick_sku)) return false; seen.add(k); return true; })
    .slice(0, 8);
  // The usual groups first, then any added in the portal, in the order they were added.
  const qualities = [...new Set(["Packaging", "Production", "Materials", "Certifications", ...Object.keys(product.qualities ?? {})])].map((g) => [g, (product.qualities?.[g] ?? []).filter(Boolean)] as [string, string[]]).filter(([, l]) => l.length);
  const soldOut = product.availability === "Sold out";
  const comingSoon = product.availability === "Coming soon";
  // A range ("1 to 3") when the product has one; otherwise "within" the number of days.
  const dmin = product.dispatch_days_min, dmax = product.dispatch_days;
  const dispatch = dmax === null || dmax === undefined ? "Ready to dispatch" : dmin !== null && dmin !== undefined && dmin < dmax ? `Dispatches in ${dmin} to ${dmax} business days` : dmax === 0 ? "Dispatches the same business day" : `Dispatches within ${dmax} business ${dmax === 1 ? "day" : "days"}`;

  return (
    <main className="product-page">
      <nav aria-label="Breadcrumb" className="crumbs"><Link href="/">Home</Link>{parentCat && <> / <Link href={`/shop/${parentCat.slug}`}>{parentCat.name}</Link></>}{product.categories ? <> / <Link href={`/shop/${product.categories.slug}`}>{product.categories.name}</Link></> : null} / {product.name}</nav>
      <div className="product-layout">
        <div className="product-gallery"><Gallery key={product.id} images={product.product_media ?? product.product_images} /></div>
        <div className="details">
          <div>
            {theme && <div className="eyebrow">{theme.name}</div>}
            <div className="title-row"><Title className="product-title">{product.name}</Title>{!preview && <HeartButton productId={product.id} name={fullName(product)} className="page-heart" />}</div>
            {product.sale_label && <div className="product-offer-label">{product.sale_label}</div>}
            <div className="price"><Price cents={product.price_cents} wasCents={product.was_cents} gst /></div>
            {!preview && !soldOut && <AfterpayMessage cents={product.price_cents} />}
            <div className="muted price-note">GST included{product.no_discount ? " · Excluded from offers and discount codes" : ""}</div>
            <div className={`stock-line${soldOut ? " sold-out" : ""}`}><span aria-hidden="true" className="stock-dot" />{soldOut ? "Sold out" : comingSoon ? "Coming soon" : `${product.availability || "Available to order"}. ${dispatch}.`}</div>
          </div>
          {versions.length > 1 && chosen && (
            <div className="variant-picker">
              <p className="variant-label">{label}: <strong>{chosen.version_name || chosen.sku}</strong></p>
              <div className="variant-tiles" role="group" aria-label={`Choose a ${label.toLowerCase()}`}>
                {versions.map((v) => {
                  const photo = (v.product_images ?? [])[0];
                  const tile = <>
                    <span className="variant-photo">{photo ? <Image src={photo.url} alt="" fill sizes="80px" className="cover" style={{ objectPosition: photo.position }} /> : null}</span>
                    <span className="variant-name">{v.version_name || v.sku}{v.availability === "Sold out" ? " (sold out)" : ""}</span>
                  </>;
                  return v.id === chosen.id
                    ? <span key={v.id} className="variant-tile on" aria-current="true">{tile}</span>
                    : <Link key={v.id} href={`?colour=${encodeURIComponent(v.sku)}`} replace scroll={false} className={`variant-tile${v.availability === "Sold out" ? " sold" : ""}`} aria-label={v.version_name || v.sku}>{tile}</Link>;
                })}
              </div>
            </div>
          )}
          <p className="lede">{product.short_description || product.description}</p>
          {soldOut || comingSoon ? (preview ? <button type="button" className="solid" disabled>{soldOut ? "Sold out" : "Notify me"}</button> : <NotifyMe key={product.id} productId={product.id} soldOut={soldOut} />) : <AddToBasket product={product} preview={preview} />}
          {!preview && <div className="product-share"><ShareBar url={absolute(`/products/${listing.slug}`)} title={`${product.name} | Ivy & Bough`} text={product.short_description || `${product.name} from Ivy & Bough.`} image={product.product_images[0]?.url ? absolute(product.product_images[0].url) : undefined} /></div>}

          <div className="delivery-box">
            {!preview && <ShipTo shipsFrom={product.ships_from} />}
            <ul>
              <li>{dispatch}, then delivered Australia-wide.</li>
              <li>Delivery is calculated at checkout from your postcode.</li>
              {freeOver !== null && <li>Free standard delivery on orders over {aud(freeOver)}, excluding large items and Christmas trees. <Link href="/delivery">Conditions apply</Link>.</li>}
              <li>{product.final_sale ? <>Final sale: no change-of-mind returns. See our <Link href="/returns">Returns Policy</Link>.</> : product.returns_note ? `Returns: ${product.returns_note}` : <>Easy returns under our <Link href="/returns">Returns Policy</Link>.</>}</li>
            </ul>
            <p className="estimate-note">Dispatch and delivery times are estimates. <Link href="/delivery">Delivery information</Link></p>
            {(() => {
              // States this can't go to: its own, plus any item inside it, with the reason given in the portal.
              const ORDER = ["NSW", "ACT", "VIC", "QLD", "SA", "WA", "TAS", "NT"];
              const states = [...new Set([...(product.blocked_states ?? []), ...inside.flatMap((i) => i.blocked_states ?? [])])].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
              if (!states.length) return null;
              const reason = product.blocked_reason || inside.find((i) => i.blocked_states?.length && i.blocked_reason)?.blocked_reason || "";
              const list = states.length < 2 ? states[0] : `${states.slice(0, -1).join(", ")} or ${states[states.length - 1]}`;
              return <p className="blocked-note">We can&apos;t deliver this to {list}{reason ? `, ${reason}` : ""}.</p>;
            })()}
            {!preview && <DeliveryCheck productId={product.id} />}
            <details>
              <summary>More delivery information</summary>
              <p className="muted">See <Link href="/delivery">delivery rates and Christmas last order dates</Link>, and our <Link href="/returns">Returns Policy</Link>.</p>
            </details>
          </div>

          {theme && <p className="from-collection"><Link href={`/collections/${theme.slug}`}>Shop the {theme.name} collection</Link></p>}

        </div>
        {/* Beside the buying details on wide screens, filling the space under the photos. Below them on phones. */}
        {product.short_description && product.description && (
          <div className="product-long">
            <h2 className="spec-head">About this piece</h2>
            {product.description.split(/\n{2,}/).map((para, k) => <p key={k}>{para}</p>)}
          </div>
        )}
        {/* A hamper's items, across the full width below the photos and buying details. */}
        {inside.length > 0 && <div className="product-inside"><WhatsInside items={inside} /></div>}
      </div>

      {/* The fuller story below the fold: long description, then the details, ingredients and qualities. */}
      {(details.length > 0 || qualities.length > 0 || product.ingredients || product.is_food) && (
        <section className="product-more">
          <div className="product-specs">
            {details.length > 0 && (
              <div className="spec">
                <h2 className="spec-head">Details</h2>
                <ul className="detail-list">{details.map(([k, v]) => <li key={k}><span>{k}</span>{v}</li>)}</ul>
                {product.warranty && <p className="acl-note">Our goods come with guarantees that cannot be excluded under the Australian Consumer Law. You are entitled to a replacement or refund for a major failure and compensation for any other reasonably foreseeable loss or damage. You are also entitled to have the goods repaired or replaced if the goods fail to be of acceptable quality and the failure does not amount to a major failure. <Link href="/returns">Returns and warranties</Link></p>}
              </div>
            )}
            <div className="spec-side">
              {product.is_food ? <FoodInfo product={product} /> : product.ingredients ? <div className="spec"><h2 className="spec-head">Ingredients</h2><p className="ingredients">{ingredientText(product.ingredients)}</p></div> : null}
              {qualities.length > 0 && (
                <div className="spec qualities">
                  {qualities.map(([group, list]) => (
                    <div key={group} className="quality-group">
                      <h2 className="spec-head">{group}</h2>
                      <ul className="quality-pills">{list.map((q) => meanings[`${group}|${q}`]
                        ? <li key={q}><details className="quality-pill has-meaning"><summary>{q}</summary><span className="pill-meaning">{meanings[`${group}|${q}`]}</span></details></li>
                        : <li key={q} className="quality-pill">{q}</li>)}</ul>
                    </div>
                  ))}
                  {Object.keys(meanings).length > 0 && <p className="labels-link"><Link href="/labels">What our labels mean</Link></p>}
                </div>
              )}
            </div>
          </div>
        </section>
      )}
      {more.length > 0 && (
        <section className="related">
          <h2 className="heading">Similar to this</h2>
          <ProductGrid products={more} />
        </section>
      )}
    </main>
  );
}

// A hamper's contents: each item with its quantity and description, and its ingredients and safety notes behind a tap.
function WhatsInside({ items }: { items: BundleItem[] }) {
  const contains = [...new Set(items.flatMap((i) => list(i.allergens_contains)))];
  return (
    <div className="whats-inside">
      <h2 className="spec-head">What&apos;s inside</h2>
      <ul>
        {items.map((i) => {
          const photo = [...(i.product_images ?? [])].filter((m) => m.media_type !== "video").sort((a, b) => a.sort_order - b.sort_order)[0];
          const about = i.short_description || i.description.split(/\n{2,}/)[0] || "";
          return (
            <li key={i.id} className="inside-item">
              {photo && <span className="inside-photo frame"><Image src={photo.url} alt={photo.alt || i.name} fill sizes="80px" className="cover" /></span>}
              <div>
                <h3>{i.quantity > 1 ? `${i.quantity} × ` : ""}{i.name}</h3>
                {about && <p>{about}</p>}
                {(i.dimensions || i.net_quantity) && <p className="inside-size">{[i.net_quantity ? `${i.net_quantity} ${i.net_unit}`.trim() : "", i.dimensions].filter(Boolean).join(" · ")}</p>}
                {(i.ingredients || i.allergens_contains || i.allergens_may_contain) && (
                  <details><summary>Ingredients</summary>
                    {i.ingredients && <p>{ingredientText(i.ingredients)}</p>}
                    {i.allergens_contains && <p><strong>Contains:</strong> {sentence(list(i.allergens_contains))}.</p>}
                    {i.allergens_may_contain && <p><strong>May contain:</strong> {sentence(list(i.allergens_may_contain))}.</p>}
                  </details>
                )}
                {(() => { const labels = [...new Set(Object.values(i.qualities ?? {}).flat().filter(Boolean))]; return labels.length > 0 && <ul className="quality-pills inside-labels">{labels.map((q) => <li key={q} className="quality-pill">{q}</li>)}</ul>; })()}
                {i.how_to_use && <details><summary>How to use</summary><p className="pre-lines">{i.how_to_use}</p></details>}
                {i.care && <details><summary>Care</summary><p className="pre-lines">{i.care}</p></details>}
                {i.good_to_know && <details><summary>Good to know</summary><p className="pre-lines">{i.good_to_know}</p></details>}
                {i.safety_notes && <details><summary>Safety</summary><p>{i.safety_notes}</p></details>}
              </div>
            </li>
          );
        })}
      </ul>
      {contains.length > 0 && <p className="inside-contains"><strong>This hamper contains:</strong> {sentence(contains)}.</p>}
    </div>
  );
}

const NUTRIENTS: [string, string, string][] = [["energy", "Energy", "kJ"], ["protein", "Protein", "g"], ["fat", "Fat, total", "g"], ["saturated", "– saturated", "g"], ["carbs", "Carbohydrate", "g"], ["sugars", "– sugars", "g"], ["fibre", "Dietary fibre", "g"], ["sodium", "Sodium", "mg"]];
const list = (v?: string) => (v ?? "").split(",").map((x) => x.trim()).filter(Boolean);
const sentence = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`).toLowerCase();

// Food and drink: diet labels, ingredients, allergens, nutrition and storage, exactly as the supplier's label gives them.
function FoodInfo({ product }: { product: Product }) {
  const n = product.nutrition ?? {};
  const unit = product.net_unit === "ml" || product.net_unit === "L" ? "mL" : "g";
  const size = Number(n.serving_size) || 0;
  const perServing = (k: string) => n.per_serving?.[k] || (size && n.per100?.[k] ? String(Math.round(Number(n.per100[k]) * size) / 100) : "");
  const rows = NUTRIENTS.filter(([k]) => n.per100?.[k] || n.per_serving?.[k]);
  const diet = list(product.diet), contains = list(product.allergens_contains), may = list(product.allergens_may_contain);
  return (
    <div className="spec food-info">
      {diet.length > 0 && <div><h2 className="spec-head">Diet</h2><ul className="quality-pills">{diet.map((d) => <li key={d} className="quality-pill">{d}</li>)}</ul></div>}
      {product.ingredients && <div><h2 className="spec-head">Ingredients</h2><p>{ingredientText(product.ingredients)}</p></div>}
      {(contains.length > 0 || may.length > 0) && (
        <div><h2 className="spec-head">Allergens</h2>
          {contains.length > 0 && <p><strong>Contains {sentence(contains)}.</strong></p>}
          {may.length > 0 && <p>May contain {sentence(may)}.</p>}
        </div>
      )}
      {rows.length > 0 && (
        <div><h2 className="spec-head">Nutrition information</h2>
          {(n.servings || n.serving_size) && <p className="muted">{n.servings ? `Servings per package: ${n.servings}` : ""}{n.servings && n.serving_size ? ". " : ""}{n.serving_size ? `Serving size: ${n.serving_size} ${unit}` : ""}</p>}
          <table className="nip-table">
            <thead><tr><th /><th>Average per serving</th><th>Average per 100 {unit}</th></tr></thead>
            <tbody>{rows.map(([k, label, u]) => <tr key={k}><th scope="row">{label}</th><td>{perServing(k) ? `${perServing(k)} ${u}` : ""}</td><td>{n.per100?.[k] ? `${n.per100[k]} ${u}` : ""}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {product.storage && <div><h2 className="spec-head">Storage</h2><p>{product.storage}</p></div>}
    </div>
  );
}

const pillList = (v?: string) => (v ?? "").split(",").map((x) => x.trim()).filter(Boolean);

// Ingredients are saved one per line, in label order; customers see them as one list.
// One ingredient per line becomes a sentence; a list of several labels ("Hazelnut Gianduja: …") keeps each label as its own sentence.
const ingredientText = (v?: string) => { const lines = (v ?? "").split("\n").map((x) => x.trim().replace(/\.$/, "")).filter(Boolean); return lines.length ? (lines.some((x) => /^[^:()]{2,50}:\s/.test(x)) ? lines.join(". ") : lines.join(", ")) + "." : ""; };
