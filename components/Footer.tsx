import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <img src="/brand/stacked-cream.svg" alt="Ivy &amp; Bough" className="footer-logo" width={150} height={88} />
        <nav aria-label="Shop">
          <Link href="/#themes">Themes</Link>
          <Link href="/#home">Around the home</Link>
          <Link href="/#edit">The Christmas Edit</Link>
        </nav>
        <nav aria-label="Help">
          <Link href="/#delivery">Delivery dates</Link>
          <a href="#returns">Returns</a>
          <a href="#contact">Contact</a>
        </nav>
      </div>
      <div className="footer-bottom">
        <div>© 2026 Ivy &amp; Bough</div>
        <div>Visa · Mastercard · American Express · Apple Pay · Google Pay</div>
      </div>
    </footer>
  );
}
