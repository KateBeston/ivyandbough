import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { COMPANY, CONTACT_EMAIL } from "@/lib/legal";

export const revalidate = 60;
export const metadata: Metadata = { title: "Privacy Policy | Ivy & Bough", description: "How Ivy & Bough collects, uses and protects your personal information.", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <LegalPage code="PRIVACY" title="Privacy Policy">
      <p>This policy explains how {COMPANY} collects, uses and shares personal information through ivyandbough.com. We handle personal information in line with the Privacy Act 1988 (Cth) and the Australian Privacy Principles.</p>
      <h2>What we collect</h2>
      <ul>
        <li>Order details: your name, email, phone number, delivery address, the items you bought and your order history.</li>
        <li>Account details: your name, email, phone number and the date you accepted our terms. Your password is stored in encrypted form.</li>
        <li>Basket details: the items in your basket and a random session code. If you&apos;re signed in, we also link your basket to your account and email.</li>
        <li>Enquiries: your name, email and anything you tell us when you contact us.</li>
        <li>Email list details: your email address and the date you joined.</li>
        <li>Technical details: your IP address, browser and device details, and server logs created when you use the site.</li>
      </ul>
      <p>Payments are processed by Stripe. We don&apos;t receive or store your full card number.</p>
      <h2>How we collect it</h2>
      <p>We collect information directly from you when you order, create an account, join our email list or contact us. Stripe gives us your order and delivery details after checkout. Some technical details are collected automatically when you use the site.</p>
      <h2>Why we use it</h2>
      <ul>
        <li>To process, deliver and support your orders.</li>
        <li>To run your account and show your order history.</li>
        <li>To respond to questions, returns and complaints.</li>
        <li>To send order updates by email, and by SMS or MMS if you agree to them.</li>
        <li>To send marketing emails, including basket reminders, if you have asked to receive them.</li>
        <li>To keep the site secure and working properly.</li>
        <li>To meet our legal, tax and accounting obligations.</li>
      </ul>
      <p>You can use the site and check out as a guest. If you don&apos;t give us the details needed for an order, we can&apos;t complete it.</p>
      <h2>Who we share it with</h2>
      <ul>
        <li>Suppliers and couriers, who receive the details needed to fill and deliver your order, including your name, address and phone number.</li>
        <li>Stripe, for payments and fraud prevention.</li>
        <li>Supabase, which provides our database and sign-in. Our database is hosted in Sydney.</li>
        <li>Postmark, which sends our emails, and Twilio, which sends our text messages.</li>
        <li>Google, which suggests addresses as you type your delivery details.</li>
        <li>Anthropic, which powers the AI help assistant on our site. What you type into it is sent to Anthropic to create a reply. We don&apos;t save those conversations, so please don&apos;t include personal or card details.</li>
        <li>Vercel, which hosts the website, and Cloudflare, which provides our domain and email routing services.</li>
        <li>Our professional advisers, and regulators or other authorities where the law requires it.</li>
      </ul>
      <p>We don&apos;t sell your personal information.</p>
      <h2>Overseas disclosure</h2>
      <p>Stripe, Vercel, Cloudflare, Supabase, Postmark, Twilio, Google and Anthropic are international providers and may handle information outside Australia, most likely in the United States and other countries where they or their service providers operate.</p>
      <h2>Marketing</h2>
      <p>We only send marketing by email, SMS or MMS to people who have asked to receive it. You can unsubscribe at any time using the link in our emails or by contacting us. Order and account messages will still be sent where they are needed. We use email service data to see whether messages are delivered, and whether marketing emails are opened or their links are clicked.</p>
      <h2>Cookies</h2>
      <p>Our <Link href="/cookies">Cookie Policy</Link> explains the cookies and similar technologies we use. If you choose Accept all, Google Analytics collects information about how you use the site, which may be processed outside Australia. We use Cloudflare Turnstile to protect our forms and checkout from bots, which processes technical information about your browser and device.</p>
      <h2>Storage and security</h2>
      <p>We take reasonable steps to protect personal information from misuse, loss and unauthorised access, including access controls on our systems. No online service is completely secure. If a data breach is likely to cause you serious harm, we will notify you and, where required, the Office of the Australian Information Commissioner.</p>
      <p>We keep personal information only for as long as we need it for the purposes above. Order and financial records are generally kept for at least five years to meet tax and accounting requirements.</p>
      <h2>Access and correction</h2>
      <p>You can ask for a copy of the personal information we hold about you, ask us to correct it, or ask us to delete your account. Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We&apos;ll respond within 30 days. Some records may need to be kept by law.</p>
      <h2>Complaints</h2>
      <p>If you have a privacy concern, please email us first and we&apos;ll respond within 30 days. If you&apos;re not satisfied, you can contact the Office of the Australian Information Commissioner at <a href="https://www.oaic.gov.au">oaic.gov.au</a> or on 1300 363 992.</p>
      <h2>Changes</h2>
      <p>We may update this policy. The current version will always be on this page, with the date it was last updated.</p>
    </LegalPage>
  );
}
