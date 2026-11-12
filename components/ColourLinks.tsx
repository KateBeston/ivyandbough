import Link from "next/link";
import { COLOUR_PAGES, colourPath } from "@/lib/colour-pages";

// Links to the colour landing pages for a category (or the whole shop when no category is given).
export function ColourLinks({ category = null, title = "Shop by colour" }: { category?: string | null; title?: string }) {
  const pages = COLOUR_PAGES.filter((p) => p.category_slug === category);
  if (!pages.length) return null;
  return (
    <nav className="colour-more" aria-label={title}>
      <h2>{title}</h2>
      <div className="pill-row">{pages.map((p) => <Link key={colourPath(p)} href={colourPath(p)}>{p.h1}</Link>)}</div>
    </nav>
  );
}
