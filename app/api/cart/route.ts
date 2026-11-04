import { NextResponse } from "next/server";
import { admin, userFrom } from "@/lib/server";

export async function POST(request: Request) {
  const db = admin();
  if (!db) return new NextResponse(null, { status: 204 });
  const body = await request.json().catch(() => null);
  const sessionId = String(body?.sessionId ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return NextResponse.json({ ok: false }, { status: 400 });
  const lines = Array.isArray(body?.lines) ? (body.lines as { id: string; quantity: number }[]).slice(0, 50) : [];
  const user = await userFrom(request);

  await db.from("cart_items").delete().eq("session_id", sessionId).eq("status", "In cart");
  if (user) await db.from("cart_items").delete().eq("auth_user_id", user.id).eq("status", "In cart");
  if (lines.length) {
    await db.from("cart_items").insert(lines.map((l) => ({ product_id: String(l.id), quantity: Math.min(20, Math.max(1, Math.round(Number(l.quantity)) || 1)), session_id: sessionId, auth_user_id: user?.id ?? null, customer_email: user?.email ?? "" })));
  }
  return NextResponse.json({ ok: true });
}
