import Link from "next/link";

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
          <Link href="/contact">Contact</Link>
        </nav>
        <nav aria-label="Help">
          <Link href="/delivery">Delivery</Link>
          <Link href="/returns">Returns</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </div>
      <div className="footer-bottom">
        <div>© 2026 Ivy &amp; Bough</div>
        <div>Visa · Mastercard · American Express · Apple Pay · Google Pay</div>
      </div>
    </footer>
  );
}
