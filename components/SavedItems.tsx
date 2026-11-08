"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Product } from "@/lib/catalogue";
import { offerPrice } from "@/lib/pricing";
import { productPaths, fullName } from "@/lib/product-name";
import { supabase } from "@/lib/supabase";
import { ProductGrid } from "./ProductGrid";
import { useWishlist } from "./WishlistProvider";

export function SavedItems() {
  const { ids } = useWishlist();
  const [products, setProducts] = useState<Product[] | null>(null);
  useEffect(() => {
    if (!ids.length) { setProducts([]); return; }
    supabase.from("products").select("id,slug,name,version_name,kind,price_cents,availability,sale_kind,discount_type,discount_value,sale_starts_at,sale_ends_at,product_images(url,alt,position,sort_order,media_type)").in("id", ids).then(async ({ data }) => {
      const paths = await productPaths(supabase as never, ids);
      const rows = ((data ?? []) as unknown as Product[]).map((p) => { const o = offerPrice(p as never); return { ...p, slug: paths.get(p.id) ?? p.slug, name: fullName(p), price_cents: o.cents, was_cents: o.wasCents, sale_label: o.label, product_images: [...(p.product_images ?? [])].filter((i) => i.media_type !== "video").sort((a, b) => a.sort_order - b.sort_order) }; });
      setProducts(ids.map((id) => rows.find((r) => r.id === id)).filter(Boolean) as Product[]);
    });
  }, [ids]);
  if (!products) return <p>Loading your saved items.</p>;
  if (!products.length) return <p className="muted">Nothing saved yet. Tap the heart on any piece to keep it here. <Link href="/shop">Browse the shop</Link>.</p>;
  return <ProductGrid products={products} />;
}
