import { NextResponse } from "next/server";
import { sendMessage } from "@/lib/comms";
import { allowed } from "@/lib/limits";
import { admin, userFrom } from "@/lib/server";

// Security emails for changes made in the customer's account. The wording is fixed here, never taken from the request.
const EVENTS: Record<string, string> = {
  password: "Your password was changed.",
  email: "A change of email address was requested. Check both inboxes for a confirmation link.",
  details: "Your name or phone number was updated.",
  "address-added": "A delivery address was added.",
  "address-updated": "A delivery address was changed.",
  "address-removed": "A delivery address was removed.",
};

export async function POST(request: Request) {
  const user = await userFrom(request);
  if (!user?.email) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const summary = EVENTS[String(body?.event ?? "")];
  if (!summary) return NextResponse.json({ error: "Unknown change." }, { status: 400 });
  if (!(await allowed(request, "account-notify", 10, 3600))) return NextResponse.json({ ok: true });
  const db = admin();
  const { data: me } = db ? await db.from("customers").select("name").eq("auth_user_id", user.id).maybeSingle() : { data: null };
  const first = (me?.name ?? String(user.user_metadata?.full_name ?? "")).split(" ")[0] || "there";
  const when = new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short", timeZone: "Australia/Brisbane" }).format(new Date());
  await sendMessage({ slug: "account-updated", to: user.email, data: { first_name: first, change_summary: summary, changed_at: `${when} (Brisbane time)` } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
