import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { CookieSettingsLink } from "@/components/CookieConsent";

export const metadata: Metadata = { title: "Cookie Policy | Ivy & Bough", description: "How Ivy & Bough uses cookies and similar technologies, and how to change your choice.", alternates: { canonical: "/cookies" } };

const rows = [
  ["ib-basket", "Remembers what's in your basket", "Until cleared"],
  ["ib-session", "A random code that links your basket to your visit", "Until cleared"],
  ["ib-account", "Keeps you signed in", "Until you sign out or it's cleared"],
  ["ib-consent", "Remembers your cookie choice", "Until cleared"],
  ["ib-welcome-popup", "Remembers that you've seen our welcome offer", "Until cleared"],
];

export default function CookiesPage() {
  return (
    <LegalPage title="Cookie Policy">
      <p>Cookies and similar technologies, such as browser storage, are small pieces of information saved on your device. This policy explains how Ivy &amp; Bough uses them.</p>
      <h2>Essential storage</h2>
      <p>The site needs these to work, so they can&apos;t be switched off here. They are kept in your browser&apos;s storage.</p>
      <div className="legal-table">
        <table>
          <thead><tr><th>Name</th><th>Purpose</th><th>Kept</th></tr></thead>
          <tbody>{rows.map(([name, purpose, kept]) => <tr key={name}><td>{name}</td><td>{purpose}</td><td>{kept}</td></tr>)}</tbody>
        </table>
      </div>
      <p>Stripe sets its own cookies during checkout, and our hosting and security providers may set cookies to protect the site. These are controlled by those providers.</p>
      <h2>Analytics and marketing</h2>
      <p>If you choose Accept all, we load Google Tag Manager and Google Analytics to understand how people use the site, such as which pages are popular. These set cookies including _ga, which can last up to two years, and Google processes the information on our behalf. They don&apos;t run if you choose Essential only. We&apos;ll update this page before adding any marketing cookies.</p>
      <h2>Your choices</h2>
      <p>You can change your choice at any time. You can also clear cookies and stored data in your browser, which will empty your basket and sign you out.</p>
      <p><CookieSettingsLink /></p>
    </LegalPage>
  );
}
