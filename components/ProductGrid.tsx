import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/catalogue";
import { Price } from "./Price";

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="product-grid">
      {products.map((p) => {
        const img = p.product_images[0];
        return (
          <Link key={p.id} href={`/products/${p.slug}`} className="product-card">
            {img && <div className="frame" style={{ height: 420 }}>{p.sale_label && <em className="offer-badge">{p.sale_label}</em>}<Image src={img.url} alt={img.alt} fill sizes="(max-width: 760px) 100vw, 25vw" className="cover" style={{ objectPosition: img.position }} /></div>}
            <small>{p.kind}</small>
            <strong>{p.name}</strong>
            <span><Price cents={p.price_cents} wasCents={p.was_cents} /></span>
          </Link>
        );
      })}
    </div>
  );
}
