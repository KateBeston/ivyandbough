import { googleCategory } from "@/lib/google-category";
import { getProducts, type Product } from "@/lib/catalogue";
import { absolute, SITE } from "@/lib/seo";
import { supabase } from "@/lib/supabase";

export const revalidate = 3600;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const plain = (s: string) => s.replace(/\s+/g, " ").trim();
const money = (cents: number) => `${(cents / 100).toFixed(2)} AUD`;
// Must match the product page's structured data, or Google treats the listing as misleading.
const stock = (a: string) => (a === "Sold out" ? "out_of_stock" : a === "Coming soon" ? "preorder" : a === "Pre-order" ? "backorder" : "in_stock");

// The product feed for Google Merchant Center (free listings in Google Shopping and AI shopping answers).
// One item per thing a customer can buy: each colour in a family is its own item, grouped by the family.
export async function GET() {
  const listings = await getProducts();
  // Delivery class per SKU, so Facebook and Google can tell free-delivery items from bulky ones.
  const { data: cls } = await supabase.from("products").select("sku,weight_g,shipping_classes(name,free_delivery_applies,surcharge),themes!products_theme_id_fkey(name)");
  const shipBy = new Map((cls ?? []).map((r: any) => [r.sku, r.shipping_classes as { name: string; free_delivery_applies: boolean; surcharge: number } | null]));
  // Courier pieces carry their own delivery price in the feed (base rate plus the class surcharge), matching checkout.
  const { data: zone } = await supabase.from("delivery_zones").select("rate").eq("is_default", true).maybeSingle();
  const baseRate = Number(zone?.rate ?? 0);
  // Packed weight per SKU. Google needs it to work out delivery cost from the account's weight-based rates.
  // Collection (theme) per SKU, so Meta and Google can build product sets by collection.
  const collectionBy = new Map((cls ?? []).map((r: any) => [r.sku, (r.themes?.name as string | undefined) ?? ""]));
  const weightBy = new Map((cls ?? []).map((r: any) => [r.sku, Number(r.weight_g) || 0]));
  const items = listings.flatMap((l: Product) => {
    const versions = l.variants?.length ? l.variants : [l];
    return versions.filter((v) => v.price_cents !== null && v.product_images.length).map((v) => {
      const link = absolute(`/products/${l.slug}${l.variants?.length ? `?colour=${encodeURIComponent(v.sku)}` : ""}`);
      const title = plain(`${l.name}${l.variants?.length && v.version_name ? ` – ${v.version_name}` : ""}`).slice(0, 150);
      const onSale = v.was_cents && v.was_cents > (v.price_cents ?? 0);
      const fields: [string, string | undefined][] = [
        ["g:id", v.sku],
        ["g:title", title],
        ["g:description", plain(l.description || l.short_description || l.name).slice(0, 5000)],
        ["g:link", link],
        ["g:image_link", absolute(v.product_images[0].url)],
        ...v.product_images.slice(1, 10).map((i) => ["g:additional_image_link", absolute(i.url)] as [string, string]),
        ["g:availability", stock(v.availability)],
        ["g:availability_date", ["preorder", "backorder"].includes(stock(v.availability)) ? new Date(Date.now() + Math.max(7, Number(v.dispatch_days) || 21) * 864e5).toISOString().slice(0, 10) + "T00:00+1000" : undefined],
        ["g:price", money(onSale ? v.was_cents! : v.price_cents!)],
        ["g:sale_price", onSale ? money(v.price_cents!) : undefined],
        // Only a real maker's brand: Google treats a store name on other makers' products as misleading.
        ["g:brand", v.brand || l.brand || undefined],
        ["g:condition", "new"],
        ["g:identifier_exists", "no"],
        ["g:google_product_category", googleCategory(l.categories?.name)],
        ["g:product_type", l.categories?.name],
        ["g:item_group_id", l.variants?.length ? l.slug : undefined],
        ["g:color", l.variants?.length ? (/colou?r/i.test(l.option_label || "") ? v.version_name || undefined : v.colour || v.colours || undefined) : (v.colour || v.colours || "").slice(0, 100) || undefined],
        ["g:size", l.variants?.length && /size/i.test(l.option_label || "") ? v.version_name || undefined : undefined],
        ["g:material", v.materials || undefined],
        // The real dispatch time in business days, so Google shows the same delivery time as the product page.
        ["g:min_handling_time", v.dispatch_days_min != null ? String(v.dispatch_days_min) : v.dispatch_days != null ? String(v.dispatch_days) : undefined],
        ["g:max_handling_time", v.dispatch_days != null ? String(v.dispatch_days) : undefined],
        ["g:shipping_weight", weightBy.get(v.sku) ? `${weightBy.get(v.sku)} g` : undefined],
        ["g:shipping_label", shipBy.get(v.sku)?.name || "Standard"],
        ["g:custom_label_0", (shipBy.get(v.sku)?.free_delivery_applies ?? true) ? "Free delivery over $150" : "No free delivery"],
        ["g:custom_label_1", collectionBy.get(v.sku) || l.themes?.name || l.product_themes?.find((t) => t.themes)?.themes?.name || undefined],
        // Every collection the product appears in, so ad product sets can filter with "contains".
        ["g:custom_label_2", [...new Set([collectionBy.get(v.sku), l.themes?.name, ...(l.product_themes ?? []).map((t) => t.themes?.name)].filter(Boolean))].join(", ") || undefined],
      ];
      const sc = shipBy.get(v.sku);
      const courier = sc && /courier|extra large/i.test(sc.name) ? (baseRate + Number(sc.surcharge || 0)).toFixed(2) : null;
      const ship = courier ? `\n      <g:shipping><g:country>AU</g:country><g:service>Courier</g:service><g:price>${courier} AUD</g:price></g:shipping>` : "";
      return `    <item>\n${fields.filter(([, val]) => val).map(([k, val]) => `      <${k}>${esc(String(val))}</${k}>`).join("\n")}${ship}\n    </item>`;
    });
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n  <channel>\n    <title>Ivy &amp; Bough</title>\n    <link>${SITE}</link>\n    <description>Christmas decorations and gifts from Ivy &amp; Bough, delivered across Australia.</description>\n${items.join("\n")}\n  </channel>\n</rss>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
