import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/comms";
import { admin } from "@/lib/server";
import { connectUrl, pinterestBoards, publishPost, socialStatus } from "@/lib/social";

const refused = () => NextResponse.json({ error: "Not allowed." }, { status: 401 });

// Tokens never leave the server, so they are left out of this list.
export async function GET(request: Request) {
  if (!(await requireAdmin(request))) return refused();
  const db = admin();
  if (!db) return NextResponse.json({ error: "SUPABASE_SECRET_KEY is not set." }, { status: 503 });
  const { data } = await db.from("social_tokens").select("id,platform,account_kind,display_name,connected_at,expires_at,is_active,last_error").eq("is_active", true).order("account_kind");
  return NextResponse.json({ ...socialStatus(), accounts: data ?? [] });
}

export async function POST(request: Request) {
  if (!(await requireAdmin(request))) return refused();
  const db = admin();
  if (!db) return NextResponse.json({ error: "SUPABASE_SECRET_KEY is not set." }, { status: 503 });
  const body = await request.json().catch(() => null);
  try {
    if (body?.action === "connect") {
      const status = socialStatus();
      if (body.platform !== "meta" && body.platform !== "pinterest") return NextResponse.json({ error: "Unknown platform." }, { status: 400 });
      if (!status[body.platform as "meta" | "pinterest"]) return NextResponse.json({ error: "The app keys for this platform haven't been added yet." }, { status: 400 });
      return NextResponse.json({ url: connectUrl(body.platform) });
    }
    if (body?.action === "disconnect") {
      await db.from("social_tokens").delete().eq("id", String(body.id));
      return NextResponse.json({ ok: true });
    }
    if (body?.action === "boards") return NextResponse.json({ boards: await pinterestBoards(db) });
    if (body?.action === "publish") return NextResponse.json(await publishPost(db, String(body.postId)));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "That didn't go through." }, { status: 502 });
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
