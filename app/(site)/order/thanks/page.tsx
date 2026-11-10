"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { account } from "@/lib/account-client";
import { useBasket } from "@/components/BasketProvider";

export default function ThanksPage() {
  const { clear } = useBasket();
  const [guest, setGuest] = useState(false);
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
