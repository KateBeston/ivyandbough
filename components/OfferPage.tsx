import { ProductList } from "@/components/ProductList";
import { getProducts } from "@/lib/catalogue";

export async function OfferPage({ kind }: { kind: "Sale" | "Clearance" }) {
  const products = (await getProducts()).filter((p) => p.sale_label === kind);
  return (
    <main className="shop-page">
      <h1 className="heading">{kind}</h1>
      <div className="offer-grid">{products.length ? <ProductList products={products} /> : <p className="empty">There&apos;s nothing here at the moment. <a href="/shop">Shop everything</a></p>}</div>
    </main>
  );
}
