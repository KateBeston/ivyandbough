import Image from "next/image";
import Link from "next/link";
import { formatPrice, type Product } from "@/lib/catalogue";
import { HeartButton } from "./HeartButton";
import { Price } from "./Price";

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="product-grid">
      {products.map((p) => {
        const img = p.product_images[0];
        return (
          <Link key={p.slug} href={`/products/${p.slug}`} className="product-card">
            {img && <div className="frame" style={{ height: 420 }}>{p.sale_label && <em className="offer-badge">{p.sale_label}</em>}<HeartButton productId={p.id} name={p.name} className="card-heart" /><Image src={img.url} alt={img.alt} fill sizes="(max-width: 760px) 100vw, 25vw" className="cover" style={{ objectPosition: img.position }} /></div>}
            <small>{p.kind}</small>
            <strong>{p.name}</strong>
            <span>{p.price_from_cents ? <>From {formatPrice(p.price_from_cents)}</> : <Price cents={p.price_cents} wasCents={p.was_cents} />}</span>
            {(p.variants?.length ?? 0) > 1 && <em className="card-options">{p.variants!.length} {(p.option_label || "Colour").toLowerCase()}s</em>}
            {p.availability === "Coming soon" && <em className="card-soon">Coming soon</em>}
          </Link>
        );
      })}
    </div>
  );
}
