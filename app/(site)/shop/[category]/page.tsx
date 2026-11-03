import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CollectionHero } from "@/components/CollectionHero";
import { ProductGrid } from "@/components/ProductGrid";
import { getCategories, getCategory, getProductsBy } from "@/lib/catalogue";

export const revalidate = 60;

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCategory((await params).category);
  return { title: c ? `${c.name} | Ivy & Bough` : "Ivy & Bough" };
}

export default async function CategoryPage({ params }: Props) {
  const { category: slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();
  const [products, categories] = await Promise.all([getProductsBy("category_id", category.id), getCategories()]);
  return (
    <main>
      <CollectionHero title={category.name} intro={category.intro} src={category.image_url} alt={category.image_alt} position={category.image_position} />
      <div className="collection-body">
        <nav aria-label="Categories" className="pill-row">
          {categories.map((c) => <Link key={c.id} href={`/shop/${c.slug}`} className={c.id === category.id ? "on" : ""}>{c.name}</Link>)}
        </nav>
        {products.length ? <ProductGrid products={products} /> : <p className="empty">New pieces are being chosen for this collection.</p>}
      </div>
    </main>
  );
}
