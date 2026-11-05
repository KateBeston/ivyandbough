import { NextResponse } from "next/server";
import { allowed } from "@/lib/limits";
import { offerText } from "@/lib/pricing";
import { codeTerms, issueWelcome, unusedCode } from "@/lib/promotions";
import { userFrom } from "@/lib/server";

// Only a confirmed address earns an offer. Repeat calls return the same code.
export async function POST(request: Request) {
  const user = await userFrom(request);
  if (!user?.email || !user.email_confirmed_at) return NextResponse.json({ code: null });
  if (!(await allowed(request, "welcome", 30, 600))) return NextResponse.json({ code: null }, { status: 429 });
  await issueWelcome(user.email, "Account sign-up");
  const code = await unusedCode(user.email);
  return NextResponse.json(code ? { code: code.code, offer: offerText(code), terms: codeTerms(code) } : { code: null });
}
