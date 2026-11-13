import type { Metadata } from "next";
import { ReviewForm } from "@/components/ReviewForm";
import { shortName, validReviewToken } from "@/lib/reviews";
import { admin } from "@/lib/server";

export const metadata: Metadata = { title: "Review your order | Ivy & Bough", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ o?: string; t?: string }> }) {
  const { o = "", t = "" } = await searchParams;
  const db = admin();
  const ok = Boolean(db && o && validReviewToken(o, t));
  const { data: order } = ok ? await db!.from("orders").select("id,order_number,shipping_name,paid_at").eq("id", o).maybeSingle() : { data: null };

  if (!order?.paid_at) {
    return (
      <main className="page-narrow review-page">
        <h1 className="heading">Review your order</h1>
        <p>This review link isn&apos;t valid or has expired. If you&apos;d like to leave a review, reply to your order email and we&apos;ll send you a fresh link.</p>
      </main>
    );
  }

  const { data: items } = await db!.from("order_items").select("product_id,name,products(name,product_images(url,sort_order,media_type))").eq("order_id", o);
  const { data: done } = await db!.from("product_reviews").select("product_id").eq("order_id", o);
  const reviewed = new Set((done ?? []).map((r) => r.product_id));
  const seen = new Set<string>();
  const products = ((items ?? []) as unknown as { product_id: string | null; name: string; products: { name: string; product_images: { url: string; sort_order: number; media_type?: string }[] } | null }[])
    .filter((i) => i.product_id && !seen.has(i.product_id) && seen.add(i.product_id))
    .map((i) => ({
      id: i.product_id!,
      name: i.products?.name || i.name,
      image: [...(i.products?.product_images ?? [])].filter((m) => m.media_type !== "video").sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? "",
      reviewed: reviewed.has(i.product_id!),
    }));

  return (
    <main className="page-narrow review-page">
      <h1 className="heading">How are you finding your pieces?</h1>
      <p>Order {order.order_number}. Rate each item you&apos;d like to review. Your review appears on our site once we&apos;ve checked it, usually within a day or two.</p>
      {products.map((p) => <ReviewForm key={p.id} orderId={o} token={t} product={p} defaultName={shortName(order.shipping_name ?? "")} />)}
    </main>
  );
}
