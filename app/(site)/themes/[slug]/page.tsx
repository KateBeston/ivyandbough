import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectionHero } from "@/components/CollectionHero";
import { ProductGrid } from "@/components/ProductGrid";
import { getProductsBy, getTheme } from "@/lib/catalogue";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTheme((await params).slug);
  return { title: t ? `${t.name} | Ivy & Bough` : "Ivy & Bough" };
}

export default async function ThemePage({ params }: Props) {
  const theme = await getTheme((await params).slug);
  if (!theme) notFound();
  const products = await getProductsBy("theme_id", theme.id);
  return (
    <main>
      <CollectionHero title={theme.name} intro={theme.line} src={theme.image_url} alt={theme.image_alt} position={theme.hero_position} />
      <div className="collection-body">
        {products.length ? <ProductGrid products={products} /> : <p className="empty">New pieces are being chosen for this collection.</p>}
      </div>
    </main>
  );
}
