import { defaultDesign, type ArticleDesign } from "./article-design";
import { OFFER_COLUMNS, offerPrice, offerText } from "./pricing";
import { supabase } from "./supabase";

export type Theme = { id: string; slug: string; name: string; note: string; line: string; image_url: string; image_alt: string; hero_position: string; card_position: string; hero_shade: number; is_featured: boolean; feature_order: number; seo_title: string; seo_description: string; page_intro: string; page_content: string };
export type ProductImage = { url: string; alt: string; position: string; sort_order: number; media_type?: string };
export type Nutrition = { servings?: string; serving_size?: string; per_serving?: Record<string, string>; per100?: Record<string, string> };
export type Product = { is_food?: boolean; ingredients?: string; allergens_contains?: string; allergens_may_contain?: string; diet?: string; storage?: string; nutrition?: Nutrition | null; listing_id?: string; listing_type?: string; option_label?: string; variants?: Product[]; price_from_cents?: number | null; swatch?: string; status?: string; product_themes?: { themes: { slug: string; name: string } | null }[]; ships_from: string; size_label: string; qualities: Record<string, string[]> | null; made_in: string; product_media?: ProductImage[]; range_name: string; version_name: string; net_quantity: number | null; net_unit: string; brand: string; pack_quantity: number | null; availability: string; returns_note: string; id: string; sku: string; slug: string; name: string; kind: string; description: string; price_cents: number | null; was_cents: number | null; sale_label: string; sale_kind: string; discount_type: string; discount_value: number | null; sale_starts_at: string | null; sale_ends_at: string | null; materials: string; dimensions: string; weight: string; height_cm: number | null; width_cm: number | null; depth_cm: number | null; weight_g: number | null; dispatch_days: number | null; care: string; seo_title: string; seo_description: string; colours: string; category_id: string | null; theme_id: string | null; created_at: string; themes: { name: string; slug: string } | null; categories: { name: string; slug: string } | null; product_images: ProductImage[] };
export type Category = { id: string; slug: string; name: string; intro: string; image_url: string; image_alt: string; image_position: string; parent_id: string | null; seo_title: string; seo_description: string; page_intro: string };
export type DeliveryDate = { region: string; last_order_date: string | null };

// What customers see is a listing. A listing holds one product, a group of versions (such as bow colours) or, later, a bundle.
// Each product is one exact item with its own SKU, price and photos.
const variantSelect = `id,sku,slug,name,brand,ships_from,made_in,size_label,qualities,range_name,version_name,swatch,net_quantity,net_unit,kind,description,price_cents,${OFFER_COLUMNS},materials,dimensions,weight,height_cm,width_cm,depth_cm,weight_g,dispatch_days,availability,pack_quantity,care,returns_note,seo_title,seo_description,colours,category_id,theme_id,created_at,status,is_food,ingredients,allergens_contains,allergens_may_contain,diet,storage,nutrition,product_images(url,alt,position,sort_order,media_type)`;
const listingSelect = `id,slug,listing_type,name,kind,description,category_id,theme_id,sort_order,option_label,seo_title,seo_description,created_at,themes!listings_theme_id_fkey(name,slug),listing_themes(themes(slug,name)),categories(name,slug),listing_products(sort_order,quantity,products(${variantSelect}))`;

type ListingRow = { id: string; slug: string; listing_type: string; name: string; kind: string; description: string; category_id: string | null; theme_id: string | null; sort_order: number; option_label: string; seo_title: string; seo_description: string; created_at: string; themes: { name: string; slug: string } | null; listing_themes: { themes: { slug: string; name: string } | null }[]; categories: { name: string; slug: string } | null; listing_products: { sort_order: number; quantity: number; products: Product | null }[] };

function must<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  return data as T;
}

// Every product leaves here carrying its live price, so a sale reaches the whole site at once.
function sortImages(p: Product): Product {
  const offer = offerPrice(p);
  return { ...p, price_cents: offer.cents, was_cents: offer.wasCents, sale_label: offer.label, product_media: [...p.product_images].sort((a, b) => a.sort_order - b.sort_order), product_images: [...p.product_images].filter((i) => i.media_type !== "video").sort((a, b) => a.sort_order - b.sort_order) };
}

