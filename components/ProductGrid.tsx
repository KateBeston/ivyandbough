import Image from "next/image";
import Link from "next/link";
import { formatPrice, type Product } from "@/lib/catalogue";
import { HeartButton } from "./HeartButton";
import { Price } from "./Price";
import { QuickAdd } from "./QuickAdd";

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="product-grid">
      {products.map((p) => {
        const img = p.product_images[0];
        const href = `/products/${p.slug}${p.pick_sku ? `?colour=${encodeURIComponent(p.pick_sku)}` : ""}`;
        return (
          <div key={`${p.slug}|${p.pick_sku ?? ""}`} className="product-card-wrap">
          <Link href={href} className="product-card">
            {img && <div className="frame card-photo">{p.sale_label && <em className="offer-badge">{p.sale_label}</em>}<HeartButton productId={p.id} name={p.name} className="card-heart" /><Image src={img.url} alt={img.alt} fill sizes="(max-width: 760px) 50vw, 25vw" className="cover" style={{ objectPosition: img.position }} /></div>}
            <small>{p.kind}</small>
            <strong>{p.name}</strong>
            {p.short_description && <p className="card-short">{p.short_description}</p>}
            <span>{p.price_from_cents ? <>From {formatPrice(p.price_from_cents)}<span className="gst-tag"> incl. GST</span></> : <Price cents={p.price_cents} wasCents={p.was_cents} gst />}</span>
            {p.availability === "Sold out" && <em className="card-soon">Sold out</em>}
            {p.pick_sku ? (p.version_name && <em className="card-options">{p.version_name}</em>)
              : (p.variants?.length ?? 0) > 1 && <em className="card-options">{p.variants!.length} {/ and /i.test(p.option_label || "") ? "options" : `${(p.option_label || "Colour").toLowerCase()}s`}</em>}
            {p.availability === "Coming soon" && <em className="card-soon">Coming soon</em>}
            {p.availability === "Pre-order" && <em className="card-soon">Pre-order</em>}
          </Link>
          <QuickAdd p={p} href={href} />
          </div>
        );
      })}
    </div>
  );
}
