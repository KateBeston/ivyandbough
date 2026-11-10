import { getCategories, getProducts, getThemes } from "@/lib/catalogue";
import { SITE } from "@/lib/seo";

export const revalidate = 3600;

// A plain-English summary of the shop for AI assistants and search tools (the llms.txt convention).
export async function GET() {
  const [products, categories, themes] = await Promise.all([getProducts(), getCategories(), getThemes()]);
  const stocked = categories.filter((c) => products.some((p) => p.category_id === c.id || p.extra_category_ids?.includes(c.id)));
  const price = (cents: number | null) => (cents === null ? "" : ` – $${(cents / 100).toFixed(2)}`);
  const text = `# Ivy & Bough

> Ivy & Bough is an Australian online Christmas shop, open all year, based in Brisbane, Queensland. It sells elegant, giftable Christmas decorations, home fragrance and gifts for the table, the tree and the front door, delivered Australia-wide.

- Delivery: Australia-wide by Australia Post. See ${SITE}/delivery for rates, free delivery threshold and Christmas last order dates.
- Returns: change-of-mind returns within 14 days of delivery; faulty items under the Australian Consumer Law. See ${SITE}/returns.
- Payment: card, Apple Pay, Google Pay, Afterpay, Zip and Klarna.
- Contact: hello@ivyandbough.com or ${SITE}/contact
- Operated by Aurella Group Pty Ltd (ABN 70 649 742 423).

## Shop

- [Shop everything](${SITE}/shop)
- [New arrivals](${SITE}/shop/new-arrivals)
- [Gifts under $25](${SITE}/shop/gifts-under-25)
- [Gifts under $50](${SITE}/shop/gifts-under-50)
${stocked.map((c) => `- [${c.name}](${SITE}/shop/${c.slug})`).join("\n")}

## Collections

${themes.map((t) => `- [${t.name}](${SITE}/collections/${t.slug})${t.line ? `: ${t.line}` : ""}`).join("\n")}

## Products

${products.map((p) => `- [${p.name}](${SITE}/products/${p.slug})${price(p.price_from_cents ?? p.price_cents)}${p.price_from_cents ? " and up" : ""}${p.short_description ? `: ${p.short_description.replace(/\s+/g, " ").trim()}` : ""}`).join("\n")}

## Guides

- [The Christmas Edit](${SITE}/the-christmas-edit): decorating ideas, styling guides and table inspiration.
- [Frequently asked questions](${SITE}/faq)
- [About Ivy & Bough](${SITE}/about)
`;
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
