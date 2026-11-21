import { timingSafeEqual } from "crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { admin } from "@/lib/server";
import { publishPost, removePost, resolvePinterestBoards } from "@/lib/social";

// Instagram carousels are made slide by slide, so a run with several posts needs longer than a minute.
export const maxDuration = 300;

function authorised(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return Boolean(secret) && given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  if (!authorised(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const db = admin();
  if (!db) return NextResponse.json({ ok: false }, { status: 503 });
  // A sale that started or finished since the last run (every 15 minutes) needs the menu, banners and category strips refreshed.
  const since = new Date(Date.now() - 16 * 60000).toISOString(), now = new Date().toISOString();
  const { data: turned } = await db.from("campaign_codes").select("id").eq("is_active", true).or(`and(starts_at.gte.${since},starts_at.lte.${now}),and(ends_at.gte.${since},ends_at.lte.${now})`).limit(1);
  if (turned?.length) revalidatePath("/", "layout");
  // A run that died part-way is shown as failed. Retrying skips what already went out.
  await db.from("social_posts").update({ status: "Failed", last_error: "Publishing was interrupted." }).eq("status", "Publishing").lt("updated_at", new Date(Date.now() - 600000).toISOString());
  await resolvePinterestBoards(db).catch((e) => console.warn("Pinterest boards", e));
  const { data } = await db.from("social_posts").select("id").eq("status", "Scheduled").lte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(5);
  const { data: removals } = await db.from("social_posts").select("id").eq("status", "Remove requested").limit(10);
  for (const post of removals ?? []) await removePost(db, post.id);
  const results = [];
  for (const post of data ?? []) results.push(await publishPost(db, post.id));
  return NextResponse.json({ due: results.length, published: results.filter((r) => r.ok).length });
}
