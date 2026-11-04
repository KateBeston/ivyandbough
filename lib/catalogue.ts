import { defaultDesign, type ArticleDesign } from "./article-design";
import { supabase } from "./supabase";

export type Theme = { id: string; slug: string; name: string; note: string; line: string; image_url: string; image_alt: string; hero_position: string; card_position: string; hero_shade: number; is_featured: boolean; feature_order: number; seo_title: string; seo_description: string; page_intro: string; page_content: string };
export type ProductImage = { url: string; alt: string; position: string; sort_order: number };
export type Product = { id: string; slug: string; name: string; kind: string; description: string; price_cents: number | null; materials: string; dimensions: string; weight: string; dispatch_days: number | null; care: string; seo_title: string; seo_description: string; themes: { name: string; slug: string } | null; categories: { name: string; slug: string } | null; product_images: ProductImage[] };
export type Category = { id: string; slug: string; name: string; intro: string; image_url: string; image_alt: string; image_position: string; parent_id: string | null };
export type DeliveryDate = { region: string; last_order_date: string | null };

const productSelect = "id,slug,name,kind,description,price_cents,materials,dimensions,weight,dispatch_days,care,seo_title,seo_description,themes(name,slug),categories(name,slug),product_images(url,alt,position,sort_order)";

function must<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  return data as T;
}

function sortImages(p: Product): Product {
  return { ...p, product_images: [...p.product_images].sort((a, b) => a.sort_order - b.sort_order) };
}

export async function getThemes(): Promise<Theme[]> {
  const { data, error } = await supabase.from("themes").select("*").order("sort_order");
  return must(data, error) as Theme[];
}

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from("products").select(productSelect).order("sort_order");
  return (must(data, error) as unknown as Product[]).map(sortImages);
}

export async function getProduct(slug: string): Promise<Product | null> {
  const { data, error } = await supabase.from("products").select(productSelect).eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? sortImages(data as unknown as Product) : null;
}

export async function getProductPreview(token: string): Promise<Product | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) return null;
  const { data, error } = await supabase.rpc("product_preview", { token });
  if (error) throw new Error(error.message);
  return data ? sortImages(data as Product) : null;
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from("categories").select("*").order("sort_order");
  return must(data, error) as Category[];
}

export async function getCategory(slug: string): Promise<Category | null> {
  const { data, error } = await supabase.from("categories").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Category | null;
}

export async function getTheme(slug: string): Promise<Theme | null> {
  const { data, error } = await supabase.from("themes").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Theme | null;
}

export async function getProductsInCategories(ids: string[]): Promise<Product[]> {
  const { data, error } = await supabase.from("products").select(productSelect).in("category_id", ids).order("sort_order");
  return (must(data, error) as unknown as Product[]).map(sortImages);
}

export async function getProductsBySlugs(slugs: string[]): Promise<Product[]> {
  if (!slugs.length) return [];
  const { data, error } = await supabase.from("products").select(productSelect).in("slug", slugs);
  return (must(data, error) as unknown as Product[]).map(sortImages);
}

export async function getProductsByTheme(id: string): Promise<Product[]> {
  const { data, error } = await supabase.from("products").select(productSelect).eq("theme_id", id).order("sort_order");
  return (must(data, error) as unknown as Product[]).map(sortImages);
}

export async function getDeliveryDates(): Promise<DeliveryDate[]> {
  const { data, error } = await supabase.from("delivery_dates").select("region,last_order_date").order("sort_order");
  return must(data, error) as DeliveryDate[];
}

export function formatPrice(cents: number | null) {
  if (cents === null) return "[YOUR PRICE]";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(cents / 100);
}

export function formatDate(date: string | null) {
  if (!date) return "[DATE]";
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", timeZone: "Australia/Brisbane" }).format(new Date(date));
}

export type PostProduct = { slug?: string; name?: string; image?: string; alt?: string; price?: string; shop?: string; url?: string };
export type PostSection = { type?: "section" | "photo" | "pair" | "quote" | "divider"; heading: string; text: string; image: string; alt: string; position: string; credit?: string; note?: string; products?: PostProduct[]; shape?: string; size?: string; align?: string; columns?: number; width?: string; image2?: string; alt2?: string; position2?: string; style?: string };
export type Post = { id: string; slug: string; title: string; excerpt: string; intro: string; category: string; author: string; sections: PostSection[]; image_url: string; image_alt: string; image_position: string; image_credit: string; published_at: string };

export async function getPosts(): Promise<Post[]> {
  const { data, error } = await supabase.from("posts").select("*").order("published_at", { ascending: false });
  return must(data, error) as Post[];
}

export async function getPost(slug: string): Promise<Post | null> {
  const { data, error } = await supabase.from("posts").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Post | null;
}

export async function getArticleDesign(): Promise<ArticleDesign> {
  const { data } = await supabase.from("site_settings").select("value").eq("key", "article_design").maybeSingle();
  return { ...defaultDesign, ...(data?.value as Partial<ArticleDesign> | undefined) };
}
