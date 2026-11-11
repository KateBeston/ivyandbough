import sitemap from "@/app/sitemap";
import { admin } from "@/lib/server";

// IndexNow tells Bing (and so Copilot and ChatGPT search) straight away when the shop changes, instead of waiting for a crawl.
// The key is public by design: it is also served at /d3d41c418c5e4253806d759873f364db.txt so Bing can confirm the site is ours.
export const INDEXNOW_KEY = "d3d41c418c5e4253806d759873f364db";
const EVERY_MINUTES = 30;

export async function pingIndexNow() {
  const db = admin();
  if (!db) return;
  const { data } = await db.from("site_state").select("updated_at").eq("key", "indexnow_last").maybeSingle();
  if (data?.updated_at && Date.now() - new Date(data.updated_at).getTime() < EVERY_MINUTES * 60_000) return;
  await db.from("site_state").upsert({ key: "indexnow_last", value: "sent", updated_at: new Date().toISOString() });
  const urls = (await sitemap()).map((e) => e.url).slice(0, 10000);
  await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: "ivyandbough.com", key: INDEXNOW_KEY, keyLocation: `https://ivyandbough.com/${INDEXNOW_KEY}.txt`, urlList: urls }),
    signal: AbortSignal.timeout(15000),
  }).catch(() => null);
}
