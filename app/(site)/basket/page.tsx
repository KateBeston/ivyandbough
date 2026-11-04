"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useBasket } from "@/components/BasketProvider";
import { formatPrice } from "@/lib/catalogue";
import { DELIVERY_CENTS, deliveryFor, FREE_DELIVERY_OVER_CENTS } from "@/lib/delivery";

export default function BasketPage() {
  const { lines, subtotal, setQuantity, remove, checkout } = useBasket();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const delivery = deliveryFor(subtotal);

  async function pay() {
    setBusy(true);
    setError("");
    const message = await checkout();
    if (message) {
      setError(message);
      setBusy(false);
    }
  }

  return (
    <main className="shop-page">
      <h1 className="heading">Your basket</h1>
      {!lines.length ? (
        <p style={{ marginTop: 16 }}>Your basket is empty. <Link href="/shop">Continue shopping</Link></p>
      ) : (
        <div className="basket-layout">
          <div>
            {lines.map((l) => (
              <div key={l.id} className="basket-line">
                <div className="frame">{l.image && <Image src={l.image} alt="" fill sizes="110px" className="cover" />}</div>
                <div>
                  <Link href={`/products/${l.slug}`} className="basket-name">{l.name}</Link>
                  <div>{formatPrice(l.price_cents)}</div>
                  <button type="button" className="link-button" onClick={() => remove(l.id)}>Remove</button>
                </div>
                <label className="qty">Quantity<input type="number" min={1} max={20} value={l.quantity} onChange={(e) => setQuantity(l.id, Number(e.target.value))} /></label>
              </div>
            ))}
          </div>
          <aside className="basket-summary">
            <div><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            <div><span>Delivery</span><span>{delivery ? formatPrice(DELIVERY_CENTS) : "Free"}</span></div>
            <div className="total"><span>Total</span><span>{formatPrice(subtotal + delivery)}</span></div>
            <p className="muted">Prices include GST. Free delivery over {formatPrice(FREE_DELIVERY_OVER_CENTS)}.</p>
            <button type="button" className="solid" disabled={busy} onClick={pay}>Checkout</button>
            <p className="muted">By checking out, you agree to our <Link href="/terms-of-sale">Terms of Sale</Link> and <Link href="/privacy">Privacy Policy</Link>.</p>
            {error && <p role="alert">{error}</p>}
          </aside>
        </div>
      )}
    </main>
  );
}
