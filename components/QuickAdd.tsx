"use client";

import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/lib/catalogue";
import { formatPrice } from "@/lib/catalogue";
import { fullName } from "@/lib/product-name";
import { useBasket } from "./BasketProvider";

// The quick add under a product card. Things with no choices add in one click; families get a dropdown to pick
// the colour, size or scent right there, then add. Sold out and coming soon items link to their page to be notified.
export function QuickAdd({ p, href }: { p: Product; href: string }) {
  const { add } = useBasket();
  const versions = !p.pick_sku && (p.variants?.length ?? 0) > 1 ? p.variants! : [];
  const buyable = versions.filter((v) => v.price_cents !== null && v.availability !== "Sold out" && v.availability !== "Coming soon");
  const [pick, setPick] = useState(buyable[0]?.sku ?? "");
  const [added, setAdded] = useState(false);

  if (!versions.length && (p.availability === "Sold out" || p.availability === "Coming soon")) return <Link href={href} className="quick-add">Notify me</Link>;
  if (versions.length && !buyable.length) return <Link href={href} className="quick-add">Notify me</Link>;

  const chosen = versions.length ? versions.find((v) => v.sku === pick) ?? buyable[0] : !p.pick_sku && p.variants?.length === 1 ? { ...p, ...p.variants[0] } : p;
  if (!chosen || chosen.price_cents === null) return null;
  const label = /size/i.test(p.option_label || "") ? "Size" : /scent/i.test(p.option_label || "") ? "Scent" : / and |style/i.test(p.option_label || "") ? "Option" : "Colour";
  const addIt = () => {
    add({ id: chosen.id, sku: chosen.sku, slug: p.listing_type === "group" ? `${p.slug}?colour=${encodeURIComponent(chosen.sku)}` : p.slug, name: fullName({ name: p.name, version_name: p.listing_type === "group" ? chosen.version_name : "" }), price_cents: chosen.price_cents!, was_cents: chosen.was_cents, sale_label: chosen.sale_label, image: chosen.product_images[0]?.url ?? p.product_images[0]?.url ?? "", quantity: 1 });
    setAdded(true);
  };

  return (
    <div className="quick-row">
      {versions.length > 0 && (
        <select className="quick-pick" value={pick} onChange={(e) => { setPick(e.target.value); setAdded(false); }} aria-label={`${label} for ${p.name}`}>
          {versions.map((v) => {
            const off = v.price_cents === null || v.availability === "Sold out" || v.availability === "Coming soon";
            return <option key={v.sku} value={v.sku} disabled={off}>{v.version_name || v.sku}{v.price_cents !== null && v.price_cents !== p.price_cents ? ` – ${formatPrice(v.price_cents)}` : ""}{off ? " (sold out)" : ""}</option>;
          })}
        </select>
      )}
      {added
        ? <span className="quick-add done" role="status">Added · <Link href="/basket">View basket</Link></span>
        : <button type="button" className="quick-add" onClick={addIt}>Add to basket</button>}
    </div>
  );
}
