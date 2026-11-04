import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { COMPANY, CONTACT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = { title: "Website Terms of Use | Ivy & Bough" };

export default function TermsPage() {
  return (
    <LegalPage title="Website Terms of Use">
      <p>These terms apply when you use ivyandbough.com, which is operated by {COMPANY}. By using the site, you agree to them. If you don&apos;t agree, please don&apos;t use the site.</p>
      <p>Purchases are covered by our <Link href="/terms-of-sale">Terms of Sale</Link>, and accounts are covered by our <Link href="/account-terms">Account Terms</Link>.</p>
      <h2>Using the site</h2>
      <p>You must not use the site unlawfully, interfere with how it works, try to gain unauthorised access to it, or copy its content at scale by automated means.</p>
      <h2>Our content</h2>
      <p>Unless stated otherwise, the content on this site belongs to us or our licensors, including its text, images, designs and branding. You may view and share it for personal, non-commercial use. Please ask us before using it for anything else.</p>
      <h2>Product information</h2>
      <p>We work to keep product information accurate. Colours can look different on different screens, and handmade or natural items can vary slightly. If we find a mistake, we&apos;ll correct it.</p>
      <h2>Other websites</h2>
      <p>Links to other websites are provided for convenience. We don&apos;t control those websites and aren&apos;t responsible for their content or privacy practices.</p>
      <h2>Australian Consumer Law</h2>
      <p>Nothing in these terms excludes, restricts or changes any right or remedy you have under the Australian Consumer Law or any other law that cannot be excluded.</p>
      <h2>Liability</h2>
      <p>To the extent permitted by law, we aren&apos;t liable for loss caused by your use of the site, or by the site being unavailable, except where the loss is caused by our breach of these terms, our negligence or our failure to comply with the law.</p>
      <h2>Changes</h2>
      <p>We may update these terms from time to time. The version on this page applies from the date shown above.</p>
      <h2>Governing law</h2>
      <p>These terms are governed by the laws of Queensland, Australia. This does not remove any right you have to bring a claim or use consumer protections where you live.</p>
      <h2>Contact</h2>
      <p>Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </LegalPage>
  );
}
