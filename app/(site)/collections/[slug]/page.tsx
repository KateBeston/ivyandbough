import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CollectionHero } from "@/components/CollectionHero";
import { JsonLd } from "@/components/JsonLd";
import { ProductList } from "@/components/ProductList";
import { RichText } from "@/components/RichText";
import { getPosts, getProductsByTheme, getTheme, getThemes } from "@/lib/catalogue";
import { breadcrumbs } from "@/lib/seo";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTheme((await params).slug);
  if (!t) return { title: "Ivy & Bough" };
  const description = t.seo_description || t.line;
  return { title: t.seo_title || `${t.name} | Ivy & Bough`, description, alternates: { canonical: `/collections/${t.slug}` }, openGraph: { title: t.name, description, url: `/collections/${t.slug}`, images: [t.image_url] } };
}

export default async function CollectionPage({ params }: Props) {
  const theme = await getTheme((await params).slug);
  if (!theme) notFound();
  const [products, themes, posts] = await Promise.all([getProductsByTheme(theme.id), getThemes(), getPosts()]);
  const others = themes.filter((t) => t.id !== theme.id);
  const start = Math.max(0, themes.findIndex((t) => t.id === theme.id));
  const related = [0, 1, 2].map((n) => others[(start + n) % others.length]);
  return (
    <main>
      <JsonLd data={breadcrumbs([{ name: "Home", path: "" }, { name: "Collections", path: "/collections" }, { name: theme.name, path: `/collections/${theme.slug}` }])} />
      <CollectionHero title={theme.name} intro={theme.line} src={theme.image_url} alt={theme.image_alt} position={theme.hero_position} />
      {theme.page_intro && <div className="collection-intro"><p>{theme.page_intro}</p></div>}
      <div className="collection-body">
        {products.length ? <ProductList products={products} /> : <p className="empty">New pieces are being chosen for this collection.</p>}
      </div>
      {theme.page_content && <section className="collection-copy"><RichText text={theme.page_content} /></section>}
      <section className="collection-more">
        <div className="magazine-head">
          <h2 className="heading">More collections</h2>
          <Link href="/collections" className="text-link">Explore all collections</Link>
        </div>
        <div className="collections-index three">
          {related.map((t) => (
            <Link key={t.id} href={`/collections/${t.slug}`}>
              <div className="frame"><Image src={t.image_url} alt="" fill sizes="(max-width: 760px) 50vw, 33vw" className="cover" style={{ objectPosition: t.card_position }} /></div>
              <strong>{t.name}</strong>
              <span>{t.note}</span>
            </Link>
          ))}
        </div>
      </section>
      {posts.length > 0 && (
        <section className="collection-more">
          <div className="magazine-head">
            <h2 className="heading">From The Christmas Edit</h2>
            <Link href="/the-christmas-edit" className="text-link">Read more</Link>
          </div>
          <div className="collections-index three">
            {posts.slice(0, 3).map((p) => (
              <Link key={p.id} href={`/the-christmas-edit/${p.slug}`}>
                <div className="frame"><Image src={p.image_url} alt="" fill sizes="(max-width: 760px) 50vw, 33vw" className="cover" style={{ objectPosition: p.image_position }} /></div>
                <strong>{p.title}</strong>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
