// One switch for launch: set NEXT_PUBLIC_SITE_LIVE to true and search engines are welcomed in.
export const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ivyandbough.com";
export const SITE_LIVE = process.env.NEXT_PUBLIC_SITE_LIVE === "true";
export const SOCIAL_LINKS = [
  { id: "facebook", name: "Facebook", url: "https://www.facebook.com/profile.php?id=61596474291450" },
  { id: "instagram", name: "Instagram", url: "https://www.instagram.com/ivyandbough/" },
  { id: "pinterest", name: "Pinterest", url: "https://www.pinterest.com/0bm0gcefyzar5u1c31v8h9mmgfr05o/" },
];
export const SOCIALS = SOCIAL_LINKS.map((s) => s.url);
export const absolute = (path: string) => (path.startsWith("http") ? path : `${SITE}${path}`);

export const breadcrumbs = (items: { name: string; path: string }[]) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: `${SITE}${item.path}` })) });
