import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { ProductView } from "@/components/ProductView";
import { VariantSwitch } from "@/components/VariantSwitch";
import { getProduct, getProducts } from "@/lib/catalogue";
import { absolute, breadcrumbs, offerExtras } from "@/lib/seo";
import { supabase } from "@/lib/supabase";

export const revalidate = 60;

// Every live product page is built ahead of time and kept ready, so it opens instantly.
export async function generateStaticParams() {
  const products = await getProducts().catch(() => []);
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return { title: "Ivy & Bough" };
  const description = product.seo_description || product.description;
  return { title: product.seo_title || `${product.name} | Ivy & Bough`, description, alternates: { canonical: `/products/${product.slug}` }, openGraph: { title: product.name, description, url: `/products/${product.slug}`, images: product.product_images[0] ? [product.product_images[0].url] : undefined } };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  const url = absolute(`/products/${product.slug}`);
  const versions = product.variants ?? [];
  const first = (versions.find((v) => v.id === product.id) ?? versions[0])?.sku ?? "";
  const extras = await offerExtras(supabase);
  const schema = { "@context": "https://schema.org", "@type": "Product", name: product.name, description: product.description, sku: product.sku, url, image: product.product_images.map((i) => absolute(i.url)), brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined, category: product.categories?.name, material: product.materials || undefined, offers: product.price_cents === null ? undefined : { "@type": "Offer", url, price: (product.price_cents / 100).toFixed(2), priceCurrency: "AUD", availability: ["Sold out", "Coming soon"].includes(product.availability) ? "https://schema.org/OutOfStock" : "https://schema.org/InStock", itemCondition: "https://schema.org/NewCondition", hasMerchantReturnPolicy: extras.returns, shippingDetails: extras.shipping ? extras.shipping(product.price_cents) : undefined, seller: { "@type": "Organization", name: "Ivy & Bough" }, priceValidUntil: product.sale_label && product.sale_ends_at ? product.sale_ends_at.slice(0, 10) : undefined } };
  const crumbs = [{ name: "Home", path: "" }, ...(product.categories ? [{ name: product.categories.name, path: `/shop/${product.categories.slug}` }] : []), { name: product.name, path: `/products/${product.slug}` }];
  return (
    <>
      <JsonLd data={schema} />
      <JsonLd data={breadcrumbs(crumbs)} />
      {versions.length > 1
        ? <>
          <VariantSwitch initial={first}>{versions.map((v) => <div key={v.sku} data-sku={v.sku} hidden={v.sku !== first}><ProductView product={product} colour={v.sku} secondary={v.sku !== first} /></div>)}</VariantSwitch>
          {/* Shows the option in the address straight away, before the page's scripts have loaded. */}
          <script dangerouslySetInnerHTML={{ __html: `(function(){var s=new URLSearchParams(location.search).get("colour");if(!s)return;var p=document.querySelectorAll("[data-sku]"),t=null;p.forEach(function(e){if(e.getAttribute("data-sku")===s)t=e});if(!t)return;p.forEach(function(e){e.hidden=e!==t})})();` }} />
        </>
        : <ProductView product={product} />}
    </>
  );
}
