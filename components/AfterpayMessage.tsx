"use client";

import { useEffect, useRef } from "react";

const KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
type StripeJs = { elements: () => { create: (t: string, o: Record<string, unknown>) => { mount: (el: HTMLElement) => void; update: (o: Record<string, unknown>) => void; destroy: () => void } } };
let loading: Promise<StripeJs> | null = null;

function loadStripe() {
  loading ??= new Promise<StripeJs>((resolve, reject) => {
    const w = window as unknown as { Stripe?: (k: string) => StripeJs };
    if (w.Stripe) return resolve(w.Stripe(KEY!));
    const s = document.createElement("script");
    s.src = "https://js.stripe.com/v3/";
    s.async = true;
    s.onload = () => (w.Stripe ? resolve(w.Stripe(KEY!)) : reject(new Error("Stripe did not load")));
    s.onerror = () => reject(new Error("Stripe did not load"));
    document.head.appendChild(s);
  });
  return loading;
}

// Stripe's own Afterpay line ("or 4 interest-free payments of…"), so the wording and logo always meet Afterpay's rules.
// Shows nothing if the price is outside Afterpay's limits or Stripe can't load.
export function AfterpayMessage({ cents }: { cents: number | null }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!KEY || !cents || !box.current) return;
    let el: ReturnType<ReturnType<StripeJs["elements"]>["create"]> | null = null;
    loadStripe().then((stripe) => {
      if (!box.current) return;
      el = stripe.elements().create("paymentMethodMessaging", { amount: cents, currency: "AUD", paymentMethodTypes: ["afterpay_clearpay"], countryCode: "AU" });
      el.mount(box.current);
    }).catch(() => {});
    return () => { el?.destroy(); };
  }, [cents]);
  if (!KEY || !cents) return null;
  return <div ref={box} className="afterpay-message" />;
}
