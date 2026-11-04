import Link from "next/link";
import { formatPrice, getDeliverySummary, type Product } from "@/lib/catalogue";
import { DeliveryCheck } from "./DeliveryCheck";
import { AddToBasket } from "./AddToBasket";
import { Gallery } from "./Gallery";

export async function ProductView({ product, preview = false }: { product: Product; preview?: boolean }) {
  const theme = product.themes?.name;
  const deliverySummary = await getDeliverySummary();
  const measured = [product.height_cm && `H ${product.height_cm}`, product.width_cm && `W ${product.width_cm}`, product.depth_cm && `D ${product.depth_cm}`].filter(Boolean).join(" x ");
  const size = [product.materials, measured ? `${measured} cm` : product.dimensions, product.weight_g ? `${product.weight_g} g` : product.weight].filter(Boolean).join(" · ");
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
              <div className="muted">{deliverySummary}</div>
              {!preview && <DeliveryCheck productId={product.id} />}
            </div>
            <p className="lede">{product.description}</p>
            <AddToBasket product={product} preview={preview} />
            <div className="spec">
              {size && <div><h2>Materials and size</h2><p>{size}</p></div>}
              <div><h2>Delivery</h2><p>{product.dispatch_days !== null && <>Dispatches in {product.dispatch_days} business days. </>}See our <Link href="/delivery">Christmas last order dates</Link>.</p></div>
              {product.care && <div><h2>Care and storage</h2><p>{product.care}</p></div>}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
