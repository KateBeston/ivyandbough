import type { Metadata } from "next";
import Link from "next/link";
import { ProductGrid } from "@/components/ProductGrid";
import Image from "next/image";
import { getPosts } from "@/lib/catalogue";
import { siteSearch } from "@/lib/search";

export const metadata: Metadata = { title: "Search | Ivy & Bough", robots: { index: false, follow: true } };

const has = (text: string, words: string[]) => words.every((w) => text.toLowerCase().includes(w));

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const raw = (await searchParams).q;
  const query = (Array.isArray(raw) ? raw[0] : raw ?? "").trim().slice(0, 80);
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const [found, posts] = query ? await Promise.all([siteSearch(query), getPosts()]) : [{ collections: [], categories: [], products: [] }, []];
  const { collections, categories: shop, products } = found;
  const articles = posts.filter((p) => has(`${p.title} ${p.excerpt}`, words));
  const empty = query && !products.length && !collections.length && !shop.length && !articles.length;
  return (
    <main className="collection-body">
      <h1 className="heading">{query ? `Search results for "${query}"` : "Search"}</h1>
      <form action="/search" role="search" className="search-page-form">
        <input type="search" name="q" defaultValue={query} placeholder="Search products, collections and articles" aria-label="Search the site" />
        <button type="submit" className="solid">Search</button>
      </form>
      {empty && <p>No results yet. Try another word, or <Link href="/collections">explore all collections</Link>.</p>}
      {collections.length > 0 && (
        <div className="search-collections">
          {collections.map((t) => (
            <Link key={t.id} href={`/collections/${t.slug}`} className="search-collection">
              <span className="frame"><Image src={t.card_image_url || t.image_url} alt={`${t.name} Christmas collection`} fill sizes="(max-width: 760px) 100vw, 400px" className="cover" style={{ objectPosition: t.card_position }} /></span>
              <span><small>Collection</small><strong>{t.name}</strong>{t.note && <em>{t.note}</em>}<u>Shop the collection</u></span>
            </Link>
          ))}
        </div>
      )}
      {shop.length > 0 && (
        <div className="search-links">
          {shop.map((c) => <Link key={c.id} href={`/shop/${c.slug}`}>{c.name}</Link>)}
        </div>
      )}
      {products.length > 0 && <ProductGrid products={products} />}
      {articles.length > 0 && (
        <section className="search-articles">
          <h2 className="heading">From The Christmas Edit</h2>
          {articles.map((p) => <p key={p.id}><Link href={`/the-christmas-edit/${p.slug}`}>{p.title}</Link></p>)}
        </section>
      )}
    </main>
  );
}
