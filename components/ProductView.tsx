import Link from "next/link";
import { getProductsInCategories, type Product } from "@/lib/catalogue";
import { supabase } from "@/lib/supabase";
import { Price } from "./Price";
import { DeliveryCheck } from "./DeliveryCheck";
import { AddToBasket } from "./AddToBasket";
import { Gallery } from "./Gallery";
import { ProductGrid } from "./ProductGrid";

const aud = (n: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: n % 1 ? 2 : 0 }).format(n);

export async function ProductView({ product, preview = false }: { product: Product; preview?: boolean }) {
  const theme = product.themes;
  const [{ data: settings }, related] = await Promise.all([
    supabase.from("delivery_settings").select("free_over").maybeSingle(),
    product.category_id && !preview ? getProductsInCategories([product.category_id]) : Promise.resolve([] as Product[]),
  ]);
  const freeOver = settings?.free_over === null || settings?.free_over === undefined ? null : Number(settings.free_over);
  const measured = [product.height_cm && `H ${product.height_cm}`, product.width_cm && `W ${product.width_cm}`, product.depth_cm && `D ${product.depth_cm}`].filter(Boolean).join(" x ");
  const details = [
    product.materials && ["Materials", product.materials],
    (measured || product.dimensions) && ["Size", measured ? `${measured} cm` : product.dimensions],
    (product.weight_g || product.weight) && ["Weight", product.weight_g ? `${product.weight_g} g` : product.weight],
    product.colours && ["Colours", product.colours],
    product.care && ["Care and storage", product.care],
    product.sku && ["Item no.", product.sku],
  ].filter(Boolean) as [string, string][];
  const more = related.filter((p) => p.id !== product.id && p.price_cents).slice(0, 4);
  const dispatch = product.dispatch_days !== null ? `Dispatches within ${product.dispatch_days} business ${product.dispatch_days === 1 ? "day" : "days"}` : "Ready to dispatch";

  return (
    <main className="product-page">
      <nav aria-label="Breadcrumb" className="crumbs"><Link href="/">Home</Link>{product.categories ? <> / <Link href={`/shop/${product.categories.slug}`}>{product.categories.name}</Link></> : null} / {product.name}</nav>
      <div className="product-layout">
        <Gallery images={product.product_images} />
        <div className="details">
          <div>
            {theme && <div className="eyebrow">{theme.name}</div>}
            <h1>{product.name}</h1>
            {product.sale_label && <div className="product-offer-label">{product.sale_label}</div>}
            <div className="price"><Price cents={product.price_cents} wasCents={product.was_cents} /></div>
            <div className="muted price-note">GST included</div>
            <div className="stock-line"><span aria-hidden="true" className="stock-dot" />Available to order. {dispatch}.</div>
          </div>
          <p className="lede">{product.description}</p>
          <AddToBasket product={product} preview={preview} />

          <div className="delivery-box">
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
