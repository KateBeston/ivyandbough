// One switch for launch: set NEXT_PUBLIC_SITE_LIVE to true and search engines are welcomed in.
export const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ivyandbough.com";
export const SITE_LIVE = process.env.NEXT_PUBLIC_SITE_LIVE === "true";
export const SOCIAL_LINKS = [
  { id: "facebook", name: "Facebook", url: "https://www.facebook.com/profile.php?id=61596474291450" },
  { id: "instagram", name: "Instagram", url: "https://www.instagram.com/ivyandbough/" },
  { id: "pinterest", name: "Pinterest", url: "https://www.pinterest.com/ivyandbough/" },
];
export const SOCIALS = SOCIAL_LINKS.map((s) => s.url);
export const absolute = (path: string) => (path.startsWith("http") ? path : `${SITE}${path}`);

export const breadcrumbs = (items: { name: string; path: string }[]) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: `${SITE}${item.path}` })) });

// Delivery and returns, in the form Google and AI shopping tools read alongside each product's price.
// Delivery uses the flat Australia-wide rate and free-delivery threshold from the portal; it's left out while live Australia Post pricing is on,
// because the price then depends on the address. Returns follow the Returns Policy: 14 days for change of mind, the customer pays return postage.
export async function offerExtras(db: { from: (t: string) => any }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const [{ data: zone }, { data: settings }] = await Promise.all([
    db.from("delivery_zones").select("rate").eq("is_default", true).maybeSingle(),
    db.from("delivery_settings").select("free_over,live_postage").limit(1).maybeSingle(),
  ]);
  const returns = { "@type": "MerchantReturnPolicy", applicableCountry: "AU", returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow", merchantReturnDays: 14, returnMethod: "https://schema.org/ReturnByMail", returnFees: "https://schema.org/ReturnShippingFees", merchantReturnLink: `${SITE}/returns` };
  const rate = Number(zone?.rate);
  if (settings?.live_postage || !(rate > 0)) return { returns, shipping: null as null | ((cents: number) => object) };
  const freeOver = Number(settings?.free_over) || 0;
  const shipping = (cents: number) => ({
    "@type": "OfferShippingDetails",
    shippingRate: { "@type": "MonetaryAmount", value: (freeOver && cents / 100 >= freeOver ? 0 : rate).toFixed(2), currency: "AUD" },
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "AU" },
    deliveryTime: { "@type": "ShippingDeliveryTime", handlingTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 2, unitCode: "DAY" }, transitTime: { "@type": "QuantitativeValue", minValue: 2, maxValue: 8, unitCode: "DAY" } },
  });
  return { returns, shipping };
}
