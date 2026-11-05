import { NextResponse } from "next/server";
import { LEGAL_VERSION } from "@/lib/legal";
import { allowed } from "@/lib/limits";
import { admin } from "@/lib/server";
import { validSetup } from "@/lib/subscribe";

// The short-lived link from confirming the address proves the inbox is theirs.
export async function POST(request: Request) {
  if (!(await allowed(request, "welcome-account", 10, 600))) return NextResponse.json({ error: "Please try again in a few minutes." }, { status: 429 });
  const body = await request.json().catch(() => null);
  const email = String(body?.e ?? "").toLowerCase();
  const password = String(body?.password ?? "");
  const db = admin();
  if (!db || !validSetup(email, String(body?.s ?? ""))) return NextResponse.json({ error: "This link has expired. You can still create an account from the sign in page." }, { status: 400 });
  if (password.length < 8 || password.length > 72 || body?.terms !== true) return NextResponse.json({ error: "Please use a password of at least 8 characters." }, { status: 400 });
  const { error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { terms_version: LEGAL_VERSION } });
  if (error?.code === "email_exists") return NextResponse.json({ error: "You already have an account with this email. Please sign in instead." }, { status: 409 });
  if (error) return NextResponse.json({ error: error.code === "weak_password" ? "Please choose a stronger password." : "That didn't go through. Please try again." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
