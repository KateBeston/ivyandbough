import type { MetadataRoute } from "next";
import { getOfferLinks, getPostCategories, getPosts, getProducts, getStockedCategories, getThemes } from "@/lib/catalogue";
import { SITE } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, themes, posts, offers] = await Promise.all([getProducts(), getStockedCategories(), getThemes(), getPosts(), getOfferLinks()]);
  const postCats = (await getPostCategories()).filter((c) => posts.some((p) => p.category === c.name));
  const paths = ["", "/shop", "/shop/new-arrivals", "/shop/gifts-under-25", "/shop/gifts-under-50", "/shop/gifts-under-100", "/collections", "/the-christmas-edit", "/christmas-calculator", "/about", "/contact", "/delivery", "/returns", "/faq", "/privacy", "/terms", "/terms-of-sale", "/account-terms", "/cookies"];
  return [
    ...paths.map((p) => ({ url: `${SITE}${p}` })),
    ...offers.map((o) => ({ url: `${SITE}/shop/${o.toLowerCase()}` })),
    ...categories.map((c) => ({ url: `${SITE}/shop/${c.slug}` })),
    ...themes.map((t) => ({ url: `${SITE}/collections/${t.slug}` })),
    ...products.map((p) => ({ url: `${SITE}/products/${p.slug}`, lastModified: p.created_at })),
    ...postCats.map((c) => ({ url: `${SITE}/the-christmas-edit/category/${c.slug}` })),
    ...posts.map((p) => ({ url: `${SITE}/the-christmas-edit/${p.slug}`, lastModified: p.published_at })),
  ];
}
