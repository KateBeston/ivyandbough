import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { ProductView } from "@/components/ProductView";
import { getProduct } from "@/lib/catalogue";
import { absolute, breadcrumbs } from "@/lib/seo";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return { title: "Ivy & Bough" };
  const description = product.seo_description || product.description;
  return { title: product.seo_title || `${product.name} | Ivy & Bough`, description, alternates: { canonical: `/products/${product.slug}` }, openGraph: { title: product.name, description, url: `/products/${product.slug}`, images: product.product_images[0] ? [product.product_images[0].url] : undefined } };
}

export default async function ProductPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ colour?: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  const url = absolute(`/products/${product.slug}`);
  const schema = { "@context": "https://schema.org", "@type": "Product", name: product.name, description: product.description, sku: product.sku, url, image: product.product_images.map((i) => absolute(i.url)), brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined, category: product.categories?.name, material: product.materials || undefined, offers: product.price_cents === null ? undefined : { "@type": "Offer", url, price: (product.price_cents / 100).toFixed(2), priceCurrency: "AUD", availability: ["Sold out", "Coming soon"].includes(product.availability) ? "https://schema.org/OutOfStock" : "https://schema.org/InStock", itemCondition: "https://schema.org/NewCondition", priceValidUntil: product.sale_label && product.sale_ends_at ? product.sale_ends_at.slice(0, 10) : undefined } };
  const crumbs = [{ name: "Home", path: "" }, ...(product.categories ? [{ name: product.categories.name, path: `/shop/${product.categories.slug}` }] : []), { name: product.name, path: `/products/${product.slug}` }];
  return (
    <>
      <JsonLd data={schema} />
      <JsonLd data={breadcrumbs(crumbs)} />
      <ProductView product={product} colour={(await searchParams).colour} />
    </>
  );
}
