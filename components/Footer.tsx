import Link from "next/link";
import { CookieSettingsLink } from "./CookieConsent";

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <img src="/brand/stacked-cream.svg" alt="Ivy &amp; Bough" className="footer-logo" width={150} height={88} />
        <nav aria-label="Shop">
          <Link href="/#collections">Collections</Link>
          <Link href="/shop">Shop everything</Link>
          <Link href="/#home">Around the home</Link>
        </nav>
        <nav aria-label="About">
          <Link href="/about">About</Link>
          <Link href="/the-christmas-edit">The Christmas Edit</Link>
          <Link href="/contact">Contact</Link>
        </nav>
        <nav aria-label="Help">
          <Link href="/delivery">Delivery</Link>
          <Link href="/returns">Returns</Link>
          <Link href="/faq">FAQs</Link>
        </nav>
      </div>
      <div className="footer-bottom">
        <div>© 2026 Aurella Group Pty Ltd trading as Ivy &amp; Bough · ABN 70 649 742 423</div>
        <div>Visa · Mastercard · American Express · Apple Pay · Google Pay</div>
      </div>
      <nav className="footer-legal" aria-label="Legal">
        <Link href="/privacy">Privacy Policy</Link>
        <Link href="/terms">Website Terms of Use</Link>
        <Link href="/terms-of-sale">Terms of Sale</Link>
        <Link href="/account-terms">Account Terms</Link>
        <Link href="/cookies">Cookie Policy</Link>
        <CookieSettingsLink />
      </nav>
    </footer>
  );
}
