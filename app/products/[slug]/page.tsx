import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Gallery } from "@/components/Gallery";
import { Nav } from "@/components/Nav";
import { formatPrice, getProduct } from "@/lib/catalogue";

export const revalidate = 60;

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  const theme = product.themes?.name;
  const size = [product.materials || "[Materials]", product.dimensions || "[Dimensions]", product.weight || "[Weight]"].join(" · ");
  return (
    <>
      <Nav solid />
      <main className="product-page">
        <nav aria-label="Breadcrumb" className="crumbs"><Link href="/">Home</Link>{theme ? <> / <Link href="/#themes">{theme}</Link></> : null} / {product.name}</nav>
        <div className="product-layout">
          <Gallery images={product.product_images} />
          <div className="details">
            <div>
              {theme && <div className="eyebrow">{theme}</div>}
              <h1>{product.name}</h1>
              <div className="price">{formatPrice(product.price_cents)}</div>
              <div className="muted">Delivery calculated at checkout.</div>
            </div>
            <p className="lede">{product.description}</p>
            <label className="qty">Quantity<input type="number" min={1} defaultValue={1} /></label>
            <div className="buy">
              <button type="button" className="solid">Add to basket</button>
              <div className="express"><button type="button">Apple Pay</button><button type="button">Google Pay</button></div>
            </div>
            <div className="spec">
              <div><h2>Materials and size</h2><p>{size}</p></div>
              <div><h2>Delivery</h2><p>Dispatches in {product.dispatch_days ?? "[X]"} business days. Order by [CUT-OFF DATE] for Christmas delivery to [STATE].</p></div>
              <div><h2>Keeping it for years</h2><p>{product.care || "[How to store it so it comes out beautifully every Christmas.]"}</p></div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
