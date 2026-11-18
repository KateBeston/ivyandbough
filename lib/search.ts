import { getCategories, getProductsByTheme, getProductsInCategories, getThemes, searchProducts, type Category, type Product, type Theme } from "@/lib/catalogue";

const wordsOf = (q: string) => q.toLowerCase().replace(/[^\p{L}\p{N} &-]/gu, " ").trim().split(/\s+/).filter(Boolean).slice(0, 5);
const has = (text: string, words: string[]) => { const t = text.toLowerCase(); return words.every((w) => t.includes(w)); };

// A search for "champagne" finds the Champagne Dreams collection, puts it first, and lists every product in it,
// then products in matching shop categories, then any other product whose words match.
export async function siteSearch(query: string, limit = 120): Promise<{ collections: Theme[]; categories: Category[]; products: Product[] }> {
  const words = wordsOf(query);
  if (!words.length) return { collections: [], categories: [], products: [] };
  const [themes, categories] = await Promise.all([getThemes(), getCategories()]);
  const collections = themes.filter((t) => (t as Theme & { is_active?: boolean }).is_active !== false && has(`${t.name} ${t.note ?? ""}`, words));
  const cats = categories.filter((c) => has(c.name, words));
  const catIds = [...new Set(cats.flatMap((c) => [c.id, ...categories.filter((x) => x.parent_id === c.id).map((x) => x.id)]))];
  const [inCollections, inCategories, byText] = await Promise.all([
    Promise.all(collections.map((t) => getProductsByTheme(t.id))).then((r) => r.flat()),
    catIds.length ? getProductsInCategories(catIds) : Promise.resolve([] as Product[]),
    searchProducts(query),
  ]);
  const seen = new Set<string>();
  const products = [...inCollections, ...inCategories, ...byText].filter((p) => { const k = p.listing_id ?? p.id; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, limit);
  return { collections, categories: cats, products };
}
