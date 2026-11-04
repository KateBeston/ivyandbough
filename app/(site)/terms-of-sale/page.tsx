import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { getDeliverySummary } from "@/lib/catalogue";
import { COMPANY, CONTACT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = { title: "Terms of Sale | Ivy & Bough" };

export const revalidate = 60;

export default async function TermsOfSalePage() {
  const summary = await getDeliverySummary();
  return (
    <LegalPage title="Terms of Sale">
      <p>These terms apply when you buy from {COMPANY}. By placing an order, you agree to them. You must be 18 or over, or have permission from a parent or guardian, to place an order.</p>
      <h2>Orders</h2>
      <p>Your order is an offer to buy. A contract is formed when we confirm your order after payment. We may cancel an order if an item is unavailable, a price or description was clearly wrong, or we reasonably suspect fraud. If we do, we&apos;ll tell you and refund what you paid for the cancelled items.</p>
      <h2>Prices and payment</h2>
      <p>Prices are in Australian dollars and include GST. Payment is taken at checkout through Stripe.</p>
      <h2>Delivery</h2>
      <p>We deliver within Australia only. {summary}</p>
      <p>Some items ship directly from our suppliers, so one order may arrive in separate parcels. Dispatch times and Christmas last order dates are estimates and can be affected by carriers, weather and peak periods. If your order is delayed, we&apos;ll let you know and work with you on a fair outcome, which may include a refund.</p>
      <p>Please check your delivery details before paying. Contact us as soon as possible if they&apos;re wrong. Risk in the goods passes to you on delivery, and ownership passes once we have received full payment.</p>
      <h2>Consumer guarantees</h2>
      <p>Our goods come with guarantees that cannot be excluded under the Australian Consumer Law. You are entitled to a replacement or refund for a major failure and compensation for any other reasonably foreseeable loss or damage. You are also entitled to have the goods repaired or replaced if the goods fail to be of acceptable quality and the failure does not amount to a major failure.</p>
      <h2>Faulty, damaged or incorrect items</h2>
      <p>If an item arrives faulty, damaged or incorrect, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with your order number and a photo. We&apos;ll tell you the next steps and cover reasonable return postage. This applies to all goods, including sale items.</p>
      <h2>Change of mind</h2>
      <p>Change-of-mind returns are covered on our <Link href="/returns">Returns</Link> page. That policy does not affect your rights under the Australian Consumer Law.</p>
      <h2>Liability</h2>
      <p>Nothing in these terms excludes, restricts or changes any right or remedy you have under the Australian Consumer Law or any other law that cannot be excluded.</p>
      <h2>Changes</h2>
      <p>We may update these terms for future orders. The terms in place when you ordered apply to that order.</p>
      <h2>Governing law</h2>
      <p>These terms are governed by the laws of Queensland, Australia. This does not remove any right you have to bring a claim or use consumer protections where you live.</p>
    </LegalPage>
  );
}
