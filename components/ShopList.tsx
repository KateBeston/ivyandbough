import { ProductList } from "@/components/ProductList";
import { getProducts, type Product } from "@/lib/catalogue";

export const PRICE_BANDS = [25, 50, 100] as const;

// Lists that fill themselves: newest pieces, or gifts within a price.
export async function ShopList({ title, intro, pick }: { title: string; intro: string; pick: (all: Product[]) => Product[] }) {
  const products = pick((await getProducts()).filter((p) => p.price_cents && p.availability !== "Sold out"));
  return (
    <main className="shop-page">
      <h1 className="heading">{title}</h1>
      <p className="lede" style={{ marginTop: 8 }}>{intro}</p>
      <div className="offer-grid">{products.length ? <ProductList products={products} /> : <p className="empty">New pieces are on their way. <a href="/shop">Shop everything</a></p>}</div>
    </main>
  );
}

export const newest = (all: Product[]) => [...all].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 24);
export const under = (dollars: number) => (all: Product[]) => all.filter((p) => (p.price_cents ?? 0) <= dollars * 100).sort((a, b) => (b.price_cents ?? 0) - (a.price_cents ?? 0));
