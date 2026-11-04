import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductView } from "@/components/ProductView";
import { getProductPreview } from "@/lib/catalogue";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Preview | Ivy & Bough", robots: { index: false, follow: false } };

export default async function ProductPreviewPage({ params }: { params: Promise<{ token: string }> }) {
  const product = await getProductPreview((await params).token);
  if (!product) notFound();
  return <ProductView product={product} preview />;
}
