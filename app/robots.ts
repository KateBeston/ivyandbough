import type { MetadataRoute } from "next";
import { SITE, SITE_LIVE } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  if (!SITE_LIVE) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/account", "/api/", "/basket", "/order/", "/preview/", "/search", "/subscribe/"] }, sitemap: `${SITE}/sitemap.xml`, host: SITE };
}
