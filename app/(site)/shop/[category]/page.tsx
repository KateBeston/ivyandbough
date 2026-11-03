import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CollectionHero } from "@/components/CollectionHero";
import { ProductGrid } from "@/components/ProductGrid";
import { getCategories, getCategory, getProductsInCategories } from "@/lib/catalogue";

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
  const categories = await getCategories();
  const parentId = category.parent_id ?? category.id;
  const parent = categories.find((c) => c.id === parentId) ?? category;
  const family = categories.filter((c) => c.parent_id === parentId);
  const ids = category.parent_id ? [category.id] : [category.id, ...family.map((c) => c.id)];
  const products = await getProductsInCategories(ids);
  return (
    <main>
      <CollectionHero title={category.name} intro={category.intro} src={category.image_url} alt={category.image_alt} position={category.image_position} />
      <div className="collection-body">
        <nav aria-label={`${parent.name} categories`} className="pill-row">
          <Link href={`/shop/${parent.slug}`} className={parent.id === category.id ? "on" : ""}>All {parent.name}</Link>
          {family.map((c) => <Link key={c.id} href={`/shop/${c.slug}`} className={c.id === category.id ? "on" : ""}>{c.name}</Link>)}
        </nav>
        {products.length ? <ProductGrid products={products} /> : <p className="empty">New pieces are being chosen for this collection.</p>}
      </div>
    </main>
  );
}
