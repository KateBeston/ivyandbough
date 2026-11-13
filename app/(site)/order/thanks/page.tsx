"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { account } from "@/lib/account-client";
import { useBasket } from "@/components/BasketProvider";
import { sendPurchase } from "@/lib/track";

const GOOGLE_MERCHANT_ID = 5903440721;

// Google Customer Reviews: offers the customer an optional survey, emailed by Google after delivery.
function showReviewOptIn(sessionId: string) {
  fetch(`/api/order/review-optin?session_id=${encodeURIComponent(sessionId)}`)
    .then((r) => r.json())
    .then((o) => {
      if (!o?.ok) return;
      const w = window as unknown as { renderOptIn?: () => void; gapi?: { load: (m: string, cb: () => void) => void; surveyoptin: { render: (opts: object) => void } } };
      w.renderOptIn = () => w.gapi?.load("surveyoptin", () => w.gapi?.surveyoptin.render({
        merchant_id: GOOGLE_MERCHANT_ID, order_id: o.order_id, email: o.email,
        delivery_country: o.delivery_country, estimated_delivery_date: o.estimated_delivery_date,
      }));
      const s = document.createElement("script");
      s.src = "https://apis.google.com/js/platform.js?onload=renderOptIn";
      s.async = true; s.defer = true;
      document.body.appendChild(s);
    })
    .catch(() => { /* the opt-in is optional */ });
}

export default function ThanksPage() {
  const { clear } = useBasket();
  const [guest, setGuest] = useState(false);
  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    sendPurchase(sessionId || `order-${Date.now()}`);
    if (sessionId) showReviewOptIn(sessionId);
  }, []);
  useEffect(() => { clear(); try { sessionStorage.removeItem("ib-checkout-details"); } catch { /* nothing saved */ } }, [clear]);
  useEffect(() => { account.auth.getSession().then(({ data }) => setGuest(!data.session)); }, []);
  return (
    <main className="shop-page centre">
      <h1 className="heading">Thank you for your order</h1>
      <p style={{ marginTop: 14 }}>We&apos;ve received your order and will email you with the details.</p>
      {guest ? (
        <p style={{ marginTop: 8 }}>Create an account with the same email to see this order, track it and check out faster next time. <Link href="/account?mode=up">Create an account</Link></p>
      ) : (
        <p style={{ marginTop: 8 }}>You can see and track this order in <Link href="/account">your account</Link>.</p>
      )}
    </main>
  );
}
