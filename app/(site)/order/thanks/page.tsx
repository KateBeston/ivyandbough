"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useBasket } from "@/components/BasketProvider";

export default function ThanksPage() {
  const { clear } = useBasket();
  useEffect(() => { clear(); }, [clear]);
  return (
    <main className="shop-page centre">
      <h1 className="heading">Thank you for your order</h1>
      <p style={{ marginTop: 14 }}>We&apos;ve received your order and will email you with the details.</p>
      <p style={{ marginTop: 8 }}>Create an account with the same email to see this order and track it. <Link href="/account">Go to your account</Link></p>
    </main>
  );
}
