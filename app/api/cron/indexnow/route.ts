import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { admin } from "@/lib/server";
import { SITE } from "@/lib/seo";
import { productPaths } from "@/lib/product-name";

export const maxDuration = 60;

// IndexNow tells Bing (and through it ChatGPT search, plus Yandex and others) about new or changed pages straight away.
// The key is public by design: it's served at /<key>.txt so search engines can confirm the site is ours.
const KEY = "a5430288ca1f9658e38bdc8d0d455393";
const HOST = new URL(SITE).host;

function authorised(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return Boolean(secret) && given.length === expected.length && timingSafeEqual(given, expected);
}

async function submit(urls: string[]) {
  let sent = 0;
  for (let i = 0; i < urls.length; i += 10000) {
    const batch = urls.slice(i, i + 10000);
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: batch }),
    });
    if (!res.ok && res.status !== 202) throw new Error(`IndexNow said ${res.status}`);
    sent += batch.length;
  }
  return sent;
}

// Hourly: pages changed in the last 70 minutes. With ?all=1: every page in the sitemap (used once at setup).
export async function GET(request: Request) {
  if (!authorised(request)) return NextResponse.json({ ok: false }, { status: 401 });
  let urls: string[] = [];
  if (new URL(request.url).searchParams.get("all") === "1") {
    const xml = await (await fetch(`${SITE}/sitemap.xml`, { cache: "no-store" })).text();
    urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  } else {
    const db = admin();
    if (!db) return NextResponse.json({ ok: false }, { status: 503 });
    const since = new Date(Date.now() - 70 * 60 * 1000).toISOString();
    const [listings, products, posts] = await Promise.all([
      db.from("listings").select("slug").eq("status", "active").gte("updated_at", since),
      db.from("products").select("id").eq("status", "active").gte("updated_at", since),
      db.from("posts").select("slug,status").gte("updated_at", since),
    ]);
    const paths = await productPaths(db as never, (products.data ?? []).map((r) => r.id));
    urls = [
      ...(listings.data ?? []).map((r) => `${SITE}/products/${r.slug}`),
      ...[...paths.values()].map((p) => `${SITE}${p.startsWith("/") ? p : `/products/${p}`}`),
      ...(posts.data ?? []).filter((r) => r.status === "published").map((r) => `${SITE}/the-christmas-edit/${r.slug}`),
    ];
  }
  if (!urls.length) return NextResponse.json({ ok: true, sent: 0 });
  try {
    return NextResponse.json({ ok: true, sent: await submit([...new Set(urls)]) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}
