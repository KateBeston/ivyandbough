import { NextResponse } from "next/server";
import { allowed } from "@/lib/limits";
import { admin } from "@/lib/server";
import { validStop } from "@/lib/subscribe";

export async function POST(request: Request) {
  if (!(await allowed(request, "unsubscribe-confirm", 20, 600))) return NextResponse.redirect(new URL("/unsubscribe?status=invalid", request.url), 303);
  const form = await request.formData();
  const email = String(form.get("e") ?? "").toLowerCase();
  const db = admin();
  const back = new URL("/unsubscribe", request.url);
  if (!db || !validStop(email, String(form.get("t") ?? ""))) return NextResponse.redirect(`${back}?status=invalid`, 303);
  const at = new Date().toISOString();
  const { error } = await db.from("message_suppressions").upsert({ channel: "Email", address: email, reason: "Unsubscribed", scope: "Marketing", source: "Unsubscribe page", suppressed_at: at, released_at: null }, { onConflict: "channel,address,reason" });
  if (error) return NextResponse.redirect(`${back}?status=invalid`, 303);
  await db.from("message_consents").insert({ channel: "Email", address: email, granted: false, purpose: "Marketing", source: "Unsubscribe page" });
  return NextResponse.redirect(`${back}?status=done`, 303);
}
