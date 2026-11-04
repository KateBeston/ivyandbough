import type { Metadata } from "next";
import Link from "next/link";
import { ProductGrid } from "@/components/ProductGrid";
import { getCategories, getPosts, getThemes, searchProducts } from "@/lib/catalogue";

export const metadata: Metadata = { title: "Search | Ivy & Bough", robots: { index: false, follow: true } };

const has = (text: string, words: string[]) => words.every((w) => text.toLowerCase().includes(w));

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const raw = (await searchParams).q;
  const query = (Array.isArray(raw) ? raw[0] : raw ?? "").trim().slice(0, 80);
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const [products, themes, categories, posts] = query ? await Promise.all([searchProducts(query), getThemes(), getCategories(), getPosts()]) : [[], [], [], []];
  const collections = themes.filter((t) => has(`${t.name} ${t.note}`, words));
  const shop = categories.filter((c) => has(c.name, words));
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
      {(collections.length > 0 || shop.length > 0) && (
        <div className="search-links">
          {collections.map((t) => <Link key={t.id} href={`/collections/${t.slug}`}>{t.name}</Link>)}
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
