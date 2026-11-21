import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/requests";

export const metadata: Metadata = { title: "Track an order | Ivy & Bough", description: "How to track your Ivy & Bough order.", alternates: { canonical: "/track" } };

// Landing page for the footer's "Track an order" link. Each order has its own private tracking page, linked from our emails.
export default function Page() {
  return (
    <main className="shop-page track-page">
      <p className="eyebrow">Help & support</p>
      <h1 className="heading">Track an order</h1>
      <section className="track-parcel">
        <h2>Use the link in your email</h2>
        <p>Every order has its own tracking page. You'll find the link in your order emails: look for “Track your parcel”. It shows where each item is up to, and the courier's tracking once your parcel is on its way.</p>
      </section>
      <section className="track-parcel">
        <h2>Or sign in to your account</h2>
        <p>If you ordered with an account, your orders and their delivery status are in <Link href="/account">My account</Link>.</p>
      </section>
      <p className="track-help">Can't find your email? Check your junk folder, or email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with your order number and we'll help. See our <Link href="/delivery">delivery information</Link> for delivery times.</p>
    </main>
  );
}
