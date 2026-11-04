"use client";

import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/lib/catalogue";
import { useBasket, type Line } from "./BasketProvider";

export function AddToBasket({ product, preview }: { product: Product; preview: boolean }) {
  const { add, checkout } = useBasket();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");
  const off = preview || product.price_cents === null;
  const line = (): Line => ({ id: product.id, slug: product.slug, name: product.name, price_cents: product.price_cents!, image: product.product_images[0]?.url ?? "", quantity });

  async function buyNow() {
    setError("");
    const message = await checkout(line());
    if (message) setError(message);
  }

  return (
    <>
      <label className="qty">Quantity<input type="number" min={1} max={20} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} /></label>
      <div className="buy">
        <button type="button" className="solid" disabled={off} onClick={() => { add(line()); setAdded(true); }}>Add to basket</button>
        <div className="express"><button type="button" disabled={off} onClick={buyNow}>Apple Pay</button><button type="button" disabled={off} onClick={buyNow}>Google Pay</button></div>
        {added && <p role="status">Added to your basket. <Link href="/basket">View basket</Link></p>}
        {error && <p role="alert">{error}</p>}
      </div>
    </>
  );
}
