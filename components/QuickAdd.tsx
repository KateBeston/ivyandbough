"use client";

import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/lib/catalogue";
import { fullName } from "@/lib/product-name";
import { useBasket } from "./BasketProvider";

// The quick add under a product card: one click for things with no choices, or a link to choose a colour or size.
export function QuickAdd({ p, href }: { p: Product; href: string }) {
  const { add } = useBasket();
  const [added, setAdded] = useState(false);
  if (p.price_cents === null && !p.price_from_cents) return null;
  if (p.availability === "Sold out" || p.availability === "Coming soon") return null;
  const choices = !p.pick_sku && (p.variants?.length ?? 0) > 1;
  if (choices) {
    const label = /size/i.test(p.option_label || "") ? "size" : /scent/i.test(p.option_label || "") ? "scent" : / and |style/i.test(p.option_label || "") ? "option" : "colour";
    return <Link href={href} className="quick-add">Choose {label}</Link>;
  }
  const one = !p.pick_sku && p.variants?.length === 1 ? { ...p, ...p.variants[0], slug: p.slug, name: p.name } : p;
  if (one.price_cents === null) return null;
  return added
    ? <span className="quick-add done" role="status">Added · <Link href="/basket">View basket</Link></span>
    : <button type="button" className="quick-add" onClick={() => {
        add({ id: one.id, sku: one.sku, slug: p.listing_type === "group" ? `${p.slug}?colour=${encodeURIComponent(one.sku)}` : p.slug, name: fullName(one), price_cents: one.price_cents!, was_cents: one.was_cents, sale_label: one.sale_label, image: one.product_images[0]?.url ?? "", quantity: 1 });
        setAdded(true);
      }}>Add to basket</button>;
}
