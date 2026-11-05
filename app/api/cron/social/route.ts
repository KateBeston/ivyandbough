import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { admin } from "@/lib/server";
import { publishPost } from "@/lib/social";

export const maxDuration = 60;

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
  // A run that died part-way is shown as failed. Retrying skips what already went out.
  await db.from("social_posts").update({ status: "Failed", last_error: "Publishing was interrupted." }).eq("status", "Publishing").lt("updated_at", new Date(Date.now() - 600000).toISOString());
  const { data } = await db.from("social_posts").select("id").eq("status", "Scheduled").lte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(5);
  const results = [];
  for (const post of data ?? []) results.push(await publishPost(db, post.id));
  return NextResponse.json({ due: results.length, published: results.filter((r) => r.ok).length });
}
