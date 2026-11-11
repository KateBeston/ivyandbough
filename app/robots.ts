import type { MetadataRoute } from "next";
import { SITE, SITE_LIVE } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  if (!SITE_LIVE) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: [
    // Everyone welcome, including search engines and AI assistants, apart from private pages.
    { userAgent: "*", allow: "/", disallow: ["/account$", "/account/", "/api/", "/basket", "/order/", "/preview/", "/search", "/subscribe/"] },
    // Aggressive scrapers that bring no visitors.
    { userAgent: ["Bytespider", "MJ12bot", "DotBot", "BLEXBot", "DataForSeoBot", "PetalBot", "SeekportBot", "MegaIndex", "serpstatbot", "Barkrowler", "ImagesiftBot"], disallow: "/" },
  ], sitemap: `${SITE}/sitemap.xml`, host: SITE };
}
