import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { ProductList } from "@/components/ProductList";
import { RichText } from "@/components/RichText";
import { getCategories, getProducts } from "@/lib/catalogue";
import { COLOUR_PAGES, SHOP_WIDE, colourPath, colourSlug, findColourPage, hasColour } from "@/lib/colour-pages";
import { absolute, breadcrumbs } from "@/lib/seo";
import { ShareBar } from "@/components/ShareBar";

export const revalidate = 60;
type Props = { params: Promise<{ category: string; colour: string }> };

export function generateStaticParams() {
  return COLOUR_PAGES.map((p) => ({ category: p.category_slug ?? SHOP_WIDE, colour: colourSlug(p.colour) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, colour } = await params;
  const page = findColourPage(category, colour);
  if (!page) return { title: "Ivy & Bough" };
  return { title: page.seo_title, description: page.seo_description, alternates: { canonical: colourPath(page) }, openGraph: { title: page.h1, description: page.seo_description, url: colourPath(page) } };
}

export default async function ColourPage({ params }: Props) {
  const { category, colour } = await params;
  const page = findColourPage(category, colour);
  if (!page) notFound();
  const [all, categories] = await Promise.all([getProducts(), getCategories()]);
  const top = page.category_slug ? categories.find((c) => c.slug === page.category_slug) : undefined;
  const ids = top ? [top.id, ...categories.filter((c) => c.parent_id === top.id).map((c) => c.id)] : [];
  const products = all.filter((p) => hasColour(p, page.colour) && (!top || ids.includes(p.category_id ?? "") || (p.extra_category_ids ?? []).some((id) => ids.includes(id))));
  const siblings = COLOUR_PAGES.filter((p) => p !== page && p.category_slug === page.category_slug);
  const crumbs = [{ name: "Home", path: "" }, { name: top?.name ?? "Shop", path: top ? `/shop/${top.slug}` : "/shop" }, { name: page.h1, path: colourPath(page) }];
  return (
    <main className="colour-page">
      <JsonLd data={breadcrumbs(crumbs)} />
      <header className="colour-head">
        <nav aria-label="Breadcrumb" className="crumbs"><Link href="/">Home</Link> / <Link href={top ? `/shop/${top.slug}` : "/shop"}>{top?.name ?? "Shop"}</Link> / {page.h1}</nav>
        <h1 className="heading">{page.h1}</h1>
        <p>{page.intro}</p>
        <ShareBar url={absolute(colourPath(page))} title={`${page.h1} | Ivy & Bough`} text={page.intro} />
      </header>
      <div className="collection-body">
        {products.length ? <ProductList products={products} /> : <p className="empty">New pieces are on the way.</p>}
      </div>
      <article className="colour-guide">
        <RichText text={page.body} />
      </article>
      {siblings.length > 0 && (
        <nav className="colour-more" aria-label="Shop by colour">
          <h2>{top ? `More ${top.name.toLowerCase()} by colour` : "Shop by colour"}</h2>
          <div className="pill-row">{siblings.map((s) => <Link key={colourPath(s)} href={colourPath(s)}>{s.h1}</Link>)}</div>
        </nav>
      )}
    </main>
  );
}
