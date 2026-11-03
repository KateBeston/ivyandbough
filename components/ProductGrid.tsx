import Image from "next/image";
import Link from "next/link";
import { formatPrice, type Product } from "@/lib/catalogue";

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="product-grid">
      {products.map((p) => {
        const img = p.product_images[0];
        return (
          <Link key={p.id} href={`/products/${p.slug}`} className="product-card">
            {img && <div className="frame" style={{ height: 420 }}><Image src={img.url} alt={img.alt} fill sizes="(max-width: 760px) 100vw, 25vw" className="cover" style={{ objectPosition: img.position }} /></div>}
            <small>{p.kind}</small>
            <strong>{p.name}</strong>
            <span>{formatPrice(p.price_cents)}</span>
          </Link>
        );
      })}
    </div>
  );
}
