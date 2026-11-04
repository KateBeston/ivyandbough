import Link from "next/link";
import { formatPrice, type Product } from "@/lib/catalogue";
import { DELIVERY_SUMMARY } from "@/lib/delivery";
import { AddToBasket } from "./AddToBasket";
import { Gallery } from "./Gallery";

export function ProductView({ product, preview = false }: { product: Product; preview?: boolean }) {
  const theme = product.themes?.name;
  const size = [product.materials || "[Materials]", product.dimensions || "[Dimensions]", product.weight || "[Weight]"].join(" · ");
  return (
    <>
      <main className="product-page">
        <nav aria-label="Breadcrumb" className="crumbs"><Link href="/">Home</Link>{product.categories ? <> / <Link href={`/shop/${product.categories.slug}`}>{product.categories.name}</Link></> : null} / {product.name}</nav>
        <div className="product-layout">
          <Gallery images={product.product_images} />
          <div className="details">
            <div>
              {theme && <div className="eyebrow">{theme}</div>}
              <h1>{product.name}</h1>
              <div className="price">{formatPrice(product.price_cents)}</div>
              <div className="muted">{DELIVERY_SUMMARY}</div>
            </div>
            <p className="lede">{product.description}</p>
            <AddToBasket product={product} preview={preview} />
            <div className="spec">
              <div><h2>Materials and size</h2><p>{size}</p></div>
              <div><h2>Delivery</h2><p>{product.dispatch_days !== null && <>Dispatches in {product.dispatch_days} business days. </>}See our <Link href="/delivery">Christmas last order dates</Link>.</p></div>
              {product.care && <div><h2>Care and storage</h2><p>{product.care}</p></div>}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
