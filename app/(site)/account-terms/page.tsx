import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { COMPANY, CONTACT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = { title: "Account Terms | Ivy & Bough", description: "The terms that apply to your Ivy & Bough customer account.", alternates: { canonical: "/account-terms" } };

export default function AccountTermsPage() {
  return (
    <LegalPage title="Account Terms">
      <p>These terms apply if you create an account with {COMPANY}. You don&apos;t need an account to place an order.</p>
      <h2>Your account</h2>
      <p>You must be 18 or over to create an account. Please give accurate details and keep them up to date. Each account is for one person.</p>
      <h2>Keeping it secure</h2>
      <p>Choose a strong password and keep it private. Tell us straight away if you think someone else has used your account. You&apos;re responsible for activity on your account unless it happened through no fault of yours.</p>
      <h2>Your orders</h2>
      <p>When you confirm your email, past orders placed with that email address appear in your account. Purchases are covered by our <Link href="/terms-of-sale">Terms of Sale</Link>, and your details are handled under our <Link href="/privacy">Privacy Policy</Link>.</p>
      <h2>Suspension</h2>
      <p>We may suspend or close an account if it&apos;s used for fraud, unlawful activity or a serious breach of these terms. We&apos;ll tell you why unless the law or a security risk prevents it. This doesn&apos;t affect orders you have already paid for or your consumer rights.</p>
      <h2>Closing your account</h2>
      <p>You can ask us to close your account at any time by emailing <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We may need to keep order records to meet legal and tax requirements.</p>
      <h2>Changes</h2>
      <p>We may update these terms from time to time. If a change materially affects you, we&apos;ll let you know before it applies.</p>
    </LegalPage>
  );
}
