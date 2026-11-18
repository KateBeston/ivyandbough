import { NextResponse } from "next/server";
import { formatPrice } from "@/lib/catalogue";
import { siteSearch } from "@/lib/search";

// Suggestions under the header search box while someone types.
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ collections: [], categories: [], products: [] });
  const { collections, categories, products } = await siteSearch(q, 6);
  return NextResponse.json({
    collections: collections.slice(0, 3).map((t) => ({ name: t.name, href: `/collections/${t.slug}`, image: t.card_image_url || t.image_url })),
    categories: categories.slice(0, 3).map((c) => ({ name: c.name, href: `/shop/${c.slug}` })),
    products: products.map((p) => ({ name: p.name, href: `/products/${p.slug}`, image: p.product_images[0]?.url ?? "", price: p.price_from_cents ? `From ${formatPrice(p.price_from_cents)}` : formatPrice(p.price_cents) })),
  }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
