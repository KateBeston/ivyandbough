import Link from "next/link";

export function Nav({ solid = false }: { solid?: boolean }) {
  return (
    <div className={solid ? "nav-solid" : "nav-light"}>
      <header className="nav">
        <nav aria-label="Main" className="nav-group">
          <Link href="/#themes">Themes</Link>
          <Link href="/#home">The Home</Link>
          <Link href="/#edit">The Edit</Link>
        </nav>
        <Link href="/" className="logo">Ivy &amp; Bough</Link>
        <div className="nav-group end">
          <a href="#search">Search</a>
          <a href="#basket">Basket (0)</a>
        </div>
      </header>
    </div>
  );
}
