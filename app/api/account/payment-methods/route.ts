import { NextResponse } from "next/server";
import { allowed } from "@/lib/limits";
import { cardPortal, stripeCustomer } from "@/lib/payments";
import { stripe, userFrom } from "@/lib/server";

export async function POST(request: Request) {
  const client = stripe();
  const user = await userFrom(request);
  if (!client || !user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  if (!(await allowed(request, "payment-methods", 20, 600))) return NextResponse.json({ error: "Please try again in a few minutes." }, { status: 429 });
  const customer = await stripeCustomer(client, user);
  if (!customer) return NextResponse.json({ error: "Please confirm your email address first." }, { status: 403 });
  const session = await client.billingPortal.sessions.create({ customer, configuration: await cardPortal(client), return_url: `${new URL(request.url).origin}/account?tab=payment` });
  return NextResponse.json({ url: session.url });
}
