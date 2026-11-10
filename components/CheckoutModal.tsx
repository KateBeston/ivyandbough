"use client";

import { useEffect, useRef } from "react";

const KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
type Embedded = { mount: (el: HTMLElement) => void; destroy: () => void };
type StripeJs = { initEmbeddedCheckout: (o: { fetchClientSecret: () => Promise<string> }) => Promise<Embedded> };

function loadStripe() {
  return new Promise<StripeJs>((resolve, reject) => {
    const w = window as unknown as { Stripe?: (k: string) => StripeJs };
    if (w.Stripe) return resolve(w.Stripe(KEY!));
    const s = document.createElement("script");
    s.src = "https://js.stripe.com/v3/";
    s.async = true;
    s.onload = () => (w.Stripe ? resolve(w.Stripe(KEY!)) : reject(new Error("Stripe did not load")));
    s.onerror = () => reject(new Error("Stripe did not load"));
    document.head.appendChild(s);
  });
}

// Stripe's secure payment form, shown over the basket instead of on a separate page.
// Card details go straight to Stripe; they never touch this site.
export function CheckoutModal({ secret, onClose, onFail }: { secret: string; onClose: () => void; onFail: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    let checkout: Embedded | null = null;
    let gone = false;
    dialog.current?.showModal();
    loadStripe().then((stripe) => stripe.initEmbeddedCheckout({ fetchClientSecret: async () => secret })).then((c) => {
      if (gone) return c.destroy();
      checkout = c;
      if (box.current) c.mount(box.current);
    }).catch(onFail);
    return () => { gone = true; checkout?.destroy(); };
  }, [secret]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <dialog ref={dialog} className="checkout-modal" aria-label="Payment" onCancel={(e) => { e.preventDefault(); onClose(); }}>
      <div className="checkout-modal-bar">
        <span>Secure payment</span>
        <button type="button" onClick={onClose} aria-label="Close payment and return to your basket">×</button>
      </div>
      <div ref={box} className="checkout-modal-body"><p className="muted">Loading secure payment…</p></div>
    </dialog>
  );
}
