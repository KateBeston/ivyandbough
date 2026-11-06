import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { requireAdmin } from "@/lib/comms";
import { admin, stripe } from "@/lib/server";

export const maxDuration = 60;

// Fills in Stripe's fee on any paid order that doesn't have it yet.
export async function POST(request: Request) {
  if (!(await requireAdmin(request))) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  const db = admin();
  const client = stripe();
  if (!db || !client) return NextResponse.json({ updated: 0 });
  const { data: orders } = await db.from("orders").select("id,payment_charge_id").is("stripe_fee", null).not("payment_charge_id", "is", null).limit(50);
  let updated = 0;
  for (const o of orders ?? []) {
    const charge = await client.charges.retrieve(o.payment_charge_id as string, { expand: ["balance_transaction"] }).catch(() => null);
    const balance = charge?.balance_transaction as Stripe.BalanceTransaction | null | undefined;
    if (!balance || typeof balance === "string") continue;
    await db.from("orders").update({ stripe_fee: balance.fee / 100 }).eq("id", o.id);
    updated++;
  }
  return NextResponse.json({ updated });
}
