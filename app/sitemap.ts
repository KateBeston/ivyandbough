import type { MetadataRoute } from "next";
import { getOfferLinks, getPosts, getProducts, getStockedCategories, getThemes } from "@/lib/catalogue";
import { SITE } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, themes, posts, offers] = await Promise.all([getProducts(), getStockedCategories(), getThemes(), getPosts(), getOfferLinks()]);
  const paths = ["", "/shop", "/collections", "/the-christmas-edit", "/about", "/contact", "/delivery", "/returns", "/faq", "/privacy", "/terms", "/terms-of-sale", "/account-terms", "/cookies"];
  return [
    ...paths.map((p) => ({ url: `${SITE}${p}` })),
    ...offers.map((o) => ({ url: `${SITE}/shop/${o.toLowerCase()}` })),
    ...categories.map((c) => ({ url: `${SITE}/shop/${c.slug}` })),
    ...themes.map((t) => ({ url: `${SITE}/collections/${t.slug}` })),
    ...products.map((p) => ({ url: `${SITE}/products/${p.slug}`, lastModified: p.created_at })),
    ...posts.map((p) => ({ url: `${SITE}/the-christmas-edit/${p.slug}`, lastModified: p.published_at })),
  ];
}
