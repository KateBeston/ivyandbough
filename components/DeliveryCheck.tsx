"use client";

import { useState, type FormEvent } from "react";

const dollars = (cents: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(cents / 100);

export function DeliveryCheck({ productId }: { productId: string }) {
  const [postcode, setPostcode] = useState("");
  const [result, setResult] = useState("");

  async function check(e: FormEvent) {
    e.preventDefault();
    setResult("");
    const res = await fetch("/api/delivery/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: [{ id: productId, quantity: 1 }], postcode }) }).catch(() => null);
    const body = await res?.json().catch(() => null);
    if (!res?.ok) return setResult(body?.error ?? "Delivery can't be calculated right now.");
    setResult(body.deliveryCents ? `Delivery to ${postcode} is ${dollars(body.deliveryCents)}.` : `Delivery to ${postcode} is free.`);
  }

  return (
    <form className="delivery-check" onSubmit={check}>
      <label>Check delivery<input inputMode="numeric" maxLength={4} placeholder="Postcode" value={postcode} onChange={(e) => setPostcode(e.target.value.replace(/\D/g, ""))} /></label>
      <button type="submit">Check</button>
      {result && <p className="muted" role="status">{result}</p>}
    </form>
  );
}
