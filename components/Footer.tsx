import Link from "next/link";
import { CookieSettingsLink } from "./CookieConsent";
import { SOCIAL_LINKS } from "@/lib/seo";
import { PaymentMarks } from "./PaymentMarks";
import { CONTACT_EMAIL, CONTACT_PHONE } from "@/lib/requests";
import { getWelcomeOffer } from "@/lib/catalogue";
import { supabase } from "@/lib/supabase";
import { SignupForm } from "./SignupForm";

// signup={false} where the page already has its own sign-up section (the home page).
export async function Footer({ signup = true }: { signup?: boolean } = {}) {
  const offer = signup ? await getWelcomeOffer("Newsletter sign-up").catch(() => "") : "";
  const { data: delivery } = await supabase.from("delivery_settings").select("free_over").maybeSingle();
  const freeOver = delivery?.free_over === null || delivery?.free_over === undefined ? null : Number(delivery.free_over);
  return (
    <>
    <section className="trust-band" aria-label="Shopping with Ivy &amp; Bough">
      <ul>
        <li>
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="9.5" rx="1.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /><circle cx="12" cy="15" r="1.2" /></svg>
          <span><strong>Secure payments</strong>Encrypted checkout with Visa, Mastercard, Amex, Apple Pay and Google Pay</span>
        </li>
        <li>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h11v9H3z" /><path d="M14 10h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.6" /><circle cx="17.5" cy="17.5" r="1.6" /></svg>
          <span><strong>Delivered Australia-wide</strong>Carefully packed and sent to your door</span>
        </li>
        {freeOver !== null ? (
          <li>
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="9" width="16" height="11" rx="1" /><path d="M3 9h18v-2.5H3z" /><path d="M12 6.5V20" /><path d="M12 6.5c-1.5-3-5-3.2-5-1.2 0 1.6 3 1.2 5 1.2zM12 6.5c1.5-3 5-3.2 5-1.2 0 1.6-3 1.2-5 1.2z" /></svg>
            <span><strong>Free delivery over ${freeOver % 1 ? freeOver.toFixed(2) : freeOver}</strong>On standard items, Australia-wide</span>
          </li>
        ) : null}
        <li>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4h4" /></svg>
          <span><strong>Easy returns</strong>14 days to change your mind</span>
        </li>
      </ul>
    </section>
    <footer className="footer">
      {signup && (
        <section className="footer-signup" aria-labelledby="footer-signup-title">
          <div className="footer-signup-copy">
            <h2 id="footer-signup-title">First look at new pieces</h2>
            <p>New collections and Christmas delivery dates, before anyone else.</p>
          </div>
          <SignupForm offer={offer} />
        </section>
      )}
      <div className="footer-top">
        <div className="footer-brand">
          <Link href="/" className="footer-logo-link" aria-label="Ivy &amp; Bough home"><img src="/brand/stacked-cream.svg" alt="" className="footer-logo" width={150} height={88} /></Link>
          <address className="footer-contact">
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            {CONTACT_PHONE && <a href={`tel:${CONTACT_PHONE.replace(/\s/g, "")}`}>{CONTACT_PHONE}</a>}
            <span>Brisbane, QLD · Delivering Australia-wide</span>
          </address>
          <ul className="footer-social">
            {SOCIAL_LINKS.map((s) => <li key={s.id}><a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={`Ivy & Bough on ${s.name}`}><img src={`/social/${s.id}.svg`} alt="" width={20} height={20} /></a></li>)}
          </ul>
        </div>
        <nav aria-label="Shop">
          <Link href="/#collections">Shop the collection</Link>
          <Link href="/shop">Shop everything</Link>
          <Link href="/#home">Around the home</Link>
        </nav>
        <nav aria-label="About">
          <Link href="/about">About</Link>
          <Link href="/the-christmas-edit">The Christmas Edit</Link>
          <Link href="/contact">Contact</Link>
        </nav>
        <nav aria-label="Guides">
          <Link href="/the-christmas-edit/christmas-tree-guide">Christmas Tree Guide</Link>
          <Link href="/the-christmas-edit/christmas-lights-guide">Christmas Lights Guide</Link>
          <Link href="/the-christmas-edit/christmas-decorating-guide">Decorating Guide</Link>
          <Link href="/the-christmas-edit/christmas-decorations-care-and-storage">Care &amp; Storage</Link>
          <Link href="/christmas-calculator">Tree &amp; Lights Calculator</Link>
        </nav>
        <nav aria-label="Help">
          <Link href="/delivery">Delivery</Link>
          <Link href="/returns">Returns</Link>
          <Link href="/faq">FAQs</Link>
        </nav>
      </div>
      <div className="footer-bottom">
        <div>© 2026 Aurella Group Pty Ltd trading as Ivy &amp; Bough · ABN 70 649 742 423<br />All prices are in AUD and include GST.</div>
        <div className="footer-pay"><span>Secure checkout</span><PaymentMarks tone="quiet" /></div>
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
    </>
  );
}
