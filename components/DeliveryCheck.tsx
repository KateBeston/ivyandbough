"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

const dollars = (cents: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(cents / 100);

export function DeliveryCheck({ productId }: { productId: string }) {
  const [postcode, setPostcode] = useState("");
  const [result, setResult] = useState("");

  const run = useCallback(async (postcode: string) => {
    setResult("");
    const res = await fetch("/api/delivery/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: [{ id: productId, quantity: 1 }], postcode }) }).catch(() => null);
    const body = await res?.json().catch(() => null);
    if (!res?.ok) return setResult(body?.error ?? "Delivery can't be calculated right now.");
    setResult(body.deliveryCents ? `Delivery to ${postcode} is ${dollars(body.deliveryCents)}.` : `Delivery to ${postcode} is free.`);
  }, [productId]);
  // Fills in a signed-in customer's postcode and works out delivery straight away.
  useEffect(() => {
    const on = (e: Event) => { const pc = String((e as CustomEvent).detail ?? ""); if (/^\d{4}$/.test(pc)) { setPostcode(pc); run(pc); } };
    window.addEventListener("ib:postcode", on);
    return () => window.removeEventListener("ib:postcode", on);
  }, [run]);
  function check(e: FormEvent) {
    e.preventDefault();
    run(postcode);
  }

  return (
    <form className="delivery-check" onSubmit={check}>
      <label>Calculate delivery<input inputMode="numeric" maxLength={4} placeholder="Postcode" value={postcode} onChange={(e) => setPostcode(e.target.value.replace(/\D/g, ""))} /></label>
      <button type="submit">Calculate</button>
      {result && <p className="muted" role="status">{result}</p>}
    </form>
  );
}
