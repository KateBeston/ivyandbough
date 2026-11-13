import { createHmac, timingSafeEqual } from "crypto";
import { admin } from "./server";

// The link in the review email. It only lets someone review items from that one order.
const code = (orderId: string) => createHmac("sha256", `review:${process.env.SUPABASE_SECRET_KEY}`).update(orderId).digest("hex");
export const reviewToken = code;
export function validReviewToken(orderId: string, given: string) {
  const a = Buffer.from(code(orderId));
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type Review = { id: string; product_id: string; display_name: string; rating: number; body: string; photo_url: string; reply: string; approved_at: string | null; created_at: string };
const PUBLIC = "id,product_id,display_name,rating,body,photo_url,reply,approved_at,created_at";

// Only approved reviews from real orders are ever shown. Email addresses never leave the server.
export async function getReviews(productIds: string[]) {
  const db = admin();
  if (!db || !productIds.length) return { reviews: [] as Review[], average: 0, count: 0 };
  const { data } = await db.from("product_reviews").select(PUBLIC).in("product_id", productIds).eq("status", "Approved").order("approved_at", { ascending: false }).limit(200);
  const reviews = (data ?? []) as Review[];
  const count = reviews.length;
  const average = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
  return { reviews, average, count };
}

export type RecentReview = { name: string; rating: number; body: string; product: string; slug: string; image: string };

// For the review pop-up: recent approved reviews of live products, 4 stars and up, with something written.
export async function getRecentReviews(limit = 12): Promise<RecentReview[]> {
  const db = admin();
  if (!db) return [];
  const { data } = await db.from("product_reviews")
    .select("display_name,rating,body,photo_url,products(name,slug,status,product_images(url,sort_order))")
    .eq("status", "Approved").gte("rating", 4).neq("body", "").order("approved_at", { ascending: false }).limit(limit * 2);
  const rows = (data ?? []) as unknown as { display_name: string; rating: number; body: string; photo_url: string; products: { name: string; slug: string; status: string; product_images: { url: string; sort_order: number }[] } | null }[];
  const { data: listings } = await db.from("listing_products").select("products(slug),listings(slug,status)");
  const pathBySlug = new Map<string, string>();
  for (const l of (listings ?? []) as unknown as { products: { slug: string } | null; listings: { slug: string; status: string } | null }[]) {
    if (l.products && l.listings?.status === "active") pathBySlug.set(l.products.slug, l.listings.slug);
  }
  return rows.filter((r) => r.products?.status === "active").slice(0, limit).map((r) => ({
    name: r.display_name || "A customer",
    rating: r.rating,
    body: r.body.length > 160 ? `${r.body.slice(0, 157).trimEnd()}…` : r.body,
    product: r.products!.name,
    slug: pathBySlug.get(r.products!.slug) ?? r.products!.slug,
    image: r.photo_url || ([...r.products!.product_images].sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? ""),
  }));
}

// "Kate B." from "Kate Beston". Customers can change it on the form.
export function shortName(full: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];
}
