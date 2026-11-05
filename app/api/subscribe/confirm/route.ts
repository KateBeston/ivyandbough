import { NextResponse } from "next/server";
import { admin } from "@/lib/server";
import { issueWelcome } from "@/lib/promotions";
import { validToken } from "@/lib/subscribe";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("e") ?? "").toLowerCase();
  const db = admin();
  const back = new URL("/subscribe/confirm", request.url);
  if (!db || !validToken(email, String(form.get("t") ?? ""))) return NextResponse.redirect(`${back}?status=invalid`, 303);
  const { data: confirmed } = await db.from("subscribers").update({ confirmed_at: new Date().toISOString() }).eq("email", email).is("confirmed_at", null).select("id");
  await db.from("message_consents").insert({ channel: "Email", address: email, granted: true, purpose: "Marketing", source: "Email confirmation link" });
  const offered = confirmed?.length ? await issueWelcome(email, "Newsletter sign-up").catch(() => false) : false;
  return NextResponse.redirect(`${back}?status=${offered ? "offer" : "done"}`, 303);
}