// Turns a listing into what the pages show: the listing's name, words, category and collections,
// with the first available version's price and photos, and every version for the picker.
function fromListing(l: ListingRow): Product | null {
  const variants = [...l.listing_products].sort((a, b) => a.sort_order - b.sort_order).flatMap((lp) => (lp.products ? [sortImages(lp.products)] : []));
  if (!variants.length) return null;
  const lead = variants.find((v) => v.availability !== "Sold out" && v.price_cents !== null) ?? variants[0];
  const prices = variants.map((v) => v.price_cents).filter((c): c is number => c !== null);
  return {
    ...lead, slug: l.slug, name: l.name || lead.name, kind: l.kind || lead.kind, description: l.description || lead.description,
    category_id: l.category_id, theme_id: l.theme_id, themes: l.themes, categories: l.categories, product_themes: l.listing_themes,
    seo_title: l.seo_title, seo_description: l.seo_description, created_at: l.created_at,
    listing_id: l.id, listing_type: l.listing_type, option_label: l.option_label || "Colour",
    variants: l.listing_type === "group" ? variants : undefined,
    price_from_cents: prices.length && Math.min(...prices) !== Math.max(...prices) ? Math.min(...prices) : null,
  };
}
const toProducts = (rows: unknown) => (rows as ListingRow[]).map(fromListing).filter((p): p is Product => p !== null);

export async function getThemes(): Promise<Theme[]> {
  const { data, error } = await supabase.from("themes").select("*").order("sort_order");
  return must(data, error) as Theme[];
}

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from("listings").select(listingSelect).order("sort_order");
  return toProducts(must(data, error));
}

export async function getProduct(slug: string): Promise<Product | null> {
  const { data, error } = await supabase.from("listings").select(listingSelect).eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromListing(data as unknown as ListingRow) : null;
}

// The range is small, so search matches every word against the listing and all of its versions.
export async function searchProducts(query: string): Promise<Product[]> {
  const words = query.toLowerCase().replace(/[^\p{L}\p{N} &-]/gu, " ").trim().split(/\s+/).filter(Boolean).slice(0, 5);
  if (!words.length) return [];
  const all = await getProducts();
  const text = (p: Product) => [p.name, p.kind, p.description, ...(p.variants ?? [p]).flatMap((v) => [v.brand, v.materials, v.version_name, v.colours, v.kind])].join(" ").toLowerCase();
  return all.filter((p) => words.every((w) => text(p).includes(w))).slice(0, 48);
}

export async function getProductPreview(token: string, db: typeof supabase): Promise<Product | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) return null;
  const { data, error } = await db.rpc("listing_preview", { token });
  if (error) throw new Error(error.message);
  return data ? fromListing(data as ListingRow) : null;
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from("categories").select("*").order("sort_order");
  return must(data, error) as Category[];
}

// Only categories with listings to show. A main category stays when any of its subcategories has stock.
export async function getStockedCategories(): Promise<Category[]> {
  const [categories, { data }] = await Promise.all([getCategories(), supabase.from("listings").select("category_id").not("category_id", "is", null)]);
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
  const { data, error } = await supabase.from("listings").select(listingSelect).in("category_id", ids).order("sort_order");
  return toProducts(must(data, error));
}

export async function getProductsBySlugs(slugs: string[]): Promise<Product[]> {
  if (!slugs.length) return [];
  const { data, error } = await supabase.from("listings").select(listingSelect).in("slug", slugs);
  return toProducts(must(data, error));
}

export async function getProductsByTheme(id: string): Promise<Product[]> {
  // A listing belongs to its main collection and to any extra collections it's been added to.
  const { data: extra } = await supabase.from("listing_themes").select("listing_id").eq("theme_id", id);
  const extraIds = ((extra ?? []) as { listing_id: string }[]).map((r) => r.listing_id);
  const { data, error } = await supabase.from("listings").select(listingSelect).or(extraIds.length ? `theme_id.eq.${id},id.in.(${extraIds.join(",")})` : `theme_id.eq.${id}`).order("sort_order");
  return toProducts(must(data, error));
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
