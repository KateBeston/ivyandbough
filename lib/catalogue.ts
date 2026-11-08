import { defaultDesign, type ArticleDesign } from "./article-design";
import { OFFER_COLUMNS, offerPrice, offerText } from "./pricing";
import { supabase } from "./supabase";

export type Theme = { id: string; slug: string; name: string; note: string; line: string; image_url: string; image_alt: string; hero_position: string; card_position: string; hero_shade: number; is_featured: boolean; feature_order: number; seo_title: string; seo_description: string; page_intro: string; page_content: string };
export type ProductImage = { url: string; alt: string; position: string; sort_order: number };
export type Product = { brand: string; pack_quantity: number | null; availability: string; returns_note: string; id: string; sku: string; slug: string; name: string; kind: string; description: string; price_cents: number | null; was_cents: number | null; sale_label: string; sale_kind: string; discount_type: string; discount_value: number | null; sale_starts_at: string | null; sale_ends_at: string | null; materials: string; dimensions: string; weight: string; height_cm: number | null; width_cm: number | null; depth_cm: number | null; weight_g: number | null; dispatch_days: number | null; care: string; seo_title: string; seo_description: string; colours: string; category_id: string | null; theme_id: string | null; created_at: string; themes: { name: string; slug: string } | null; categories: { name: string; slug: string } | null; product_images: ProductImage[] };
export type Category = { id: string; slug: string; name: string; intro: string; image_url: string; image_alt: string; image_position: string; parent_id: string | null; seo_title: string; seo_description: string; page_intro: string };
export type DeliveryDate = { region: string; last_order_date: string | null };

const productSelect = `id,sku,slug,name,brand,kind,description,price_cents,${OFFER_COLUMNS},materials,dimensions,weight,height_cm,width_cm,depth_cm,weight_g,dispatch_days,availability,pack_quantity,care,returns_note,seo_title,seo_description,colours,category_id,theme_id,created_at,themes(name,slug),categories(name,slug),product_images(url,alt,position,sort_order)`;

function must<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  return data as T;
}

// Every product leaves here carrying its live price, so a sale reaches the whole site at once.
function sortImages(p: Product): Product {
  const offer = offerPrice(p);
  return { ...p, price_cents: offer.cents, was_cents: offer.wasCents, sale_label: offer.label, product_images: [...p.product_images].sort((a, b) => a.sort_order - b.sort_order) };
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

export async function searchProducts(query: string): Promise<Product[]> {
  const words = query.replace(/[^\p{L}\p{N} &-]/gu, " ").trim().split(/\s+/).filter(Boolean).slice(0, 5);
  if (!words.length) return [];
  let request = supabase.from("products").select(productSelect);
  for (const word of words) {
    const term = `"%${word}%"`;
    request = request.or(`name.ilike.${term},brand.ilike.${term},description.ilike.${term},materials.ilike.${term},kind.ilike.${term}`);
  }
  const { data, error } = await request.order("sort_order").limit(48);
  return (must(data, error) as unknown as Product[]).map(sortImages);
}

export async function getProductPreview(token: string, db: typeof supabase): Promise<Product | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) return null;
  const { data, error } = await db.rpc("product_preview", { token });
  if (error) throw new Error(error.message);
  return data ? sortImages(data as Product) : null;
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from("categories").select("*").order("sort_order");
  return must(data, error) as Category[];
}

// Only categories with products to show. A main category stays when any of its subcategories has stock.
export async function getStockedCategories(): Promise<Category[]> {
  const [categories, { data }] = await Promise.all([getCategories(), supabase.from("products").select("category_id").not("category_id", "is", null)]);
  const used = new Set((data ?? []).map((p) => p.category_id as string));
  for (const c of categories) if (c.parent_id && used.has(c.id)) used.add(c.parent_id);
  return categories.filter((c) => used.has(c.id));
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

export async function getDeliverySummary() {
  const { data } = await supabase.from("delivery_settings").select("free_over").maybeSingle();
  const over = data?.free_over === null || data?.free_over === undefined ? null : Number(data.free_over);
  const amount = over === null ? "" : new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: over % 1 ? 2 : 0 }).format(over);
  return `Delivery is calculated from your postcode${over === null ? "" : `, and standard items ship free on orders over ${amount}`}.`;
}

export async function getOfferLinks() {
  const { data } = await supabase.from("products").select(`price_cents,${OFFER_COLUMNS}`).neq("sale_kind", "");
  const live = new Set((data ?? []).map((p) => offerPrice(p).label).filter(Boolean));
  return ["Sale", "Clearance"].filter((k) => live.has(k));
}

export async function getWelcomeOffer(trigger: "Account sign-up" | "Newsletter sign-up") {
  const { data } = await supabase.from("promotions").select("discount_type,discount_value,min_order").eq("trigger", trigger).eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data ? offerText(data) : "";
}

export type Faq = { id: string; category: string; question: string; answer: string };

export async function getFaqs(): Promise<Faq[]> {
  const { data, error } = await supabase.from("faqs").select("id,category,question,answer").eq("is_published", true).order("sort_order");
  return must(data, error) as Faq[];
}
