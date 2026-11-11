import { NextResponse, type NextRequest } from "next/server";

// Turns away scraping scripts and aggressive bots that ignore robots.txt, before they reach a page.
// Search engines (Google, Bing), AI assistants (ChatGPT, Claude, Perplexity, Gemini), social previews
// and SEO tools are not on this list, so they keep full access. Webhooks, feeds and APIs aren't checked here.
const BLOCKED = /python-requests|python-urllib|aiohttp|httpx|scrapy|go-http-client|java\/|libwww-perl|okhttp|node-fetch|axios\/|wget|bytespider|mj12bot|dotbot|blexbot|dataforseobot|petalbot|seekportbot|megaindex|serpstatbot|zoominfobot|barkrowler|imagesiftbot|amazonbot\/0\.1-crawler/i;

export function proxy(request: NextRequest) {
  const agent = request.headers.get("user-agent") ?? "";
  if (!agent.trim() || BLOCKED.test(agent)) return new NextResponse("Forbidden", { status: 403 });
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/|_next/|feeds/|images/|brand/|social/|staging-media/|robots.txt|sitemap.xml|llms.txt|favicon.ico|icon.png|apple-icon.png|BingSiteAuth.xml|d3d41c418c5e4253806d759873f364db.txt|.well-known/).*)"],
};
