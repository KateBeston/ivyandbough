import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ProductGrid } from "@/components/ProductGrid";
import { getCategories, getProducts } from "@/lib/catalogue";

export const revalidate = 60;
export const metadata: Metadata = { title: "Shop | Ivy & Bough" };

export default async function ShopPage() {
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);
  return (
    <main className="collection-body">
      <div className="centre">
        <h1 className="heading">Shop everything</h1>
      </div>
      <div className="category-grid" style={{ marginBottom: 88 }}>
        {categories.filter((c) => !c.parent_id).map((c) => (
          <Link key={c.id} href={`/shop/${c.slug}`} className="category-card">
            <div className="frame" style={{ height: 320 }}><Image src={c.image_url} alt={c.image_alt} fill sizes="(max-width: 760px) 100vw, 25vw" className="cover" style={{ objectPosition: c.image_position }} /></div>
            <strong>{c.name}</strong>
          </Link>
        ))}
      </div>
      <h2 className="heading" style={{ marginBottom: 36 }}>All pieces</h2>
      <ProductGrid products={products} />
    </main>
  );
}
