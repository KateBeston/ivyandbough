// One switch for launch: set NEXT_PUBLIC_SITE_LIVE to true and search engines are welcomed in.
export const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ivyandbough.com";
export const SITE_LIVE = process.env.NEXT_PUBLIC_SITE_LIVE === "true";
export const SOCIALS = ["https://www.facebook.com/profile.php?id=61596474291450", "https://www.instagram.com/ivyandbough/"];
export const absolute = (path: string) => (path.startsWith("http") ? path : `${SITE}${path}`);

export const breadcrumbs = (items: { name: string; path: string }[]) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: `${SITE}${item.path}` })) });
